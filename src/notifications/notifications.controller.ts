// src/notifications/notifications.controller.ts
import { Controller, Post, Body, Delete, Param, Get, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Post('token')
    registerToken(
        @GetUser('id') userId: string,
        @Body() registerTokenDto: RegisterTokenDto,
    ) {
        return this.notificationsService.registerToken(userId, registerTokenDto);
    }

    @Delete('token/:token')
    deactivateToken(
        @GetUser('id') userId: string,
        @Param('token') token: string,
    ) {
        return this.notificationsService.deactivateToken(userId, token);
    }

    @Get('tokens')
    getUserTokens(@GetUser('id') userId: string) {
        return this.notificationsService.getUserTokens(userId);
    }

    @Post('send')
    @Roles(UserRole.ADMIN)
    sendNotification(@Body() sendNotificationDto: SendNotificationDto) {
        const { userId, title, body, data } = sendNotificationDto;
        return this.notificationsService.sendNotificationToUser(userId, title, body, data);
    }
}