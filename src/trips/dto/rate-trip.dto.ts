// src/trips/dto/rate-trip.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class RateDto {
    @IsUUID()
    @IsNotEmpty()
    toUserId: string;

    @IsInt()
    @Min(1)
    @Max(5)
    score: number;

    @IsString()
    @IsOptional()
    comment?: string;
}