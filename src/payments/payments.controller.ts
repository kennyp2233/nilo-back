// src/payments/payments.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post()
    create(
        @GetUser('id') userId: string,
        @Body() createPaymentDto: CreatePaymentDto,
    ) {
        return this.paymentsService.createPayment(userId, createPaymentDto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.paymentsService.findOne(id);
    }

    @Get('trip/:tripId')
    findByTrip(@Param('tripId') tripId: string) {
        return this.paymentsService.findByTrip(tripId);
    }

    @Get('user/history')
    findByUser(@GetUser('id') userId: string) {
        return this.paymentsService.findByUser(userId);
    }
}