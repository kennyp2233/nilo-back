import { Controller, Get, Query, UseGuards, ValidationPipe, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GeocodingService } from './geocoding.service';
import { SearchAddressDto, ReverseGeocodeDto } from './interfaces/geocoding.interface';

@Controller('geocoding')
@UseGuards(ThrottlerGuard)
export class GeocodingController {
    private readonly logger = new Logger(GeocodingController.name);

    constructor(private readonly geocodingService: GeocodingService) { }

    @Get('search')
    async searchAddress(@Query(ValidationPipe) searchDto: SearchAddressDto) {
        this.logger.log(`Búsqueda de dirección: ${searchDto.query}`);
        return this.geocodingService.searchAddress(searchDto);
    }

    @Get('reverse')
    async reverseGeocode(@Query(ValidationPipe) reverseDto: ReverseGeocodeDto) {
        this.logger.log(`Geocodificación inversa para: ${reverseDto.latitude}, ${reverseDto.longitude}`);
        return this.geocodingService.reverseGeocode(reverseDto);
    }
}