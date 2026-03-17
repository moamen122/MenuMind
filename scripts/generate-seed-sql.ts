/**
 * Generates SQL to insert the default user (and demo restaurant) for Supabase.
 * Run: npx ts-node scripts/generate-seed-sql.ts
 * Copy the output and run it in Supabase → SQL Editor. No DATABASE_URL needed.
 */
import * as bcrypt from 'bcrypt';

const DEMO_EMAIL = 'demo@menumind.com';
const DEMO_PASSWORD = 'demo123';
const DEMO_USER_ID = 'a0000000-0000-0000-0000-000000000001';
const DEMO_RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_MEMBER_ID = 'b0000000-0000-0000-0000-000000000001';

async function main() {
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
  const escapedHash = hashedPassword.replace(/'/g, "''");

  const sql = `
-- Default user: demo@menumind.com / demo123 (OWNER). Run in Supabase SQL Editor.
INSERT INTO "User" (id, email, password, role, "createdAt", "updatedAt")
VALUES (
  '${DEMO_USER_ID}',
  '${DEMO_EMAIL}',
  '${escapedHash}',
  'OWNER',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role;

INSERT INTO "Restaurant" (id, name, "ownerId", "createdAt", "updatedAt")
VALUES (
  '${DEMO_RESTAURANT_ID}',
  'Demo Bistro',
  '${DEMO_USER_ID}',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "RestaurantMember" (id, "userId", "restaurantId", role, "createdAt")
VALUES (
  '${DEMO_MEMBER_ID}',
  '${DEMO_USER_ID}',
  '${DEMO_RESTAURANT_ID}',
  'OWNER',
  NOW()
)
ON CONFLICT ("userId", "restaurantId") DO NOTHING;
`;

  console.log('-- Copy everything below and run in Supabase → SQL Editor → New query');
  console.log(sql.trim());
  console.log('\n-- Then log in with: ' + DEMO_EMAIL + ' / ' + DEMO_PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
