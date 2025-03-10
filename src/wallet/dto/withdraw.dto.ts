
// src/wallets/dto/withdraw.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max } from 'class-validator';

export class WithdrawDto {
    @IsNumber()
    @IsNotEmpty()
    @IsPositive()
    @Max(500) // Límite de retiro
    amount: number;

    @IsString()
    @IsOptional()
    description?: string;
}