// src/wallets/wallets.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
    constructor(private readonly walletsService: WalletsService) { }

    @Get()
    getWallet(@GetUser('id') userId: string) {
        return this.walletsService.getWallet(userId);
    }

    @Get('transactions')
    getTransactions(
        @GetUser('id') userId: string,
        @Query('limit', ParseIntPipe) limit?: number
    ) {
        return this.walletsService.getTransactions(userId, limit);
    }

    @Post('deposit')
    deposit(
        @GetUser('id') userId: string,
        @Body() depositDto: DepositDto
    ) {
        return this.walletsService.deposit(userId, depositDto);
    }

    @Post('withdraw')
    withdraw(
        @GetUser('id') userId: string,
        @Body() withdrawDto: WithdrawDto
    ) {
        return this.walletsService.withdraw(userId, withdrawDto);
    }
}