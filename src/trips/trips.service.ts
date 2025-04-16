// src/trips/trips.service.ts
import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { OrsService } from '../ors/ors.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Prisma, TripStatus, TripType, UserRole } from '@prisma/client';
import { TripsGateway } from '../websockets/trips.gateway';

@Injectable()
export class TripsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly geocodingService: GeocodingService,
        private readonly orsService: OrsService,
        @Inject(forwardRef(() => TripsGateway))
        private readonly tripsGateway: TripsGateway,
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

        let routeData;
        try {
            routeData = await this.orsService.getRoute(startCoords, endCoords);

            // Validar que la estructura de datos sea correcta
            if (!routeData || !routeData.features || routeData.features.length === 0 ||
                !routeData.features[0].properties || !routeData.features[0].properties.summary) {
                console.log(JSON.stringify(routeData));
                throw new Error('No se pudo generar una ruta entre esas ubicaciones');
            }
        } catch (error) {
            throw new BadRequestException(`Error al calcular la ruta: ${error.message}`);
        }

        // Extract route details utilizando la estructura correcta
        const feature = routeData.features[0];
        const distance = feature.properties.summary.distance / 1000; // Convert to km
        const duration = Math.round(feature.properties.summary.duration / 60); // Convert to minutes
        const routePolyline = JSON.stringify(feature.geometry); // Guardar la geometría como JSON string

        // Get applicable tariff
        const tariff = await this.prisma.tariffConfig.findFirst({
            where: {
                isActive: true,
                applyTripType: type,
                vehicleCategory: 'STANDARD', // Default to standard category
            },
        });

        if (!tariff && type === TripType.ON_DEMAND) {
            throw new BadRequestException('No hay tarifas configuradas para este tipo de viaje');
        }

        // Calculate estimated fare for on-demand trips
        let estimatedFare = 0;
        let fare = 0;

        if (type === TripType.ON_DEMAND) {
            estimatedFare = this.calculateFare(distance, duration, tariff);
            fare = estimatedFare; // Initial fare is the same as estimated fare
        } else if (type === TripType.INTERCITY) {
            // For intercity trips, the fare is set by the driver
            if (!pricePerSeat) {
                throw new BadRequestException('El precio por asiento es requerido para viajes interprovinciales');
            }
            fare = pricePerSeat * (availableSeats || 1); // Total fare is price per seat times available seats
            estimatedFare = fare;
        }

        // Create the trip
        try {
            const trip = await this.prisma.$transaction(async (prisma) => {
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
                        scheduledAt,
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

            // Set timer for 2 minutes to check if trip is still in SEARCHING state
            if (trip.type === TripType.ON_DEMAND) {
                setTimeout(async () => {
                    const currentTrip = await this.prisma.trip.findUnique({
                        where: { id: trip.id },
                    });

                    if (currentTrip && currentTrip.status === TripStatus.SEARCHING) {
                        // No driver accepted the trip within 2 minutes
                        await this.updateTripStatusWithNotification(
                            trip.id,
                            TripStatus.CANCELLED,
                            "No se encontró un conductor disponible",
                            userId
                        );
                    }
                }, 120000); // 2 minutes
            }

            return trip;
        } catch (error) {
            throw new InternalServerErrorException(`Error al crear el viaje: ${error.message}`);
        }
    }

    // New method for checking if user has access to trip
    async userHasAccessToTrip(tripId: string, userId: string): Promise<boolean> {
        const trip = await this.prisma.trip.findUnique({
            where: { id: tripId },
            include: {
                driver: true,
                passengers: true,
            },
        });

        if (!trip) return false;

        // Check if user is driver or passenger
        const isDriver = trip.driver?.userId === userId;
        const isPassenger = trip.passengers.some(p => p.passengerId === userId);

        return isDriver || isPassenger;
    }

    private calculateFare(distance: number, duration: number, tariff: any): number {
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

    // New method for updating trip status and sending notifications
    async updateTripStatusWithNotification(
        tripId: string,
        status: TripStatus,
        reason?: string,
        userId?: string
    ) {
        const trip = await this.prisma.trip.findUnique({
            where: { id: tripId },
            include: {
                passengers: true,
                driver: { include: { user: true } },
            },
        });

        if (!trip) {
            throw new NotFoundException('Viaje no encontrado');
        }

        // Update trip and passenger statuses
        const updatedTrip = await this.prisma.$transaction(async (prisma) => {
            // Update trip status
            const updated = await prisma.trip.update({
                where: { id: tripId },
                data: {
                    status,
                    cancellationReason: reason,
                    ...(status === TripStatus.IN_PROGRESS && { startedAt: new Date() }),
                    ...(status === TripStatus.COMPLETED && { endedAt: new Date() }),
                },
            });

            // Update all passengers' status
            await prisma.tripPassenger.updateMany({
                where: { tripId },
                data: { status },
            });

            return updated;
        });

        // Emit update via WebSocket
        const statusData: any = {
            trip: {
                id: updatedTrip.id,
                status: updatedTrip.status,
            }
        };

        // Add relevant data based on status
        if (status === TripStatus.CANCELLED) {
            statusData.reason = reason;
        } else if (status === TripStatus.CONFIRMED && trip.driver) {
            statusData.driver = {
                name: `${trip.driver.user.firstName} ${trip.driver.user.lastName}`,
                profilePicture: trip.driver.user.profilePicture,
            };
        }

        this.tripsGateway.emitTripUpdate(tripId, status, statusData);

        // Send personalized notifications to each user
        // Passengers
        for (const passenger of trip.passengers) {
            this.tripsGateway.sendToUser(passenger.passengerId, 'trip_notification', {
                tripId,
                status,
                message: this.getTripStatusMessage(status, reason),
            });
        }

        // Driver
        if (trip.driver) {
            this.tripsGateway.sendToUser(trip.driver.userId, 'trip_notification', {
                tripId,
                status,
                message: this.getTripStatusMessage(status, reason),
            });
        }

        return updatedTrip;
    }

    // Helper method to get status message
    private getTripStatusMessage(status: TripStatus, reason?: string): string {
        switch (status) {
            case TripStatus.SEARCHING:
                return 'Buscando conductor para tu viaje...';
            case TripStatus.CONFIRMED:
                return 'Un conductor ha aceptado tu viaje';
            case TripStatus.IN_PROGRESS:
                return 'Tu viaje ha comenzado';
            case TripStatus.COMPLETED:
                return 'Tu viaje ha finalizado';
            case TripStatus.CANCELLED:
                return reason ? `Viaje cancelado: ${reason}` : 'Viaje cancelado';
            case TripStatus.SCHEDULED:
                return 'Tu viaje ha sido programado';
            default:
                return 'Estado del viaje actualizado';
        }
    }

    async findAll(userId: string, status?: TripStatus, role?: UserRole) {
        if (role === UserRole.PASSENGER) {
            // Find all trips for this passenger
            const trips = await this.prisma.tripPassenger.findMany({
                where: {
                    passengerId: userId,
                    ...(status && { status }),
                },
                include: {
                    trip: {
                        include: {
                            driver: {
                                include: {
                                    user: {
                                        select: {
                                            firstName: true,
                                            lastName: true,
                                            profilePicture: true,
                                        },
                                    },
                                    vehicle: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    trip: {
                        createdAt: 'desc',
                    },
                },
            });

            return trips;
        } else if (role === UserRole.DRIVER) {
            // Find driver
            const driver = await this.prisma.driver.findUnique({
                where: {
                    userId,
                },
            });

            if (!driver) {
                throw new NotFoundException('Conductor no encontrado');
            }

            // Find all trips for this driver
            return this.prisma.trip.findMany({
                where: {
                    driverId: driver.id,
                    ...(status && { status }),
                },
                include: {
                    passengers: {
                        include: {
                            passenger: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    profilePicture: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        }

        throw new BadRequestException('Rol no válido');
    }

    async findOne(id: string, userId: string) {
        const trip = await this.prisma.trip.findUnique({
            where: { id },
            include: {
                driver: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                profilePicture: true,
                                phone: true,
                            },
                        },
                        vehicle: true,
                    },
                },
                passengers: {
                    include: {
                        passenger: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                profilePicture: true,
                                phone: true,
                            },
                        },
                    },
                },
                payment: true,
                ratings: {
                    where: {
                        fromUserId: userId,
                    },
                },
            },
        });

        if (!trip) {
            throw new NotFoundException('Viaje no encontrado');
        }

        // Check if user is authorized to view this trip
        const isPassenger = trip.passengers.some(p => p.passengerId === userId);
        const isDriver = trip.driver?.userId === userId;

        if (!isPassenger && !isDriver) {
            throw new NotFoundException('Viaje no encontrado');
        }

        return trip;
    }

    async updateTrip(id: string, userId: string, updateTripDto: UpdateTripDto) {
        // First check if the trip exists
        const trip = await this.prisma.trip.findUnique({
            where: { id },
            include: {
                driver: true,
                passengers: true,
            },
        });

        if (!trip) {
            throw new NotFoundException('Viaje no encontrado');
        }

        // Check if the user is the driver of this trip
        const driver = await this.prisma.driver.findUnique({
            where: { userId },
        });

        const isDriver = driver && trip.driverId === driver.id;
        const isPassenger = trip.passengers.some(p => p.passengerId === userId);

        if (!isDriver && !isPassenger) {
            throw new NotFoundException('Viaje no encontrado');
        }

        // Handle different update scenarios based on role and trip status
        if (isDriver) {
            // Driver updates
            return this.handleDriverUpdate(trip, updateTripDto);
        } else if (isPassenger) {
            // Passenger updates
            return this.handlePassengerUpdate(trip, userId, updateTripDto);
        }
    }

    private async handleDriverUpdate(trip: any, updateTripDto: UpdateTripDto) {
        const { status, cancellationReason } = updateTripDto;

        // Validate status transition
        this.validateStatusTransition(trip.status, status, 'driver');

        // Update trip status with notification
        return this.updateTripStatusWithNotification(
            trip.id,
            status,
            cancellationReason || null,
            trip.driver.userId
        );
    }

    private async handlePassengerUpdate(trip: any, userId: string, updateTripDto: UpdateTripDto) {
        const { status, cancellationReason } = updateTripDto;

        // Validate status transition
        this.validateStatusTransition(trip.status, status, 'passenger');

        // For cancellations, require a reason
        if (status === TripStatus.CANCELLED && !cancellationReason) {
            throw new BadRequestException('Se requiere un motivo de cancelación');
        }

        return this.prisma.$transaction(async (prisma) => {
            // Update passenger's booking status
            await prisma.tripPassenger.updateMany({
                where: {
                    tripId: trip.id,
                    passengerId: userId,
                },
                data: { status },
            });

            // If all passengers cancel, cancel the trip
            const activePassengers = await prisma.tripPassenger.count({
                where: {
                    tripId: trip.id,
                    status: {
                        not: TripStatus.CANCELLED,
                    },
                },
            });

            if (activePassengers === 0) {
                const updatedTrip = await prisma.trip.update({
                    where: { id: trip.id },
                    data: {
                        status: TripStatus.CANCELLED,
                        cancellationReason: cancellationReason || 'Todos los pasajeros cancelaron',
                    },
                });

                // Emit trip update via WebSocket
                this.tripsGateway.emitTripUpdate(trip.id, TripStatus.CANCELLED, {
                    reason: cancellationReason || 'Todos los pasajeros cancelaron'
                });

                return updatedTrip;
            }

            const updatedTrip = await prisma.trip.findUnique({
                where: { id: trip.id },
            });

            // Emit individual passenger cancellation
            if (status === TripStatus.CANCELLED) {
                this.tripsGateway.emitTripUpdate(trip.id, trip.status, {
                    passengerCancelled: userId,
                    reason: cancellationReason
                });
            }

            return updatedTrip;
        });
    }

    private validateStatusTransition(currentStatus: TripStatus, newStatus: TripStatus, role: 'driver' | 'passenger') {
        if (!newStatus) return; // No status change requested

        // Define valid transitions
        const validDriverTransitions = {
            [TripStatus.CONFIRMED]: [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
            [TripStatus.IN_PROGRESS]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
            [TripStatus.SCHEDULED]: [TripStatus.CONFIRMED, TripStatus.CANCELLED],
        };

        const validPassengerTransitions = {
            [TripStatus.SEARCHING]: [TripStatus.CANCELLED],
            [TripStatus.CONFIRMED]: [TripStatus.CANCELLED],
            [TripStatus.SCHEDULED]: [TripStatus.CANCELLED],
        };

        const transitions = role === 'driver' ? validDriverTransitions : validPassengerTransitions;

        if (!transitions[currentStatus] || !transitions[currentStatus].includes(newStatus)) {
            throw new BadRequestException(`No se puede cambiar el estado de ${currentStatus} a ${newStatus}`);
        }
    }

    async acceptTrip(tripId: string, userId: string) {
        // Find the driver
        const driver = await this.prisma.driver.findUnique({
            where: { userId },
            include: {
                user: true,
                vehicle: true,
            },
        });

        if (!driver) {
            throw new NotFoundException('Conductor no encontrado');
        }

        if (!driver.isAvailable) {
            throw new BadRequestException('El conductor no está disponible para aceptar viajes');
        }

        if (driver.verificationStatus !== 'VERIFIED') {
            throw new BadRequestException('El conductor debe estar verificado para aceptar viajes');
        }

        // Check if the trip is available
        const trip = await this.prisma.trip.findUnique({
            where: {
                id: tripId,
                status: TripStatus.SEARCHING, // Only trips in searching state can be accepted
            },
            include: {
                passengers: true,
            },
        });

        if (!trip) {
            throw new NotFoundException('Viaje no disponible');
        }

        // Accept the trip
        const updatedTrip = await this.prisma.$transaction(async (prisma) => {
            // Update trip
            const updated = await prisma.trip.update({
                where: { id: tripId },
                data: {
                    driverId: driver.id,
                    status: TripStatus.CONFIRMED,
                },
            });

            // Update all passengers
            await prisma.tripPassenger.updateMany({
                where: { tripId },
                data: { status: TripStatus.CONFIRMED },
            });

            // Set driver as unavailable
            await prisma.driver.update({
                where: { id: driver.id },
                data: { isAvailable: false },
            });

            return updated;
        });

        // Emit trip update via WebSocket
        this.tripsGateway.emitTripUpdate(tripId, TripStatus.CONFIRMED, {
            trip: updatedTrip,
            driver: {
                id: driver.id,
                userId: driver.userId,
                name: `${driver.user.firstName} ${driver.user.lastName}`,
                profilePicture: driver.user.profilePicture,
                phone: driver.user.phone,
                rating: await this.getDriverRating(driver.userId),
                vehicle: {
                    make: driver.vehicle?.make,
                    model: driver.vehicle?.model,
                    color: driver.vehicle?.color,
                    plate: driver.vehicle?.plate,
                }
            }
        });

        // Send individual notifications to passengers
        for (const passenger of trip.passengers) {
            this.tripsGateway.sendToUser(passenger.passengerId, 'trip_notification', {
                tripId,
                status: TripStatus.CONFIRMED,
                message: 'Un conductor ha aceptado tu viaje',
                driverName: `${driver.user.firstName} ${driver.user.lastName}`,
            });
        }

        return updatedTrip;
    }

    // Helper method to get driver rating
    private async getDriverRating(driverId: string): Promise<number> {
        const ratings = await this.prisma.rating.findMany({
            where: {
                toUserId: driverId,
            },
            select: {
                score: true,
            },
        });

        if (ratings.length === 0) return 0;

        const total = ratings.reduce((sum, rating) => sum + rating.score, 0);
        return parseFloat((total / ratings.length).toFixed(1));
    }

    async updateDriverLocation(tripId: string, userId: string, location: { latitude: number, longitude: number }) {
        // Verify the user is the driver for this trip
        const driver = await this.prisma.driver.findUnique({
            where: { userId },
        });

        if (!driver) {
            throw new NotFoundException('Conductor no encontrado');
        }

        const trip = await this.prisma.trip.findUnique({
            where: {
                id: tripId,
                driverId: driver.id,
                status: {
                    in: [TripStatus.CONFIRMED, TripStatus.IN_PROGRESS]
                }
            },
        });

        if (!trip) {
            throw new NotFoundException('Viaje no encontrado o no en estado válido para actualizar ubicación');
        }

        // Update driver's location
        await this.prisma.driver.update({
            where: { id: driver.id },
            data: { currentLocation: location },
        });

        // Emit location update via WebSocket
        this.tripsGateway.emitDriverLocation(tripId, location);

        return { success: true };
    }

    async rateTrip(tripId: string, fromUserId: string, toUserId: string, score: number, comment?: string) {
        // Verify the trip exists and is completed
        const trip = await this.prisma.trip.findUnique({
            where: {
                id: tripId,
                status: TripStatus.COMPLETED, // Can only rate completed trips
            },
            include: {
                passengers: true,
                driver: true,
            },
        });

        if (!trip) {
            throw new NotFoundException('Viaje no encontrado o no completado');
        }

        // Verify the user was part of this trip
        const isPassenger = trip.passengers.some(p => p.passengerId === fromUserId);
        const isDriver = trip.driver?.userId === fromUserId;

        if (!isPassenger && !isDriver) {
            throw new BadRequestException('No está autorizado para calificar este viaje');
        }

        // Verify the target user was part of this trip
        let targetIsDriver = false;
        if (trip.driver?.userId === toUserId) {
            targetIsDriver = true;
        } else {
            const targetIsPassenger = trip.passengers.some(p => p.passengerId === toUserId);
            if (!targetIsPassenger) {
                throw new BadRequestException('El usuario a calificar no participó en este viaje');
            }
        }

        // Verify the rating hasn't been submitted already
        const existingRating = await this.prisma.rating.findFirst({
            where: {
                tripId,
                fromUserId,
                toUserId,
            },
        });

        if (existingRating) {
            throw new BadRequestException('Ya ha calificado a este usuario para este viaje');
        }

        // Create the rating
        const rating = await this.prisma.rating.create({
            data: {
                tripId,
                fromUserId,
                toUserId,
                score,
                comment,
            },
        });

        // Notify the rated user
        this.tripsGateway.sendToUser(toUserId, 'rating_received', {
            tripId,
            score,
            comment,
            fromUserType: targetIsDriver ? 'passenger' : 'driver',
        });

        return rating;
    }
}