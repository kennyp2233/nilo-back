import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeocodingModule } from './geocoding/geocoding.module';
import { OrsModule } from './ors/ors.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GeocodingModule,
    OrsModule,
    PrismaModule,
  ],
})
export class AppModule {}