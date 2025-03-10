// src/trips/dto/create-trip.dto.ts
import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsObject,
    IsDateString,
    IsPositive,
    ValidateNested,
    Min,
    Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { TripType } from '@prisma/client';

export class LocationDto {
    @IsNumber()
    @IsNotEmpty()
    latitude: number;

    @IsNumber()
    @IsNotEmpty()
    longitude: number;

    @IsOptional()
    @IsObject()
    address?: any;
}

export class CreateTripDto {
    @IsEnum(TripType)
    @IsNotEmpty()
    type: TripType;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => LocationDto)
    startLocation: LocationDto;

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => LocationDto)
    endLocation: LocationDto;

    @IsOptional()
    @IsDateString()
    scheduledAt?: string;

    // Fields for intercity trips
    @IsOptional()
    @IsNumber()
    @IsPositive()
    @Min(1)
    @Max(8)
    availableSeats?: number;

    @IsOptional()
    @IsNumber()
    @IsPositive()
    pricePerSeat?: number;
}