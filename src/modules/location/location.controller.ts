import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { LocationService } from './location.service';
import {
  LocationStatusResponseDto,
  StatusByCoordinatesDto,
} from './defs/location.defs';
import { ZodResponse } from 'nestjs-zod';
import { ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('Location')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  @ZodResponse({
    type: LocationStatusResponseDto,
    status: HttpStatus.OK,
    description: 'Get location report with coordinates',
  })
  async statusByCoordinates(@Query() query: StatusByCoordinatesDto) {
    return await this.locationService.getStatusByCoordinates(query);
  }

  @Get(':lga')
  @ApiParam({ name: 'lga', type: 'string', description: 'The name of the LGA' })
  @ZodResponse({
    type: LocationStatusResponseDto,
    status: HttpStatus.OK,
    description: 'Get location report with lga',
  })
  async statusByLga(@Param('lga') lga: string) {
    return await this.locationService.getStatusByLga({ lga });
  }
}
