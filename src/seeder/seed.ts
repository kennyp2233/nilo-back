// src/seeder/seed.ts
import { NestFactory } from '@nestjs/core';
import { SeederModule } from './seeder.module';
import { SeederService } from './seeder.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const logger = new Logger('Seeder');

    try {
        logger.log('Iniciando la aplicación para sembrar datos...');

        const app = await NestFactory.createApplicationContext(SeederModule);
        const seederService = app.get(SeederService);

        logger.log('Ejecutando seeder...');
        await seederService.seed();

        await app.close();
        logger.log('Seeding completado exitosamente');
        process.exit(0);
    } catch (error) {
        logger.error(`Error durante el seeding: ${error.message}`, error.stack);
        process.exit(1);
    }
}

bootstrap();