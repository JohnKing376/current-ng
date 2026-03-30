import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { LocationModule } from '../location/location.module';
import { ReportController } from './report.controller';

@Module({
  providers: [ReportService],
  imports: [LocationModule],
  controllers: [ReportController],
})
export class ReportModule {}
