// src/trips/dto/update-trip.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TripStatus } from '@prisma/client';

export class UpdateTripDto {
    @IsEnum(TripStatus)
    @IsOptional()
    status?: TripStatus;

    @IsString()
    @IsOptional()
    cancellationReason?: string;
}
