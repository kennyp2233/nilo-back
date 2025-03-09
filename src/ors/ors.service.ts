import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrsService {
  private readonly ORS_URL: string;
  private readonly API_KEY: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.ORS_URL = this.configService.get<string>('ORS_URL');
    this.API_KEY = this.configService.get<string>('ORS_API_KEY');
  }

  async getRoute(start: [number, number], end: [number, number]): Promise<any> {
    const url = `${this.ORS_URL}?api_key=${this.API_KEY}&start=${start.join(',')}&end=${end.join(',')}`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data;
    } catch (error) {
      throw new Error(`Error obteniendo la ruta: ${error.message}`);
    }
  }
}
