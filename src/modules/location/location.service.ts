import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import type {
  StatusByCoordinatesInput,
  StatusByLgaInput,
} from './defs/location.defs';

@Injectable()
export class LocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(LocationService.name);
  }

  async getStatusByLga(input: StatusByLgaInput) {
    const { lga, state } = input;

    const location = await this.prisma.location.findUnique({
      where: { lga_state: { lga, state } },
      include: {
        outageEvents: {
          where: { resolvedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!location) {
      this.logger.error('LGA not found', {
        lga,
        state,
      });
      throw new NotFoundException(`LGA "${lga}" in state "${state}" not found`);
    }

    return {
      data: location,
    };
  }

  async getStatusByCoordinates(input: StatusByCoordinatesInput) {
    const { lng, lat } = input;

    const location = await this.prisma.location.findFirst({
      where: {
        lng,
        lat,
      },
      include: {
        outageEvents: {
          where: {
            resolvedAt: null,
          },
          orderBy: {
            startedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!location) {
      this.logger.error('Location not found', {
        lng,
        lat,
      });
      throw new NotFoundException(
        `coordinates with latitude: ${lat} and longitude ${lng} not found`,
      );
    }

    return {
      data: location,
    };
  }
}
