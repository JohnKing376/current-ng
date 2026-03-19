import { PrismaClient } from '../../src/generated/prisma/client';
import allStates from '../models/lgas/statesAndLocaGov.json';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding locations...');

  for (const states of allStates) {
    for (const lga of states.lgas) {
      await prisma.location.upsert({
        where: { lga_state: { lga, state: states.state } },
        update: {},
        create: {
          lga,
          state: states.state,
          lat: Number(states.latitude ?? 0),
          lng: Number(states.longitude ?? 0),
        },
      });
    }
  }

  console.log('Done — all LGAs seeded.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
