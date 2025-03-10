// src/promotions/dto/create-promo-code.dto.ts
import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
    MinLength
} from 'class-validator';
import { TripType } from '@prisma/client';

export class CreatePromoCodeDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(20)
    code: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsOptional()
    @IsPositive()
    discountAmount?: number;

    @IsNumber()
    @IsOptional()
    @IsPositive()
    discountPercent?: number;

    @IsNumber()
    @IsOptional()
    @IsPositive()
    maxDiscount?: number;

    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @IsDateString()
    @IsNotEmpty()
    endDate: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsNumber()
    @IsOptional()
    @IsPositive()
    usageLimit?: number;

    @IsNumber()
    @IsOptional()
    @IsPositive()
    minTripAmount?: number;

    @IsArray()
    @IsEnum(TripType, { each: true })
    @IsOptional()
    applicableTripTypes?: TripType[];
}
