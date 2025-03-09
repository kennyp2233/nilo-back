import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeocodingModule } from './geocoding/geocoding.module';
import { OrsModule } from './ors/ors.module';

@Module({
  imports: [
    ConfigModule.forRoot(), // Carga las variables de entorno
    GeocodingModule,
    OrsModule, // Solo importa el módulo, no repitas providers ni controllers
  ],
})
export class AppModule { }
