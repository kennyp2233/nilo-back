// src/trips/interfaces/trip.interface.ts
import { TripStatus, TripType } from '@prisma/client';

// Interfaces para la ubicación
export interface GeoLocation {
    latitude: number;
    longitude: number;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        [key: string]: string | undefined;
    };
    displayName?: string;
}

// Interfaces para el conductor
export interface DriverInfo {
    id: string;
    userId: string;
    name: string;
    profilePicture?: string;
    phone?: string;
    rating?: number;
    vehicle?: VehicleInfo;
}

// Interfaces para el vehículo
export interface VehicleInfo {
    id?: string;
    make: string;
    model: string;
    color: string;
    plate: string;
    year?: number;
}

// Interfaces para el pasajero
export interface PassengerInfo {
    id: string;
    name: string;
    profilePicture?: string;
    phone?: string;
    rating?: number;
}

// Interfaces para el viaje
export interface TripInfo {
    id: string;
    type: TripType;
    status: TripStatus;
    startLocation: GeoLocation;
    endLocation: GeoLocation;
    distance: number;
    duration: number;
    fare: number;
    estimatedFare: number;
    scheduledAt?: Date;
    startedAt?: Date;
    endedAt?: Date;
    cancellationReason?: string;
    routePolyline?: string;
    createdAt: Date;
    updatedAt: Date;
    // Campos para viajes interprovinciales
    origin?: string;
    destination?: string;
    availableSeats?: number;
    pricePerSeat?: number;
    // Relaciones
    driver?: DriverInfo;
    passengers?: TripPassengerInfo[];
    payment?: PaymentInfo;
    ratings?: RatingInfo[];
}

// Interfaces para los pasajeros del viaje
export interface TripPassengerInfo {
    id: string;
    tripId: string;
    passengerId: string;
    passenger?: PassengerInfo;
    pickupLocation?: GeoLocation;
    dropoffLocation?: GeoLocation;
    fare: number;
    status: TripStatus;
    bookedSeats: number;
}

// Interfaces para el pago
export interface PaymentInfo {
    id: string;
    tripId: string;
    userId: string;
    amount: number;
    method: string;
    status: string;
    transactionId?: string;
    receiptUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Interfaces para la calificación
export interface RatingInfo {
    id: string;
    tripId: string;
    fromUserId: string;
    toUserId: string;
    score: number;
    comment?: string;
    createdAt: Date;
}

// Enumeración de eventos del dominio de viajes
export enum TripEventType {
    TRIP_CREATED = 'trip_created',
    TRIP_UPDATED = 'trip_updated',
    TRIP_CANCELLED = 'trip_cancelled',
    TRIP_CONFIRMED = 'trip_confirmed',
    TRIP_STARTED = 'trip_started',
    TRIP_COMPLETED = 'trip_completed',
    DRIVER_ASSIGNED = 'driver_assigned',
    DRIVER_LOCATION_UPDATED = 'driver_location_updated',
    TRIP_RATED = 'trip_rated',
    PAYMENT_COMPLETED = 'payment_completed'
}

// Interfaz para eventos del viaje
export interface TripEvent {
    type: TripEventType;
    tripId: string;
    timestamp: Date;
    data: any;
}