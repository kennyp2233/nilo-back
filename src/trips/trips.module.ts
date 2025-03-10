// src/trips/trips.module.ts
import { Module } from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { OrsModule } from '../ors/ors.module';

@Module({
  imports: [
    PrismaModule,
    GeocodingModule,
    OrsModule,
  ],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule { }