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

  async getRoute(start: [number, number], end: [number, number]): Promise<any> {
    // Asegurar que las coordenadas estén en el orden correcto [longitud, latitud]
    const startCoords = `${start[0]},${start[1]}`;
    const endCoords = `${end[0]},${end[1]}`;

    // Definir el perfil de enrutamiento
    const profile = 'driving-car';

    // URL con los parámetros adecuados
    const url = `${this.ORS_URL}/v2/directions/${profile}?api_key=${this.API_KEY}&start=${startCoords}&end=${endCoords}&radiuses=1000,1000`;

    this.logger.log(`Obteniendo ruta desde: ${startCoords} hasta: ${endCoords}`);
    this.logger.log(`URL generada: ${url}`);

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data;
    } catch (error) {
      this.logger.error(`Error obteniendo la ruta: ${error.message}`);
      this.logger.error(`Detalles del error: ${JSON.stringify(error.response?.data || error)}`);

      throw new Error(`Error obteniendo la ruta: ${error.message}`);
    }
  }
}
