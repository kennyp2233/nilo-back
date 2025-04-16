// src/trips/services/trip-creator.service.ts
import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeocodingService } from 'src/geocoding/geocoding.service';
import { OrsService } from 'src/ors/ors.service';
import { TripsGateway } from 'src/websockets/trips.gateway';
import { CreateTripDto } from '../dto/create-trip.dto';
import { TripStatus, TripType, UserRole } from '@prisma/client';
import { TripUpdaterService } from './trip-updater.service';

@Injectable()
export class TripCreatorService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly geocodingService: GeocodingService,
        private readonly orsService: OrsService,
        private readonly tripsGateway: TripsGateway,
        private readonly tripUpdaterService: TripUpdaterService,
    ) { }

    async createTrip(userId: string, createTripDto: CreateTripDto) {
        // Get user to check if it's a passenger
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                passenger: true,
            },
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        if (user.role !== UserRole.PASSENGER) {
            throw new BadRequestException('Solo los pasajeros pueden solicitar viajes');
        }

        // Validate locations
        const { startLocation, endLocation, type, scheduledAt, availableSeats, pricePerSeat } = createTripDto;

        // Calculate route using ORS service
        const startCoords: [number, number] = [startLocation.latitude, startLocation.longitude];
        const endCoords: [number, number] = [endLocation.latitude, endLocation.longitude];

        // Get route data
        const routeData = await this.getRouteData(startCoords, endCoords);

        // Extract route details
        const { distance, duration, routePolyline } = this.extractRouteDetails(routeData);

        // Calculate fare
        const { estimatedFare, fare } = await this.calculateFare(
            type,
            distance,
            duration,
            pricePerSeat,
            availableSeats
        );

        // Create the trip
        try {
            const trip = await this.createTripTransaction(
                userId,
                type,
                startLocation,
                endLocation,
                distance,
                duration,
                estimatedFare,
                fare,
                routePolyline,
                scheduledAt,
                availableSeats,
                pricePerSeat,
            );

            // Emit trip created event via WebSocket
            this.tripsGateway.emitTripUpdate(trip.id, trip.status, {
                trip: {
                    id: trip.id,
                    type: trip.type,
                    status: trip.status,
                    distance: trip.distance,
                    duration: trip.duration,
                    estimatedFare: trip.estimatedFare,
                    startLocation: trip.startLocation,
                    endLocation: trip.endLocation,
                    createdAt: trip.createdAt,
                }
            });

            // Set timer for automatic cancellation if no driver accepts
            this.setDriverAssignmentTimeout(trip, userId);

            return trip;
        } catch (error) {
            throw new InternalServerErrorException(`Error al crear el viaje: ${error.message}`);
        }
    }

    // Obtener los datos de la ruta
    private async getRouteData(startCoords: [number, number], endCoords: [number, number]) {
        try {
            const routeData = await this.orsService.getRoute(startCoords, endCoords);

            // Validar que la estructura de datos sea correcta
            if (!routeData || !routeData.features || routeData.features.length === 0 ||
                !routeData.features[0].properties || !routeData.features[0].properties.summary) {
                console.log(JSON.stringify(routeData));
                throw new Error('No se pudo generar una ruta entre esas ubicaciones');
            }

            return routeData;
        } catch (error) {
            throw new BadRequestException(`Error al calcular la ruta: ${error.message}`);
        }
    }

    // Extraer detalles de la ruta
    private extractRouteDetails(routeData: any) {
        const feature = routeData.features[0];
        const distance = feature.properties.summary.distance / 1000; // Convert to km
        const duration = Math.round(feature.properties.summary.duration / 60); // Convert to minutes
        const routePolyline = JSON.stringify(feature.geometry); // Guardar la geometría como JSON string

        return { distance, duration, routePolyline };
    }

    // Calcular tarifa
    private async calculateFare(type: TripType, distance: number, duration: number, pricePerSeat?: number, availableSeats?: number) {
        let estimatedFare = 0;
        let fare = 0;

        if (type === TripType.ON_DEMAND) {
            // Get applicable tariff
            const tariff = await this.prisma.tariffConfig.findFirst({
                where: {
                    isActive: true,
                    applyTripType: type,
                    vehicleCategory: 'STANDARD', // Default to standard category
                },
            });

            if (!tariff) {
                throw new BadRequestException('No hay tarifas configuradas para este tipo de viaje');
            }

            estimatedFare = this.calculateOnDemandFare(distance, duration, tariff);
            fare = estimatedFare; // Initial fare is the same as estimated fare
        } else if (type === TripType.INTERCITY) {
            // For intercity trips, the fare is set by the driver
            if (!pricePerSeat) {
                throw new BadRequestException('El precio por asiento es requerido para viajes interprovinciales');
            }
            fare = pricePerSeat * (availableSeats || 1); // Total fare is price per seat times available seats
            estimatedFare = fare;
        }

        return { estimatedFare, fare };
    }

    // Calcular tarifa para viajes a demanda
    private calculateOnDemandFare(distance: number, duration: number, tariff: any): number {
        const distanceCost = distance * tariff.pricePerKm;
        const timeCost = duration * tariff.pricePerMinute;
        let fare = tariff.basePrice + distanceCost + timeCost;

        // Ensure minimum fare
        if (fare < tariff.minimumPrice) {
            fare = tariff.minimumPrice;
        }

        // Apply surge pricing if applicable
        if (tariff.surgeMultiplier) {
            fare *= tariff.surgeMultiplier;
        }

        // Add night surcharge if applicable (would need to check current time)
        // For simplicity, not implementing time-based checks here

        return parseFloat(fare.toFixed(2));
    }

    // Crear el viaje en una transacción
    private async createTripTransaction(
        userId: string,
        type: TripType,
        startLocation: any,
        endLocation: any,
        distance: number,
        duration: number,
        estimatedFare: number,
        fare: number,
        routePolyline: string,
        scheduledAt?: string,
        availableSeats?: number,
        pricePerSeat?: number,
    ) {
        return this.prisma.$transaction(async (prisma) => {
            // Create the trip
            const newTrip = await prisma.trip.create({
                data: {
                    type,
                    status: type === TripType.ON_DEMAND ? TripStatus.SEARCHING : TripStatus.SCHEDULED,
                    startLocation: startLocation ? {
                        latitude: startLocation.latitude,
                        longitude: startLocation.longitude,
                        address: startLocation.address,
                    } : null,
                    endLocation: endLocation ? {
                        latitude: endLocation.latitude,
                        longitude: endLocation.longitude,
                        address: endLocation.address,
                    } : null,
                    distance,
                    duration,
                    estimatedFare,
                    fare,
                    routePolyline,
                    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                    // Fields for intercity trips
                    origin: startLocation.displayName || '',
                    destination: endLocation.displayName || '',
                    availableSeats,
                    pricePerSeat,
                },
            });

            // Add the passenger to the trip
            await prisma.tripPassenger.create({
                data: {
                    tripId: newTrip.id,
                    passengerId: userId,
                    fare: type === TripType.ON_DEMAND ? estimatedFare : pricePerSeat,
                    status: newTrip.status,
                    bookedSeats: type === TripType.INTERCITY ? 1 : undefined,
                },
            });

            return newTrip;
        });
    }

    // Configurar timeout para asignación de conductor
    private setDriverAssignmentTimeout(trip: any, userId: string) {
        if (trip.type === TripType.ON_DEMAND) {
            setTimeout(async () => {
                const currentTrip = await this.prisma.trip.findUnique({
                    where: { id: trip.id },
                });

                if (currentTrip && currentTrip.status === TripStatus.SEARCHING) {
                    // No driver accepted the trip within 2 minutes
                    await this.tripUpdaterService.updateTripStatusWithNotification(
                        trip.id,
                        TripStatus.CANCELLED,
                        "No se encontró un conductor disponible",
                        userId
                    );
                }
            }, 120000); // 2 minutes
        }
    }
}