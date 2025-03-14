import { Controller, Get, Query, Logger } from '@nestjs/common';
import { OrsService } from './ors.service';

@Controller('ors')
export class OrsController {
  private readonly logger = new Logger(OrsController.name);

  constructor(private readonly orsService: OrsService) { }

  @Get('route')
  async getRoute(
    @Query('start') start: string,
    @Query('end') end: string
  ): Promise<any> {
    this.logger.log(`Calculando ruta desde: ${start} hasta: ${end}`);
    const startCoords = start.split(',').map(Number) as [number, number];
    const endCoords = end.split(',').map(Number) as [number, number];

    return this.orsService.getRoute(startCoords, endCoords);
  }
}
