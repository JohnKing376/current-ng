import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import type { PinoLogger } from 'nestjs-pino';
import { LocationService } from '../location/location.service';
import type {
  CreateReportByLgaInputSchema,
  TReportResponse,
} from './defs/report.defs';
import { Source, Status } from '@generated/prisma/enums';

type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

const REPORT_EXPIRY_MS = 7 * 60 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const OUTAGE_THRESHOLD = 5;
const CONFIDENCE_HIGH = 15;
const CONFIDENCE_MEDIUM = 10;

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
    private readonly locationService: LocationService,
  ) {
    this.logger.setContext(ReportService.name);
  }

  async reportByLga(
    input: CreateReportByLgaInputSchema,
    reporterFingerprint: string,
  ): Promise<TReportResponse> {
    const { lga, state, status } = input;

    const location = await this.locationService.getStatusByLga({ lga, state });
    if (!location) {
      this.logger.error('Location not found', { lga, state });
      throw new NotFoundException('Location not found');
    }

    await this.checkDuplicateReport(
      location.data.id,
      status,
      reporterFingerprint,
    );

    const report = await this.createReport(
      location.data.id,
      status,
      reporterFingerprint,
    );

    const outage = await this.checkIfOutageConfirmed(location.data.id);

    await this.attachOutageId(report.id, outage.outageId);

    return {
      status,
      source: Source.USER,
      lga: location.data.lga,
      state: location.data.state,
      outageConfirmed: outage.status,
    };
  }

  private async checkDuplicateReport(
    locationId: string,
    status: Status,
    reporterFingerprint: string,
  ) {
    const recentReport = await this.prisma.report.findFirst({
      where: {
        locationId,
        status,
        reporterFingerprint,
        reportedAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
      },
    });

    if (recentReport) {
      this.logger.error('Duplicate report by user', {
        reporterFingerprint,
        locationId,
        status,
      });
      throw new BadRequestException('Duplicate report');
    }
  }

  private async createReport(
    locationId: string,
    status: Status,
    reporterFingerprint: string,
  ) {
    const report = await this.prisma.report.create({
      data: {
        locationId,
        status,
        source: Source.USER,
        expiresAt: new Date(Date.now() + REPORT_EXPIRY_MS),
        reporterFingerprint,
      },
    });
    this.logger.info('Report created for user', {
      reporterFingerprint,
      locationId,
    });
    return report;
  }

  private async attachOutageId(reportId: string, outageId: string | null) {
    if (!outageId) {
      this.logger.error(`outageId not found for report: ${reportId}`);
      throw new NotFoundException('outageId not found');
    }

    await this.prisma.report.update({
      where: { id: reportId },
      data: { outageEventId: outageId },
    });
  }

  private async confidenceEngine(locationId: string): Promise<ConfidenceLevel> {
    const reports = await this.prisma.report.findMany({
      where: { locationId, status: 'OFF', expiresAt: { gte: new Date() } },
      select: { reporterFingerprint: true, trustScore: true },
      orderBy: { reportedAt: 'desc' },
    });

    const uniqueScores = new Map<string, number>();
    for (const r of reports) {
      if (!uniqueScores.has(r.reporterFingerprint))
        uniqueScores.set(r.reporterFingerprint, r.trustScore);
    }

    const totalTrust = [...uniqueScores.values()].reduce(
      (sum, s) => sum + s,
      0,
    );

    if (totalTrust >= CONFIDENCE_HIGH) {
      return 'HIGH';
    } else if (totalTrust >= CONFIDENCE_MEDIUM) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  private async checkIfOutageConfirmed(locationId: string) {
    const activeReports = await this.prisma.report.findMany({
      where: { locationId, status: 'OFF', expiresAt: { gt: new Date() } },
      select: { reporterFingerprint: true },
    });

    const uniqueReporterCount = new Set(
      activeReports.map((r) => r.reporterFingerprint),
    ).size;

    const existingOutage = await this.prisma.outageEvent.findFirst({
      where: { locationId, resolvedAt: null },
      select: { id: true },
    });

    if (uniqueReporterCount >= OUTAGE_THRESHOLD) {
      if (existingOutage) return { outageId: existingOutage.id, status: true };

      const confidence = await this.confidenceEngine(locationId);
      const outage = await this.prisma.outageEvent.create({
        data: { locationId, confidence, reportsCount: uniqueReporterCount },
        select: { id: true },
      });

      return { outageId: outage.id, status: true };
    }

    return existingOutage
      ? { outageId: existingOutage.id, status: true }
      : { outageId: null, status: false };
  }
}
