// src/trips/dto/update-location.dto.ts
import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class UpdateLocationDto {
    @IsNumber()
    @IsNotEmpty()
    @Min(-90)
    @Max(90)
    latitude: number;

    @IsNumber()
    @IsNotEmpty()
    @Min(-180)
    @Max(180)
    longitude: number;
}