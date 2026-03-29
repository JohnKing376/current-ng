import { z } from 'zod';
import { Status } from '@generated/prisma/enums';
import { createZodDto } from 'nestjs-zod';
import { ReportSchema } from 'generated/schemas/models';

const CreateReportByLgaInputSchemaZ = z.object({
  status: z.enum(Status),
  lga: z.string().min(1).max(30),
  state: z.string().min(1).max(30),
});

const CreateReportByCoordInputSchemaZ = z.object({
  status: z.enum(Status),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});

const ReportOutputSchemaZ = ReportSchema.omit({
  id: true,
  outageEventId: true,
  reporterFingerprint: true,
  trustScore: true,
  locationId: true,
  reportedAt: true,
  expiresAt: true,
});

const CreateReportOutputSchema = ReportOutputSchemaZ.extend({
  outageConfirmed: z.boolean().default(false),
  lga: z.string(),
  state: z.string(),
});

export class ReportOutputSchema extends createZodDto(
  CreateReportOutputSchema,
) {}

export type TReportResponse = z.infer<typeof CreateReportOutputSchema>;

export class CreateReportByLgaDto extends createZodDto(
  CreateReportByLgaInputSchemaZ,
) {}

export class CreateReportByCoord extends createZodDto(
  CreateReportByCoordInputSchemaZ,
) {}

export type CreateReportOutput = z.infer<typeof CreateReportOutputSchema>;

export type CreateReportByLgaInputSchema = z.infer<
  typeof CreateReportByLgaInputSchemaZ
>;

export type CreateReportByCoordInput = z.infer<
  typeof CreateReportByCoordInputSchemaZ
>;
