// src/users/users.controller.ts
import { Controller, Get, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@GetUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  updateProfile(@GetUser('id') userId: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(userId, updateUserDto);
  }

  @Get('wallet')
  getWallet(@GetUser('id') userId: string) {
    return this.usersService.getWallet(userId);
  }

  // Solo los administradores pueden ver todos los usuarios
  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    // Implementar en el futuro para listar todos los usuarios con paginación
  }

  // Solo los administradores pueden ver usuarios específicos por ID
  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}