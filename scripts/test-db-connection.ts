/**
 * Test database connection. Run with DATABASE_URL set to your target DB (e.g. Supabase).
 * Usage: npx ts-node scripts/test-db-connection.ts
 */
require('dotenv').config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw<[{ current_database: string }]>`
      SELECT current_database() as "current_database"
    `;
    const dbName = result[0]?.current_database ?? 'unknown';
    console.log('✅ Database connection successful.');
    console.log('   Database:', dbName);
    const userCount = await prisma.user.count();
    console.log('   Users in DB:', userCount);
  } catch (err) {
    console.error('❌ Database connection failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
