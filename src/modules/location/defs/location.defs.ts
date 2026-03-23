import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { LocationSchema, OutageEventSchema } from '@generated/schemas/models';

const StatusByCoordinatesInputZ = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});
export type StatusByCoordinatesInput = z.infer<
  typeof StatusByCoordinatesInputZ
>;
export class StatusByCoordinatesDto extends createZodDto(
  StatusByCoordinatesInputZ,
) {}

const StatusByLgaInputZ = z.object({
  lga: z.string(),
  state: z.string(),
});

export type StatusByLgaInput = z.infer<typeof StatusByLgaInputZ>;

export class StatusByLgaQueryDto extends createZodDto(
  StatusByLgaInputZ.omit({
    lga: true,
  }),
) {}

const OutageEventPublicZ = OutageEventSchema.omit({
  id: true,
  locationId: true,
  notified: true,
}).extend({
  startedAt: z.coerce.string(),
  resolvedAt: z.coerce.string(),
});

const LocationStatusZ = LocationSchema.extend({
  outageEvents: z.array(OutageEventPublicZ),
}).omit({
  id: true,
  createdAt: true,
  lat: true,
  lng: true,
  populationDensity: true,
});

export class LocationStatusResponse extends createZodDto(
  z.object({
    data: LocationStatusZ,
  }),
) {}
