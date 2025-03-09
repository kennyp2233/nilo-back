// src/config/env.validation.ts
import { plainToClass } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

enum Environment {
    Development = 'development',
    Production = 'production',
    Test = 'test',
}

class EnvironmentVariables {
    @IsEnum(Environment)
    NODE_ENV: Environment;

    @IsNumber()
    @IsOptional()
    PORT: number = 3000;

    @IsString()
    @IsNotEmpty()
    DATABASE_URL: string;

    @IsString()
    @IsNotEmpty()
    JWT_SECRET: string;

    @IsString()
    @IsOptional()
    JWT_EXPIRES_IN: string = '24h';

    @IsString()
    @IsNotEmpty()
    ORS_URL: string;

    @IsString()
    @IsNotEmpty()
    ORS_API_KEY: string;

    @IsString()
    @IsOptional()
    APP_VERSION: string = '1.0';
}

export function validate(config: Record<string, unknown>) {
    const validatedConfig = plainToClass(
        EnvironmentVariables,
        config,
        { enableImplicitConversion: true },
    );

    const errors = validateSync(validatedConfig, {
        skipMissingProperties: false,
    });

    if (errors.length > 0) {
        throw new Error(errors.toString());
    }

    return validatedConfig;
}