import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { parse } from 'csv-parse/sync';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const content = fs.readFileSync(
    path.resolve(__dirname, '../models/lgas/Nigeria_Wards_Lat-Long1.csv'),
    'utf-8',
  );

  interface CsvRow {
    ID_0: string;
    Country: string;
    ID_1: string;
    State: string;
    ID_2: string;
    LGA: string;
    ID_3: string;
    Ward: string;
    Latitude: string;
    Longitude: string;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as CsvRow[];

  const seen = new Set<string>();

  for (const row of rows) {
    const key = `${row.LGA}__${row.State}`;
    if (seen.has(key)) continue;
    seen.add(key);

    await prisma.location.upsert({
      where: { lga_state: { lga: row.LGA, state: row.State } },
      update: {},
      create: {
        lga: row.LGA,
        state: row.State,
        lat: parseFloat(row.Latitude),
        lng: parseFloat(row.Longitude),
      },
    });
  }

  console.log('Seeding Complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
