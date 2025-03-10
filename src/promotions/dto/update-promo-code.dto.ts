// src/promotions/dto/update-promo-code.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePromoCodeDto } from './create-promo-code.dto';

export class UpdatePromoCodeDto extends PartialType(CreatePromoCodeDto) { }

// src/promotions/dto/apply-promo-code.dto.ts
import { IsEnum, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { TripType } from '@prisma/client';

export class ApplyPromoCodeDto {
    @IsString()
    @IsNotEmpty()
    code: string;

    @IsNumber()
    @IsNotEmpty()
    @IsPositive()
    amount: number;

    @IsEnum(TripType)
    @IsNotEmpty()
    tripType: TripType;
}