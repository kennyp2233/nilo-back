import { Controller, Get, Query, UseGuards, ValidationPipe, Logger, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GeocodingService } from './geocoding.service';
import { SearchAddressDto, ReverseGeocodeDto, GeocodingResult } from './interfaces/geocoding.interface';
import { Public } from '../auth/decorators/public.decorator';

@Controller('geocoding')
@UseGuards(ThrottlerGuard)
export class GeocodingController {
    private readonly logger = new Logger(GeocodingController.name);

    constructor(private readonly geocodingService: GeocodingService) { }

    /**
     * Search for addresses based on a query string
     */
    @Public() // Make this endpoint public (no auth required)
    @Get('search')
    @HttpCode(HttpStatus.OK)
    async searchAddress(@Query(ValidationPipe) searchDto: SearchAddressDto): Promise<GeocodingResult[]> {
        try {
            this.logger.log(`Searching address: ${searchDto.query}`);

            if (!searchDto.query || searchDto.query.trim().length < 3) {
                throw new BadRequestException('Query must be at least 3 characters long');
            }

            // Default to Ecuador if not specified
            if (!searchDto.countryCode) {
                searchDto.countryCode = 'EC';
            }

            // Limit results to a reasonable number
            if (!searchDto.limit || searchDto.limit > 10) {
                searchDto.limit = 5;
            }

            return await this.geocodingService.searchAddress(searchDto);
        } catch (error) {
            this.logger.error(`Error searching address: ${error.message}`);
            throw error;
        }
    }

    /**
     * Reverse geocode a location from latitude and longitude
     */
    @Public() // Make this endpoint public (no auth required)
    @Get('reverse')
    @HttpCode(HttpStatus.OK)
    async reverseGeocode(@Query(ValidationPipe) reverseDto: ReverseGeocodeDto): Promise<GeocodingResult> {
        try {
            this.logger.log(`Reverse geocoding for: ${reverseDto.latitude}, ${reverseDto.longitude}`);

            // Validate coordinates
            if (reverseDto.latitude < -90 || reverseDto.latitude > 90) {
                throw new BadRequestException('Latitude must be between -90 and 90');
            }

            if (reverseDto.longitude < -180 || reverseDto.longitude > 180) {
                throw new BadRequestException('Longitude must be between -180 and 180');
            }

            return await this.geocodingService.reverseGeocode(reverseDto);
        } catch (error) {
            this.logger.error(`Error reverse geocoding: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get route between two points
     */
    @Public() // Make this endpoint public (no auth required)
    @Get('route')
    @HttpCode(HttpStatus.OK)
    async getRoute(
        @Query('startLat') startLat: string,
        @Query('startLng') startLng: string,
        @Query('endLat') endLat: string,
        @Query('endLng') endLng: string
    ): Promise<any> {
        try {
            // Validate and parse coordinates
            const startLatNum = parseFloat(startLat);
            const startLngNum = parseFloat(startLng);
            const endLatNum = parseFloat(endLat);
            const endLngNum = parseFloat(endLng);

            if (isNaN(startLatNum) || isNaN(startLngNum) || isNaN(endLatNum) || isNaN(endLngNum)) {
                throw new BadRequestException('Coordinates must be valid numbers');
            }

            this.logger.log(`Getting route from [${startLatNum}, ${startLngNum}] to [${endLatNum}, ${endLngNum}]`);

            // Here we would call our fixed ORS service
            // This is just a placeholder - you'll need to integrate with your actual route service
            return {
                success: true,
                message: 'Route found successfully',
                distance: 10.5, // km
                duration: 15,   // minutes
                polyline: 'encoded_polyline_data_here'
            };
        } catch (error) {
            this.logger.error(`Error getting route: ${error.message}`);
            throw error;
        }
    }
}