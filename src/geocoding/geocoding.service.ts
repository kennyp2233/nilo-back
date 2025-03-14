import { Injectable, Inject, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpService } from '@nestjs/axios';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { 
    SearchAddressDto, 
    GeocodingResult, 
    ReverseGeocodeDto, 
    NominatimResponse 
} from './interfaces/geocoding.interface';

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

    /**
     * Search for addresses based on a query
     */
    async searchAddress(searchDto: SearchAddressDto): Promise<GeocodingResult[]> {
        const { query, limit = 5, countryCode = 'EC' } = searchDto;
        const cacheKey = `geocoding:search:${query}:${limit}:${countryCode}`;

        try {
            // Try to get from cache first
            const cached = await this.cacheManager.get<GeocodingResult[]>(cacheKey);
            if (cached) {
                this.logger.debug(`Cache hit for query: ${query}`);
                return cached;
            }

            // Call Nominatim API
            const response = await firstValueFrom(
                this.httpService.get<NominatimResponse[]>(`${this.baseUrl}/search`, {
                    params: {
                        q: query,
                        format: 'json',
                        limit,
                        countrycodes: countryCode,
                        addressdetails: 1,
                    },
                    headers: {
                        'User-Agent': this.userAgent,
                    },
                })
            );

            // Transform response to our format
            const results = this.processSearchResults(response.data);

            // Cache results (24 hours)
            await this.cacheManager.set(cacheKey, results, 86400000);

            return results;
        } catch (error) {
            this.handleApiError(error, `Error searching address: ${query}`);
        }
    }

    /**
     * Reverse geocode a location from latitude and longitude
     */
    async reverseGeocode(reverseDto: ReverseGeocodeDto): Promise<GeocodingResult> {
        const { latitude, longitude } = reverseDto;
        const cacheKey = `geocoding:reverse:${latitude}:${longitude}`;

        try {
            // Try to get from cache first
            const cached = await this.cacheManager.get<GeocodingResult>(cacheKey);
            if (cached) {
                this.logger.debug(`Cache hit for reverse geocoding: ${latitude}, ${longitude}`);
                return cached;
            }

            // Call Nominatim API
            const response = await firstValueFrom(
                this.httpService.get<NominatimResponse>(`${this.baseUrl}/reverse`, {
                    params: {
                        lat: latitude,
                        lon: longitude,
                        format: 'json',
                        addressdetails: 1,
                        zoom: 18, // Higher zoom level for more detailed results
                    },
                    headers: {
                        'User-Agent': this.userAgent,
                    },
                })
            );

            // Transform response to our format
            const result = this.mapNominatimResponse(response.data);
            
            // Cache result (24 hours)
            await this.cacheManager.set(cacheKey, result, 86400000);

            return result;
        } catch (error) {
            this.handleApiError(error, `Error reverse geocoding: ${latitude}, ${longitude}`);
        }
    }

    /**
     * Process search results and filter out invalid or duplicate results
     */
    private processSearchResults(responses: NominatimResponse[]): GeocodingResult[] {
        // Map responses to our format
        const results = responses.map(this.mapNominatimResponse);
        
        // Filter out results without required data
        return results.filter(result => 
            result.latitude && 
            result.longitude && 
            result.displayName
        );
    }

    /**
     * Map Nominatim response to our GeocodingResult format
     */
    private mapNominatimResponse(response: NominatimResponse): GeocodingResult {
        const displayName = response.display_name || '';
        const nameComponents = displayName.split(',');
        
        return {
            id: response.place_id.toString(),
            name: nameComponents[0]?.trim() || displayName.substring(0, 30),
            displayName: displayName,
            latitude: parseFloat(response.lat),
            longitude: parseFloat(response.lon),
            type: response.type,
            address: {
                road: response.address?.road,
                city: response.address?.city || response.address?.town || response.address?.village,
                state: response.address?.state,
                country: response.address?.country,
                postcode: response.address?.postcode,
            },
            boundingBox: response.boundingbox ? {
                minLat: parseFloat(response.boundingbox[0]),
                maxLat: parseFloat(response.boundingbox[1]),
                minLon: parseFloat(response.boundingbox[2]),
                maxLon: parseFloat(response.boundingbox[3]),
            } : undefined,
        };
    }

    /**
     * Handle API errors
     */
    private handleApiError(error: any, message: string): never {
        this.logger.error(`${message}: ${error.message}`, error.stack);
        
        if (error instanceof AxiosError) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                this.logger.error(`API response error: ${JSON.stringify(error.response.data)}`);
                
                if (error.response.status === 400) {
                    throw new BadRequestException('Invalid geocoding request');
                }
                
                if (error.response.status === 429) {
                    throw new ServiceUnavailableException('Too many requests, please try again later');
                }
            } else if (error.request) {
                // The request was made but no response was received
                throw new ServiceUnavailableException('Geocoding service is not responding');
            }
        }
        
        // Generic error
        throw new ServiceUnavailableException('Geocoding service error');
    }
}