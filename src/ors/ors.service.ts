import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrsService {
  private readonly ORS_URL: string;
  private readonly API_KEY: string;
  private readonly logger = new Logger(OrsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.ORS_URL = this.configService.get<string>('ORS_URL');
    this.API_KEY = this.configService.get<string>('ORS_API_KEY');
  }

  /**
   * Gets a route between two coordinates
   * @param start [latitude, longitude] coordinates of the starting point
   * @param end [latitude, longitude] coordinates of the ending point
   * @returns Route information from the OpenRouteService API
   */
  async getRoute(start: [number, number], end: [number, number]): Promise<any> {
    // OpenRouteService requires coordinates in [longitude, latitude] order
    const startCoords = `${start[1]},${start[0]}`;  // Convert [lat, lng] to [lng, lat]
    const endCoords = `${end[1]},${end[0]}`;        // Convert [lat, lng] to [lng, lat]

    // Definir el perfil de enrutamiento
    const profile = 'driving-car';

    this.logger.log(`Getting route from [${start[0]}, ${start[1]}] to [${end[0]}, ${end[1]}]`);
    this.logger.log(`Formatted coordinates: start=${startCoords}, end=${endCoords}`);

    try {
      // Use proper URL parameters
      const response = await firstValueFrom(
        this.httpService.get(`${this.ORS_URL}/v2/directions/${profile}`, {
          params: {
            api_key: this.API_KEY,
            start: startCoords,
            end: endCoords,
            radiuses: '500,500', // Increased radius for better point snapping
          },
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting route: ${error.message}`);

      if (error.response) {
        this.logger.error(`Response error details: ${JSON.stringify(error.response.data)}`);
      }

      throw new Error(`Error getting route: ${error.message}`);
    }
  }

  /**
   * Calculates the estimated fare based on the route
   * @param distance Distance in kilometers
   * @param duration Duration in minutes
   * @param basePrice Base price from tariff config
   * @param pricePerKm Price per kilometer from tariff config
   * @param pricePerMinute Price per minute from tariff config
   * @param minimumPrice Minimum price from tariff config
   * @returns Calculated fare
   */
  calculateFare(
    distance: number,
    duration: number,
    basePrice: number,
    pricePerKm: number,
    pricePerMinute: number,
    minimumPrice: number
  ): number {
    const distanceCost = distance * pricePerKm;
    const timeCost = duration * pricePerMinute;
    let fare = basePrice + distanceCost + timeCost;

    // Ensure minimum fare
    if (fare < minimumPrice) {
      fare = minimumPrice;
    }

    // Round to 2 decimal places
    return Math.round(fare * 100) / 100;
  }
}