
// src/seeder/seeder.module.ts
import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        PrismaModule,
        ConfigModule.forRoot(),
    ],
    providers: [SeederService],
    exports: [SeederService],
})
export class SeederModule { }