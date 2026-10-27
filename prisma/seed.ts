import { PrismaClient } from '@prisma/client';
import { seedPrisma } from '../apps/api/src/shared/db/prisma';

const prisma = new PrismaClient();

async function main() {
  const wipe = process.argv.includes('--reset');
  await seedPrisma(prisma, { wipe });
  const products = await prisma.product.count();
  const users = await prisma.user.count();
  console.log(`Seed tamamlandı. ${users} kullanıcı, ${products} ürün.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
