// src/payments/dto/create-payment.dto.ts
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
    @IsUUID()
    @IsNotEmpty()
    tripId: string;

    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    method: PaymentMethod;
}