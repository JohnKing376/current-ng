import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { LocationService } from './location.service';
import {
  LocationStatusResponseDto,
  StatusByCoordinatesDto,
  StatusByLgaQueryDto,
} from './defs/location.defs';
import { ZodResponse } from 'nestjs-zod';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

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
  @ApiQuery({
    name: 'state',
    type: 'string',
    description: 'The state the LGA belongs to',
  })
  @ZodResponse({
    type: LocationStatusResponseDto,
    status: HttpStatus.OK,
    description: 'Get location report with lga',
  })
  async statusByLga(
    @Param('lga') lga: string,
    @Query() query: StatusByLgaQueryDto,
  ) {
    return await this.locationService.getStatusByLga({
      lga,
      state: query.state,
    });
  }
}
