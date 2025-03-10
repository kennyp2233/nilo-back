// src/vehicles/vehicles.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { UserRole, VehicleCategory } from '@prisma/client';

@Injectable()
export class VehiclesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, createVehicleDto: CreateVehicleDto) {
        // Verificar si el usuario existe y es un conductor
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { driver: true },
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        if (user.role !== UserRole.DRIVER || !user.driver) {
            throw new BadRequestException('Solo los conductores pueden registrar vehículos');
        }

        // Verificar si el conductor ya tiene un vehículo registrado
        const existingVehicle = await this.prisma.vehicle.findUnique({
            where: { driverId: user.driver.id },
        });

        if (existingVehicle) {
            throw new BadRequestException('El conductor ya tiene un vehículo registrado');
        }

        // Verificar si la placa ya está registrada
        const existingPlate = await this.prisma.vehicle.findUnique({
            where: { plate: createVehicleDto.plate },
        });

        if (existingPlate) {
            throw new BadRequestException('La placa ya está registrada en el sistema');
        }

        // Crear el vehículo
        return this.prisma.vehicle.create({
            data: {
                driverId: user.driver.id,
                plate: createVehicleDto.plate,
                make: createVehicleDto.make,
                model: createVehicleDto.model,
                year: createVehicleDto.year,
                color: createVehicleDto.color,
                capacity: createVehicleDto.capacity || 4,
                category: createVehicleDto.category || VehicleCategory.STANDARD,
                photoUrl: createVehicleDto.photoUrl,
            },
        });
    }

    async findOne(id: string) {
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id },
            include: {
                driver: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        });

        if (!vehicle) {
            throw new NotFoundException('Vehículo no encontrado');
        }

        return vehicle;
    }

    async findByDriver(driverId: string) {
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { driverId },
        });

        if (!vehicle) {
            throw new NotFoundException('Vehículo no encontrado para este conductor');
        }

        return vehicle;
    }

    async update(id: string, userId: string, updateVehicleDto: UpdateVehicleDto) {
        // Verificar si el vehículo existe
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id },
            include: {
                driver: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!vehicle) {
            throw new NotFoundException('Vehículo no encontrado');
        }

        // Verificar si el usuario es el propietario del vehículo
        if (vehicle.driver.user.id !== userId) {
            throw new BadRequestException('No tiene permiso para actualizar este vehículo');
        }

        // Si se está actualizando la placa, verificar que no esté en uso
        if (updateVehicleDto.plate && updateVehicleDto.plate !== vehicle.plate) {
            const existingPlate = await this.prisma.vehicle.findUnique({
                where: { plate: updateVehicleDto.plate },
            });

            if (existingPlate) {
                throw new BadRequestException('La placa ya está registrada en el sistema');
            }
        }

        // Actualizar el vehículo
        return this.prisma.vehicle.update({
            where: { id },
            data: updateVehicleDto,
        });
    }

    async remove(id: string, userId: string) {
        // Verificar si el vehículo existe
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id },
            include: {
                driver: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!vehicle) {
            throw new NotFoundException('Vehículo no encontrado');
        }

        // Verificar si el usuario es el propietario del vehículo
        if (vehicle.driver.user.id !== userId) {
            throw new BadRequestException('No tiene permiso para eliminar este vehículo');
        }

        // En lugar de eliminar, marcar como inactivo
        return this.prisma.vehicle.update({
            where: { id },
            data: { active: false },
        });
    }
}