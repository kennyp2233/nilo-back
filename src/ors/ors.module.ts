import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config'; // Importar ConfigModule
import { OrsService } from './ors.service';
import { OrsController } from './ors.controller';

@Module({
    imports: [
        HttpModule,
        ConfigModule, // Asegura que ConfigService esté disponible en este módulo
    ],
    controllers: [OrsController],
    providers: [OrsService],
    exports: [OrsService], // Exportar si se usa en otro módulo
})
export class OrsModule { }
