import { Controller, Get, Query } from '@nestjs/common';
import { OrsService } from './ors.service';

@Controller('ors')
export class OrsController {
  constructor(private readonly orsService: OrsService) {}

  @Get('route')
  async getRoute(
    @Query('start') start: string,
    @Query('end') end: string
  ): Promise<any> {
    const startCoords = start.split(',').map(Number) as [number, number];
    const endCoords = end.split(',').map(Number) as [number, number];

    return this.orsService.getRoute(startCoords, endCoords);
  }
}
