import { Controller, Post, Body, HttpStatus, Ip } from '@nestjs/common';
import { ReportService } from './report.service';
import {
  CreateReportByCoordDto,
  CreateReportByLgaDto,
  ReportOutputSchema,
} from './defs/report.defs';
import { ZodResponse } from 'nestjs-zod';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Report')
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @ApiOperation({
    summary: 'Report status by LGA',
    description:
      'The user IP address is automatically captured for deduplication.',
  })
  @ApiBody({
    type: CreateReportByLgaDto,
    description: 'The properties required to report by an LGA',
  })
  @ZodResponse({
    status: HttpStatus.CREATED,
    type: ReportOutputSchema,
    description: 'Created Report',
  })
  async reportByLga(
    @Body() input: CreateReportByLgaDto,
    @Ip() reportersIp: string,
  ) {
    return await this.reportService.reportByLga(input, reportersIp);
  }

  @Post('/coords')
  @ApiOperation({
    summary: 'Report status by location coordinates',
    description:
      'The user IP address is automatically captured for deduplication.',
  })
  @ApiBody({
    type: CreateReportByCoordDto,
    description: 'The properties required to report by an LGA',
  })
  @ZodResponse({
    status: HttpStatus.CREATED,
    type: ReportOutputSchema,
    description: 'Created Report',
  })
  async reportByCoordinates(
    @Body() input: CreateReportByCoordDto,
    @Ip() reportersIp: string,
  ) {
    return await this.reportService.reportByCoordinates(input, reportersIp);
  }
}
