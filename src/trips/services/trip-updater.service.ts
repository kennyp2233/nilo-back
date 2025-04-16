// src/trips/services/trip-updater.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TripsGateway } from 'src/websockets/trips.gateway';
import { UpdateTripDto } from '../dto/update-trip.dto';
import { TripStatus, UserRole } from '@prisma/client';
import { TripStatusValidator } from '../utils/trip-status-validator';

@Injectable()
export class TripUpdaterService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tripsGateway: TripsGateway,
        private readonly tripStatusValidator: TripStatusValidator,
    ) { }

    // Actualizar viaje
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

        // Check if the user is the driver or a passenger
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

    // Manejar actualización del conductor
    private async handleDriverUpdate(trip: any, updateTripDto: UpdateTripDto) {
        const { status, cancellationReason } = updateTripDto;

        // Validate status transition
        this.tripStatusValidator.validateStatusTransition(trip.status, status, 'driver');

        // Update trip status with notification
        return this.updateTripStatusWithNotification(
            trip.id,
            status,
            cancellationReason || null,
            trip.driver.userId
        );
    }

    // Manejar actualización del pasajero
    private async handlePassengerUpdate(trip: any, userId: string, updateTripDto: UpdateTripDto) {
        const { status, cancellationReason } = updateTripDto;

        // Validate status transition
        this.tripStatusValidator.validateStatusTransition(trip.status, status, 'passenger');

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

    // Aceptar viaje (para conductores)
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

    // Actualizar estado del viaje y enviar notificaciones
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
            }
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
}