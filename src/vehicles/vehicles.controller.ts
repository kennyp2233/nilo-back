// src/vehicles/vehicles.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
    constructor(private readonly vehiclesService: VehiclesService) { }

    @Post()
    @Roles(UserRole.DRIVER)
    create(
        @GetUser('id') userId: string,
        @Body() createVehicleDto: CreateVehicleDto,
    ) {
        return this.vehiclesService.create(userId, createVehicleDto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.vehiclesService.findOne(id);
    }

    @Get('driver/:driverId')
    findByDriver(@Param('driverId') driverId: string) {
        return this.vehiclesService.findByDriver(driverId);
    }

    @Patch(':id')
    @Roles(UserRole.DRIVER)
    update(
        @Param('id') id: string,
        @GetUser('id') userId: string,
        @Body() updateVehicleDto: UpdateVehicleDto,
    ) {
        return this.vehiclesService.update(id, userId, updateVehicleDto);
    }

    @Delete(':id')
    @Roles(UserRole.DRIVER)
    remove(@Param('id') id: string, @GetUser('id') userId: string) {
        return this.vehiclesService.remove(id, userId);
    }
}