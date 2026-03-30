import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { PinoLogger } from 'nestjs-pino';
import { LocationService } from '../location/location.service';
import type {
  CreateReportByCoordInput,
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

    const outage = await this.evaluateLocationState(location.data.id);

    await this.attachOutageId(report.id, outage.outageId);

    return {
      status,
      source: Source.USER,
      lga: location.data.lga,
      state: location.data.state,
      outageConfirmed: outage.status,
      outageResolved: false,
    };
  }

  async reportByCoordinates(
    input: CreateReportByCoordInput,
    reporterFingerprint: string,
  ): Promise<TReportResponse> {
    const { lat, lng, status } = input;

    const location = await this.locationService.resolveLocationByCoordinates({
      lat,
      lng,
    });

    if (!location) {
      this.logger.error('Location not found', { lat, lng });
      throw new NotFoundException('Location not found');
    }

    await this.checkDuplicateReport(location.id, status, reporterFingerprint);

    const report = await this.createReport(
      location.id,
      status,
      reporterFingerprint,
    );

    const outage = await this.evaluateLocationState(location.id);

    await this.attachOutageId(report.id, outage.outageId);

    return {
      status,
      source: Source.USER,
      lga: location.lga,
      state: location.state,
      outageConfirmed: outage.status,
      outageResolved: false,
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
      return;
    }

    await this.prisma.report.update({
      where: { id: reportId },
      data: { outageEventId: outageId },
    });
  }

  private async getStatusScores(locationId: string) {
    const reports = await this.prisma.report.findMany({
      where: {
        locationId,
        expiresAt: { gte: new Date() },
      },
      select: {
        reporterFingerprint: true,
        trustScore: true,
        status: true,
      },
      orderBy: { reportedAt: 'desc' },
    });

    const uniqueReports = new Map<
      string,
      { trustScore: number; status: Status }
    >();

    for (const r of reports) {
      if (!uniqueReports.has(r.reporterFingerprint)) {
        uniqueReports.set(r.reporterFingerprint, {
          trustScore: r.trustScore,
          status: r.status,
        });
      }
    }

    let offScore = 0;
    let onScore = 0;

    for (const r of uniqueReports.values()) {
      if (r.status === 'OFF') offScore += r.trustScore;
      if (r.status === 'ON') onScore += r.trustScore;
    }

    return { offScore, onScore };
  }

  private getConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= CONFIDENCE_HIGH) {
      return 'HIGH';
    } else if (score >= CONFIDENCE_MEDIUM) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  private async evaluateLocationState(locationId: string) {
    const { offScore, onScore } = await this.getStatusScores(locationId);

    const existingOutage = await this.prisma.outageEvent.findFirst({
      where: { locationId, resolvedAt: null },
      select: { id: true },
    });

    if (offScore >= OUTAGE_THRESHOLD && offScore > onScore) {
      if (existingOutage) {
        return { outageId: existingOutage.id, status: true };
      }

      const outage = await this.prisma.outageEvent.create({
        data: {
          locationId,
          confidence: this.getConfidenceLevel(offScore),
          reportsCount: offScore,
        },
        select: { id: true },
      });

      return { outageId: outage.id, status: true };
    }

    if (onScore >= OUTAGE_THRESHOLD && onScore > offScore) {
      if (existingOutage) {
        await this.prisma.outageEvent.update({
          where: { id: existingOutage.id },
          data: { resolvedAt: new Date() },
        });

        return { outageId: null, status: false };
      }

      return { outageId: null, status: false };
    }

    return existingOutage
      ? { outageId: existingOutage.id, status: true }
      : { outageId: null, status: false };
  }
}
