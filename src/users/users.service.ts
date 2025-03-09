// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Verificar que el usuario existe
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async updateProfilePicture(id: string, profilePictureUrl: string) {
    return this.prisma.user.update({
      where: { id },
      data: { profilePicture: profilePictureUrl },
    });
  }

  async getProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Si es pasajero, obtener información adicional
    if (user.role === UserRole.PASSENGER) {
      const passenger = await this.prisma.passenger.findUnique({
        where: { userId: id },
        include: {
          favoriteLocations: true,
        },
      });

      return {
        ...user,
        passenger,
      };
    }

    // Si es conductor, obtener información adicional
    if (user.role === UserRole.DRIVER) {
      const driver = await this.prisma.driver.findUnique({
        where: { userId: id },
        include: {
          vehicle: true,
        },
      });

      return {
        ...user,
        driver,
      };
    }

    return user;
  }

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException(`Monedero no encontrado para el usuario ${userId}`);
    }

    return wallet;
  }
}