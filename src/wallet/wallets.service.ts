// src/wallets/wallets.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransactionStatus, TransactionType } from '@prisma/client';

@Injectable()
export class WalletsService {
    constructor(private readonly prisma: PrismaService) { }

    async getWallet(userId: string) {
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId },
        });

        if (!wallet) {
            throw new NotFoundException('Monedero no encontrado');
        }

        return wallet;
    }

    async getTransactions(userId: string, limit: number = 10) {
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId },
        });

        if (!wallet) {
            throw new NotFoundException('Monedero no encontrado');
        }

        const transactions = await this.prisma.walletTransaction.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return transactions;
    }

    async deposit(userId: string, depositDto: DepositDto) {
        const { amount, description } = depositDto;

        if (amount <= 0) {
            throw new BadRequestException('El monto debe ser mayor a cero');
        }

        // Buscar el monedero del usuario
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId },
        });

        if (!wallet) {
            throw new NotFoundException('Monedero no encontrado');
        }

        // Realizar el depósito en una transacción
        return this.prisma.$transaction(async (prisma) => {
            // Actualizar el saldo
            const updatedWallet = await prisma.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: {
                        increment: amount,
                    },
                },
            });

            // Registrar la transacción
            const transaction = await prisma.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount,
                    balanceAfter: updatedWallet.balance,
                    type: TransactionType.DEPOSIT,
                    description: description || 'Depósito a monedero',
                    status: TransactionStatus.COMPLETED,
                },
            });

            return {
                wallet: updatedWallet,
                transaction,
            };
        });
    }

    async withdraw(userId: string, withdrawDto: WithdrawDto) {
        const { amount, description } = withdrawDto;

        if (amount <= 0) {
            throw new BadRequestException('El monto debe ser mayor a cero');
        }

        // Buscar el monedero del usuario
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId },
        });

        if (!wallet) {
            throw new NotFoundException('Monedero no encontrado');
        }

        // Verificar saldo suficiente
        if (Number(wallet.balance) < amount) {
            throw new BadRequestException('Saldo insuficiente');
        }

        // Realizar el retiro en una transacción
        return this.prisma.$transaction(async (prisma) => {
            // Actualizar el saldo
            const updatedWallet = await prisma.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: {
                        decrement: amount,
                    },
                },
            });

            // Registrar la transacción
            const transaction = await prisma.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount: -amount, // Monto negativo para retiros
                    balanceAfter: updatedWallet.balance,
                    type: TransactionType.WITHDRAWAL,
                    description: description || 'Retiro de monedero',
                    status: TransactionStatus.COMPLETED,
                },
            });

            return {
                wallet: updatedWallet,
                transaction,
            };
        });
    }
}