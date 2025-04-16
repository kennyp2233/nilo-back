// src/trips/services/trip-rating.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TripsGateway } from 'src/websockets/trips.gateway';
import { TripStatus } from '@prisma/client';

@Injectable()
export class TripRatingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tripsGateway: TripsGateway,
    ) { }

    // Calificar un viaje
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

    // Obtener la calificación promedio de un usuario
    async getUserRating(userId: string): Promise<number> {
        const ratings = await this.prisma.rating.findMany({
            where: {
                toUserId: userId,
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