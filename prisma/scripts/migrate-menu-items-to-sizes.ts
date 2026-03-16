/**
 * One-time migration: for each MenuItem that has price/size, create MenuItemSize record(s).
 * Run after applying the migration that adds MenuItemSize table, and before applying the migration that drops price/size.
 *
 * Usage: npx ts-node prisma/scripts/migrate-menu-items-to-sizes.ts
 * Or:    npx tsx prisma/scripts/migrate-menu-items-to-sizes.ts
 *
 * Note: If MenuItem no longer has price/size in the schema, this script uses raw SQL to read them.
 */
require('dotenv').config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Row = { id: string; price: number; size: string | null };

async function main() {
  // Use raw query in case schema already dropped price/size (e.g. after running this once)
  const items = await prisma.$queryRaw<Row[]>`
    SELECT id, CAST(price AS DECIMAL(10,2)) as price, size
    FROM MenuItem
    WHERE deletedAt IS NULL
  `;

  let created = 0;
  for (const item of items) {
    const sizeName = (item.size && String(item.size).trim()) || 'Regular';
    await prisma.menuItemSize.create({
      data: {
        menuItemId: item.id,
        name: sizeName,
        price: item.price,
        sortOrder: 0,
      },
    });
    created++;
  }
  console.log(`Created ${created} MenuItemSize records for ${items.length} menu items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
