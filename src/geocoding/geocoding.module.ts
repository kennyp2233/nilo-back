// src/geocoding/geocoding.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { GeocodingService } from './geocoding.service';
import { GeocodingController } from './geocoding.controller';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
    imports: [
        HttpModule,
        ConfigModule,
        CacheModule.register({
            ttl: 86400, // Cache for 24 hours
            max: 1000,  // Maximum number of items in cache
        }),
        ThrottlerModule.forRoot([{
            ttl: 1000,  // Time window (1 second)
            limit: 1,   // Request limit per time window
        }]),
    ],
    providers: [GeocodingService],
    controllers: [GeocodingController],
    exports: [GeocodingService],
})
export class GeocodingModule { }