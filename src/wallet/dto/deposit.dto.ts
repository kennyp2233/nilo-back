// src/wallets/dto/deposit.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max } from 'class-validator';

export class DepositDto {
    @IsNumber()
    @IsNotEmpty()
    @IsPositive()
    @Max(1000) // Límite de depósito
    amount: number;

    @IsString()
    @IsOptional()
    description?: string;
}
