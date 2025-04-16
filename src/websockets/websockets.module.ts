// src/websockets/websockets.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TripsGateway } from './trips.gateway';
import { TripsModule } from '../trips/trips.module';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
    imports: [
        TripsModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
                },
            }),
        }),
    ],
    providers: [TripsGateway, WsJwtGuard],
    exports: [TripsGateway],
})
export class WebsocketsModule { }