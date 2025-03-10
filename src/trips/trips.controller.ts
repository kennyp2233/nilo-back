// src/trips/trips.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    UseGuards,
    BadRequestException
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { RateDto } from './dto/rate-trip.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TripStatus, UserRole } from '@prisma/client';

@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TripsController {
    constructor(private readonly tripsService: TripsService) { }

    @Post()
    @Roles(UserRole.PASSENGER)
    create(
        @GetUser('id') userId: string,
        @Body() createTripDto: CreateTripDto
    ) {
        return this.tripsService.createTrip(userId, createTripDto);
    }

    @Get()
    findAll(
        @GetUser('id') userId: string,
        @GetUser('role') role: UserRole,
        @Query('status') status?: TripStatus
    ) {
        return this.tripsService.findAll(userId, status, role);
    }

    @Get(':id')
    findOne(
        @Param('id') id: string,
        @GetUser('id') userId: string
    ) {
        return this.tripsService.findOne(id, userId);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @GetUser('id') userId: string,
        @Body() updateTripDto: UpdateTripDto
    ) {
        return this.tripsService.updateTrip(id, userId, updateTripDto);
    }

    @Post(':id/accept')
    @Roles(UserRole.DRIVER)
    acceptTrip(
        @Param('id') id: string,
        @GetUser('id') userId: string
    ) {
        return this.tripsService.acceptTrip(id, userId);
    }

    @Post(':id/rate')
    rateTrip(
        @Param('id') id: string,
        @GetUser('id') userId: string,
        @Body() rateDto: RateDto
    ) {
        const { toUserId, score, comment } = rateDto;

        if (userId === toUserId) {
            throw new BadRequestException('No puede calificarse a sí mismo');
        }

        return this.tripsService.rateTrip(id, userId, toUserId, score, comment);
    }
}