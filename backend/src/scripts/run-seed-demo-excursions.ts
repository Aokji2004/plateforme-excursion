import { prisma } from "../db";
import { ensureDemoExcursions } from "../seedDemoExcursions";

ensureDemoExcursions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
