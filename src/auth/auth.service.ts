// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, phone, password, firstName, lastName, role } = registerDto;

    // Verificar si ya existe un usuario con el mismo email o teléfono
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        existingUser.email === email
          ? 'Este correo electrónico ya está registrado'
          : 'Este número de teléfono ya está registrado'
      );
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    // Crear usuario en una transacción
    const result = await this.prisma.$transaction(async (prisma) => {
      // Crear usuario
      const user = await prisma.user.create({
        data: {
          email,
          phone,
          passwordHash,
          firstName,
          lastName,
          role,
        },
      });

      // Crear perfil según el rol
      if (role === UserRole.PASSENGER) {
        await prisma.passenger.create({
          data: {
            userId: user.id,
          },
        });
      } else if (role === UserRole.DRIVER) {
        await prisma.driver.create({
          data: {
            userId: user.id,
            licenseNumber: '', // Requiere ser completado más adelante
            licenseExpiryDate: new Date(), // Fecha provisional
          },
        });
      }

      // Crear wallet para el usuario
      await prisma.wallet.create({
        data: {
          userId: user.id,
        },
      });

      return user;
    });

    // Generar token
    const token = this.generateToken(result.id, result.email, result.role);

    return {
      user: {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        role: result.role,
      },
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar usuario por email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Actualizar último login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generar token
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    };
  }

  generateToken(userId: string, email: string, role: UserRole): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: string): Promise<any> {
    return this.usersService.findById(userId);
  }
}