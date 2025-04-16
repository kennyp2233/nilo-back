// src/trips/services/trip-finder.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TripStatus, UserRole } from '@prisma/client';

@Injectable()
export class TripFinderService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    // Verificar si un usuario tiene acceso a un viaje
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

    // Obtener todos los viajes para un usuario
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

    // Obtener un viaje específico
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
}