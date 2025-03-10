// src/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterTokenDto } from './dto/register-token.dto';

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Registra un nuevo token de notificación para un usuario
     */
    async registerToken(userId: string, registerTokenDto: RegisterTokenDto) {
        const { token, deviceInfo } = registerTokenDto;

        // Verificar si el usuario existe
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        // Verificar si el token ya existe
        const existingToken = await this.prisma.notificationToken.findFirst({
            where: {
                token,
            },
        });

        // Si el token existe y pertenece a otro usuario, actualizar el propietario
        if (existingToken && existingToken.userId !== userId) {
            return this.prisma.notificationToken.update({
                where: { id: existingToken.id },
                data: {
                    userId,
                    deviceInfo,
                    isActive: true,
                },
            });
        }

        // Si el token existe y pertenece al mismo usuario, activarlo si está inactivo
        if (existingToken && existingToken.userId === userId) {
            if (!existingToken.isActive) {
                return this.prisma.notificationToken.update({
                    where: { id: existingToken.id },
                    data: {
                        deviceInfo,
                        isActive: true,
                    },
                });
            }
            return existingToken;
        }

        // Si el token no existe, crear uno nuevo
        return this.prisma.notificationToken.create({
            data: {
                userId,
                token,
                deviceInfo,
            },
        });
    }

    /**
     * Desactiva un token de notificación
     */
    async deactivateToken(userId: string, token: string) {
        const notificationToken = await this.prisma.notificationToken.findFirst({
            where: {
                token,
                userId,
            },
        });

        if (!notificationToken) {
            throw new NotFoundException('Token de notificación no encontrado');
        }

        return this.prisma.notificationToken.update({
            where: { id: notificationToken.id },
            data: {
                isActive: false,
            },
        });
    }

    /**
     * Obtiene todos los tokens activos de un usuario
     */
    async getUserTokens(userId: string) {
        return this.prisma.notificationToken.findMany({
            where: {
                userId,
                isActive: true,
            },
        });
    }

    /**
     * Envía una notificación a un usuario específico
     * Este método sería el punto de integración con un servicio de notificaciones como Firebase
     */
    async sendNotificationToUser(userId: string, title: string, body: string, data?: Record<string, any>) {
        // Obtener todos los tokens activos del usuario
        const tokens = await this.getUserTokens(userId);

        if (tokens.length === 0) {
            return {
                success: false,
                message: 'El usuario no tiene tokens de notificación activos',
            };
        }

        // Aquí iría la lógica para enviar la notificación utilizando un servicio externo
        // Por ejemplo, Firebase Cloud Messaging (FCM)

        // Simulación de envío exitoso para desarrollo
        return {
            success: true,
            message: `Notificación enviada a ${tokens.length} dispositivos`,
            tokensCount: tokens.length,
        };
    }
}