// src/auth/dto/auth.dto.ts
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, IsPhoneNumber, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber(null, { message: 'El número de teléfono debe ser válido' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(UserRole, { message: 'El rol debe ser PASSENGER, DRIVER o ADMIN' })
  @IsNotEmpty()
  role: UserRole;
}

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

// Se usará para enviar información parcial del usuario logueado
export class JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

// Usado para endpoints que requieren el token JWT
export class JwtAuthGuardDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}