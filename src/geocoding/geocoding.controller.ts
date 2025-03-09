// src/geocoding/geocoding.controller.ts
import { Controller, Get, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GeocodingService } from './geocoding.service';
import { SearchAddressDto, ReverseGeocodeDto } from './interfaces/geocoding.interface';

@Controller('geocoding')
@UseGuards(ThrottlerGuard)
export class GeocodingController {
    constructor(private readonly geocodingService: GeocodingService) { }

    @Get('search')
    async searchAddress(@Query(ValidationPipe) searchDto: SearchAddressDto) {
        return this.geocodingService.searchAddress(searchDto);
    }

    @Get('reverse')
    async reverseGeocode(@Query(ValidationPipe) reverseDto: ReverseGeocodeDto) {
        return this.geocodingService.reverseGeocode(reverseDto);
    }
}