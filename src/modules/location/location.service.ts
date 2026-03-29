import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { PinoLogger } from 'nestjs-pino';
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

  async resolveLocationByCoordinates(input: StatusByCoordinatesInput) {
    const { lat, lng } = input;

    const locations = await this.prisma.location.findMany({
      select: {
        id: true,
        lat: true,
        lng: true,
        lga: true,
        state: true,
      },
    });

    const range = 0.1;

    const nearbyLocations = locations.filter(
      (loc) =>
        Math.abs(loc.lat - lat) < range && Math.abs(loc.lng - lng) < range,
    );

    const candidates = nearbyLocations.length > 0 ? nearbyLocations : locations;

    let closest = candidates[0];

    let minDistance = this.getDistance(lat, lng, closest.lat, closest.lng);

    for (const location of nearbyLocations) {
      const distance = this.getDistance(lat, lng, location.lat, location.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closest = location;
      }
    }

    return closest;
  }

  private getDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }
}
