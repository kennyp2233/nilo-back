// src/trips/services/trip-location.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TripsGateway } from 'src/websockets/trips.gateway';
import { TripStatus } from '@prisma/client';

@Injectable()
export class TripLocationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tripsGateway: TripsGateway,
    ) { }

    // Actualizar la ubicación del conductor
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

    // Calcular la distancia entre dos puntos geográficos (usando la fórmula Haversine)
    calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distancia en km
        return parseFloat(distance.toFixed(2));
    }

    // Convertir grados a radianes
    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    // Verificar si el conductor está cerca del punto de recogida
    async isDriverNearPickupLocation(tripId: string, maxDistance: number = 0.2): Promise<boolean> {
        const trip = await this.prisma.trip.findUnique({
            where: { id: tripId },
            include: {
                driver: true,
            },
        });

        if (!trip || !trip.driver || !trip.driver.currentLocation) {
            return false;
        }

        const driverLocation = trip.driver.currentLocation as any;
        const pickupLocation = trip.startLocation as any;

        const distance = this.calculateDistance(
            driverLocation.latitude,
            driverLocation.longitude,
            pickupLocation.latitude,
            pickupLocation.longitude
        );

        // El conductor está cerca si la distancia es menor al umbral
        return distance <= maxDistance;
    }

    // Verificar si el conductor está cerca del destino
    async isDriverNearDestination(tripId: string, maxDistance: number = 0.2): Promise<boolean> {
        const trip = await this.prisma.trip.findUnique({
            where: { id: tripId },
            include: {
                driver: true,
            },
        });

        if (!trip || !trip.driver || !trip.driver.currentLocation) {
            return false;
        }

        const driverLocation = trip.driver.currentLocation as any;
        const destinationLocation = trip.endLocation as any;

        const distance = this.calculateDistance(
            driverLocation.latitude,
            driverLocation.longitude,
            destinationLocation.latitude,
            destinationLocation.longitude
        );

        // El conductor está cerca si la distancia es menor al umbral
        return distance <= maxDistance;
    }
}