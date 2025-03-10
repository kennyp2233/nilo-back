import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class RegisterTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsOptional()
  deviceInfo?: string;
}
