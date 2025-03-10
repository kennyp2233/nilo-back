// src/promotions/promotions.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { TripType } from '@prisma/client';

@Injectable()
export class PromotionsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Crea un nuevo código promocional
     */
    async create(createPromoCodeDto: CreatePromoCodeDto) {
        const { code } = createPromoCodeDto;

        // Verificar si el código ya existe
        const existingCode = await this.prisma.promoCode.findUnique({
            where: { code },
        });

        if (existingCode) {
            throw new ConflictException('El código promocional ya existe');
        }

        // Validar que haya al menos un tipo de descuento
        if (!createPromoCodeDto.discountAmount && !createPromoCodeDto.discountPercent) {
            throw new BadRequestException('Debe especificar al menos un tipo de descuento (monto o porcentaje)');
        }

        // Crear el código promocional
        return this.prisma.promoCode.create({
            data: {
                code,
                description: createPromoCodeDto.description,
                discountAmount: createPromoCodeDto.discountAmount,
                discountPercent: createPromoCodeDto.discountPercent,
                maxDiscount: createPromoCodeDto.maxDiscount,
                startDate: new Date(createPromoCodeDto.startDate),
                endDate: new Date(createPromoCodeDto.endDate),
                isActive: createPromoCodeDto.isActive ?? true,
                usageLimit: createPromoCodeDto.usageLimit,
                minTripAmount: createPromoCodeDto.minTripAmount,
                applicableTripTypes: createPromoCodeDto.applicableTripTypes || Object.values(TripType),
            },
        });
    }

    /**
     * Obtiene todos los códigos promocionales
     */
    async findAll() {
        return this.prisma.promoCode.findMany({
            orderBy: {
                endDate: 'desc',
            },
        });
    }

    /**
     * Obtiene un código promocional por ID
     */
    async findOne(id: string) {
        const promoCode = await this.prisma.promoCode.findUnique({
            where: { id },
        });

        if (!promoCode) {
            throw new NotFoundException('Código promocional no encontrado');
        }

        return promoCode;
    }

    /**
     * Busca un código promocional por su código
     */
    async findByCode(code: string) {
        const promoCode = await this.prisma.promoCode.findUnique({
            where: { code },
        });

        if (!promoCode) {
            throw new NotFoundException('Código promocional no encontrado');
        }

        // Verificar si el código está activo
        if (!promoCode.isActive) {
            throw new BadRequestException('El código promocional no está activo');
        }

        // Verificar si el código ha expirado
        const now = new Date();
        if (promoCode.startDate > now || promoCode.endDate < now) {
            throw new BadRequestException('El código promocional no está vigente');
        }

        // Verificar si se ha alcanzado el límite de uso
        if (promoCode.usageLimit && promoCode.currentUses >= promoCode.usageLimit) {
            throw new BadRequestException('Este código promocional ha alcanzado su límite de uso');
        }

        return promoCode;
    }

    /**
     * Actualiza un código promocional
     */
    async update(id: string, updatePromoCodeDto: UpdatePromoCodeDto) {
        await this.findOne(id); // Verificar que existe

        // Si se actualiza el código, verificar que no exista otro con el mismo código
        if (updatePromoCodeDto.code) {
            const existingCode = await this.prisma.promoCode.findUnique({
                where: { code: updatePromoCodeDto.code },
            });

            if (existingCode && existingCode.id !== id) {
                throw new ConflictException('Ya existe otro código promocional con este código');
            }
        }

        // Actualizar fechas si se proporcionan
        const data: any = { ...updatePromoCodeDto };
        if (updatePromoCodeDto.startDate) {
            data.startDate = new Date(updatePromoCodeDto.startDate);
        }
        if (updatePromoCodeDto.endDate) {
            data.endDate = new Date(updatePromoCodeDto.endDate);
        }

        return this.prisma.promoCode.update({
            where: { id },
            data,
        });
    }

    /**
     * Elimina un código promocional
     */
    async remove(id: string) {
        await this.findOne(id); // Verificar que existe

        return this.prisma.promoCode.delete({
            where: { id },
        });
    }

    /**
     * Aplica un código promocional a un monto
     */
    async applyPromoCode(code: string, amount: number, tripType: TripType) {
        const promoCode = await this.findByCode(code);

        // Verificar si el código aplica para este tipo de viaje
        if (!promoCode.applicableTripTypes.includes(tripType)) {
            throw new BadRequestException('Este código promocional no aplica para este tipo de viaje');
        }

        // Verificar monto mínimo
        if (promoCode.minTripAmount && amount < promoCode.minTripAmount.toNumber()) {
            throw new BadRequestException(`El monto mínimo para usar este código es ${promoCode.minTripAmount}`);
        }

        let discount = 0;

        // Calcular descuento por monto fijo
        if (promoCode.discountAmount) {
            discount = promoCode.discountAmount.toNumber();
        }

        // Calcular descuento por porcentaje
        if (promoCode.discountPercent) {
            const percentDiscount = amount * (promoCode.discountPercent.toNumber() / 100);
            // Si hay ambos tipos de descuento, usar el mayor
            discount = Math.max(discount, percentDiscount);
        }

        // Aplicar límite de descuento máximo si existe
        if (promoCode.maxDiscount && discount > promoCode.maxDiscount.toNumber()) {
            discount = promoCode.maxDiscount.toNumber();
        }

        // El descuento no puede ser mayor que el monto
        if (discount > amount) {
            discount = amount;
        }

        // Incrementar el contador de usos
        await this.prisma.promoCode.update({
            where: { id: promoCode.id },
            data: {
                currentUses: {
                    increment: 1,
                },
            },
        });

        return {
            originalAmount: amount,
            discount,
            finalAmount: amount - discount,
            promoCode: {
                id: promoCode.id,
                code: promoCode.code,
                description: promoCode.description,
            },
        };
    }
}