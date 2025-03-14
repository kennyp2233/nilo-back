// src/geocoding/geocoding.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpService } from '@nestjs/axios';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { SearchAddressDto, GeocodingResult, ReverseGeocodeDto, NominatimResponse } from './interfaces/geocoding.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeocodingService {
    private readonly logger = new Logger(GeocodingService.name);
    private readonly baseUrl = 'https://nominatim.openstreetmap.org';
    private readonly userAgent: string;

    constructor(
        private readonly httpService: HttpService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private configService: ConfigService,
    ) {
        this.userAgent = `NILO-App/${this.configService.get('APP_VERSION', '1.0')}`;
    }

    async searchAddress(searchDto: SearchAddressDto): Promise<GeocodingResult[]> {
        const { query, limit = 5, countryCode = 'EC' } = searchDto; // 🇪🇨 Forzar Ecuador como país por defecto
        const cacheKey = `geocoding:${query}:${limit}:${countryCode}`;

        // Try to get from cache first
        const cached = await this.cacheManager.get<GeocodingResult[]>(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit for query: ${query}`);
            return cached;
        }

        try {
            const response = await firstValueFrom(
                this.httpService.get<NominatimResponse[]>(`${this.baseUrl}/search`, {
                    params: {
                        q: query,
                        format: 'json',
                        limit,
                        countrycodes: countryCode, // 🇪🇨 Restringe la búsqueda a Ecuador
                        addressdetails: 1,
                    },
                    headers: {
                        'User-Agent': this.userAgent,
                    },
                })
            );

            const results = response.data.map(this.mapNominatimResponse);

            // Cache results
            await this.cacheManager.set(cacheKey, results, 86400);

            return results;
        } catch (error) {
            this.logger.error(`Error searching address: ${error.message}`, error.stack);
            throw error;
        }
    }


    async reverseGeocode(reverseDto: ReverseGeocodeDto): Promise<GeocodingResult> {
        const { latitude, longitude } = reverseDto;
        const cacheKey = `reverse:${latitude}:${longitude}`;

        // Try to get from cache first
        const cached = await this.cacheManager.get<GeocodingResult>(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const response = await firstValueFrom(
                this.httpService.get<NominatimResponse>(`${this.baseUrl}/reverse`, {
                    params: {
                        lat: latitude,
                        lon: longitude,
                        format: 'json',
                        addressdetails: 1,
                    },
                    headers: {
                        'User-Agent': this.userAgent,
                    },
                })
            );

            const result = this.mapNominatimResponse(response.data);
            this.logger.debug(`Reverse geocoding result: ${JSON.stringify(result)}`);
            // Cache result
            await this.cacheManager.set(cacheKey, result, 86400);

            return result;
        } catch (error) {
            this.logger.error(`Error reverse geocoding: ${error.message}`, error.stack);
            throw error;
        }
    }

    private mapNominatimResponse(response: NominatimResponse): GeocodingResult {
        return {
            id: response.place_id,
            name: response.display_name.split(',')[0],
            displayName: response.display_name,
            latitude: parseFloat(response.lat),
            longitude: parseFloat(response.lon),
            type: response.type,
            address: {
                road: response.address.road,
                city: response.address.city,
                state: response.address.state,
                country: response.address.country,
                postcode: response.address.postcode,
            },
            boundingBox: response.boundingbox ? {
                minLat: parseFloat(response.boundingbox[0]),
                maxLat: parseFloat(response.boundingbox[1]),
                minLon: parseFloat(response.boundingbox[2]),
                maxLon: parseFloat(response.boundingbox[3]),
            } : undefined,
        };
    }
}