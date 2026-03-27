import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { LocationModule } from '../location/location.module';

@Module({
  providers: [ReportService],
  imports: [LocationModule],
})
export class ReportModule {}
