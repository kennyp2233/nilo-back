// src/vehicles/dto/create-vehicle.dto.ts
import { IsString, IsNumber, IsOptional, IsEnum, Min, Max, IsPositive, IsUrl } from 'class-validator';
import { VehicleCategory } from '@prisma/client';

export class CreateVehicleDto {
  @IsString()
  plate: string;

  @IsString()
  make: string;

  @IsString()
  model: string;

  @IsNumber()
  @IsPositive()
  @Min(2000)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsString()
  color: string;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Max(8)
  capacity?: number;

  @IsEnum(VehicleCategory)
  @IsOptional()
  category?: VehicleCategory;

  @IsUrl()
  @IsOptional()
  photoUrl?: string;
}

