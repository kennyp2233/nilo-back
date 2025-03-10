// src/notifications/dto/send-notification.dto.ts
import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendNotificationDto {
    @IsUUID()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    body: string;

    @IsObject()
    @IsOptional()
    data?: Record<string, any>;
}