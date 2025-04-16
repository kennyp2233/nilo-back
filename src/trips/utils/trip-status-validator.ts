// src/trips/utils/trip-status-validator.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { TripStatus } from '@prisma/client';

@Injectable()
export class TripStatusValidator {
    // Define las transiciones válidas de estado para conductores y pasajeros
    private readonly validDriverTransitions = {
        [TripStatus.CONFIRMED]: [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
        [TripStatus.IN_PROGRESS]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
        [TripStatus.SCHEDULED]: [TripStatus.CONFIRMED, TripStatus.CANCELLED],
    };

    private readonly validPassengerTransitions = {
        [TripStatus.SEARCHING]: [TripStatus.CANCELLED],
        [TripStatus.CONFIRMED]: [TripStatus.CANCELLED],
        [TripStatus.SCHEDULED]: [TripStatus.CANCELLED],
    };

    /**
     * Valida si la transición de un estado a otro es permitida
     * @param currentStatus Estado actual del viaje
     * @param newStatus Nuevo estado propuesto
     * @param role Rol del usuario que intenta realizar el cambio ('driver' o 'passenger')
     * @throws BadRequestException si la transición no es válida
     */
    validateStatusTransition(currentStatus: TripStatus, newStatus: TripStatus, role: 'driver' | 'passenger'): void {
        if (!newStatus) return; // No status change requested

        const transitions = role === 'driver' ? this.validDriverTransitions : this.validPassengerTransitions;

        if (!transitions[currentStatus] || !transitions[currentStatus].includes(newStatus)) {
            throw new BadRequestException(`No se puede cambiar el estado de ${currentStatus} a ${newStatus}`);
        }
    }

    /**
     * Verifica si un estado específico es un estado final
     * @param status El estado a verificar
     * @returns true si es estado final, false en caso contrario
     */
    isFinalStatus(status: TripStatus): boolean {
        return status === TripStatus.COMPLETED || status === TripStatus.CANCELLED;
    }

    /**
     * Determina si un viaje está activo basado en su estado
     * @param status Estado del viaje
     * @returns true si el viaje está activo, false en caso contrario
     */
    isActiveTrip(status: TripStatus): boolean {
        return status === TripStatus.CONFIRMED ||
            status === TripStatus.IN_PROGRESS ||
            status === TripStatus.SEARCHING;
    }

    /**
     * Determina si un viaje puede ser calificado
     * @param status Estado del viaje
     * @returns true si el viaje puede ser calificado, false en caso contrario
     */
    isRateable(status: TripStatus): boolean {
        return status === TripStatus.COMPLETED;
    }
}