// src/payments/payments.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentMethod, PaymentStatus, TripStatus, TransactionType } from '@prisma/client';

@Injectable()
export class PaymentsService {
    constructor(private readonly prisma: PrismaService) { }

    async createPayment(userId: string, createPaymentDto: CreatePaymentDto) {
        const { tripId, method } = createPaymentDto;

        // Verificar si el viaje existe y está en estado COMPLETED
        const trip = await this.prisma.trip.findUnique({
            where: {
                id: tripId,
                status: TripStatus.COMPLETED,
            },
            include: {
                payment: true,
                passengers: {
                    where: {
                        passengerId: userId,
                    },
                },
                driver: true,
            },
        });

        if (!trip) {
            throw new NotFoundException('Viaje no encontrado o no completado');
        }

        // Verificar si el usuario es pasajero del viaje
        if (trip.passengers.length === 0) {
            throw new BadRequestException('El usuario no es pasajero de este viaje');
        }

        // Verificar si ya existe un pago para este viaje
        if (trip.payment) {
            throw new BadRequestException('Este viaje ya ha sido pagado');
        }

        const amount = Number(trip.fare);
        const platformFeePercentage = 0.20; // 20% de comisión
        const platformFee = amount * platformFeePercentage;
        const driverAmount = amount - platformFee;
        const taxAmount = amount * 0.12; // 12% de IVA

        // Crear el pago en una transacción
        return this.prisma.$transaction(async (prisma) => {
            // Crear el pago
            const payment = await prisma.payment.create({
                data: {
                    tripId,
                    userId,
                    amount,
                    method,
                    status: method === PaymentMethod.CASH ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
                    platformFee,
                    driverAmount,
                    taxAmount,
                },
            });

            // Si el método de pago es WALLET, actualizar el saldo
            if (method === PaymentMethod.WALLET) {
                const wallet = await prisma.wallet.findUnique({
                    where: { userId },
                });

                if (!wallet) {
                    throw new NotFoundException('Monedero no encontrado');
                }

                if (Number(wallet.balance) < amount) {
                    throw new BadRequestException('Saldo insuficiente en el monedero');
                }

                // Actualizar el saldo del usuario
                await prisma.wallet.update({
                    where: { userId },
                    data: {
                        balance: {
                            decrement: amount,
                        },
                    },
                });

                // Registrar la transacción
                await prisma.walletTransaction.create({
                    data: {
                        walletId: wallet.id,
                        amount: -amount,
                        balanceAfter: Number(wallet.balance) - amount,
                        type: TransactionType.PAYMENT,
                        description: `Pago del viaje #${tripId}`,
                        referenceId: payment.id,
                        status: 'COMPLETED',
                    },
                });

                // Actualizar el estado del pago
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: PaymentStatus.COMPLETED,
                    },
                });

                // Si el viaje tiene conductor, agregar fondos a su monedero
                if (trip.driver) {
                    const driverWallet = await prisma.wallet.findUnique({
                        where: { userId: trip.driver.userId },
                    });

                    if (driverWallet) {
                        await prisma.wallet.update({
                            where: { userId: trip.driver.userId },
                            data: {
                                balance: {
                                    increment: driverAmount,
                                },
                            },
                        });

                        await prisma.walletTransaction.create({
                            data: {
                                walletId: driverWallet.id,
                                amount: driverAmount,
                                balanceAfter: Number(driverWallet.balance) + driverAmount,
                                type: TransactionType.TRIP_EARNING,
                                description: `Ganancia por viaje #${tripId}`,
                                referenceId: payment.id,
                                status: 'COMPLETED',
                            },
                        });
                    }
                }
            }

            return payment;
        });
    }

    async findOne(id: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { id },
            include: {
                trip: {
                    include: {
                        driver: {
                            include: {
                                user: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        },
                    },
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        if (!payment) {
            throw new NotFoundException('Pago no encontrado');
        }

        return payment;
    }

    async findByTrip(tripId: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { tripId },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        if (!payment) {
            throw new NotFoundException('Pago no encontrado para este viaje');
        }

        return payment;
    }

    async findByUser(userId: string) {
        return this.prisma.payment.findMany({
            where: { userId },
            include: {
                trip: {
                    select: {
                        startLocation: true,
                        endLocation: true,
                        startedAt: true,
                        endedAt: true,
                        distance: true,
                        duration: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
}