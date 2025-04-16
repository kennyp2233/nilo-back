// src/trips/trips.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripCreatorService } from './services/trip-creator.service';
import { TripFinderService } from './services/trip-finder.service';
import { TripUpdaterService } from './services/trip-updater.service';
import { TripRatingService } from './services/trip-rating.service';
import { TripLocationService } from './services/trip-location.service';
import { TripStatusValidator } from './utils/trip-status-validator';
import { TripsController } from './trips.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { OrsModule } from '../ors/ors.module';
import { WebsocketsModule } from '../websockets/websockets.module';

@Module({
  imports: [
    PrismaModule,
    GeocodingModule,
    OrsModule,
    forwardRef(() => WebsocketsModule), // Usar forwardRef para romper la dependencia circular
  ],
  controllers: [TripsController],
  providers: [
    TripsService,
    TripCreatorService,
    TripFinderService,
    TripUpdaterService,
    TripRatingService,
    TripLocationService,
    TripStatusValidator
  ],
  exports: [TripsService],
})
export class TripsModule { }