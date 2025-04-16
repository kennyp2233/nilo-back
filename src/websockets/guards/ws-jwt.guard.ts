// src/websockets/guards/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
    private readonly logger = new Logger(WsJwtGuard.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient();
            const data = context.switchToWs().getData();

            // Get token from data or handshake query
            const token = data.token || client.handshake.query.token;

            if (!token) {
                throw new WsException('Token not provided');
            }

            // Verify token
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get<string>('JWT_SECRET'),
            });

            // Attach user to client for later use
            client['user'] = payload;
            return true;
        } catch (error) {
            this.logger.error(`WS authentication failed: ${error.message}`);
            throw new WsException('Unauthorized');
        }
    }
}