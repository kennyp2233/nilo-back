// src/users/dto/update-user.dto.ts
import { IsEmail, IsString, IsOptional, IsPhoneNumber } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber(null, { message: 'El número de teléfono debe ser válido' })
  phone?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;
}