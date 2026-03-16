-- DropColumn: Run AFTER prisma/scripts/migrate-menu-items-to-sizes.ts has populated MenuItemSize.
-- If you have existing MenuItem rows, run: npx ts-node prisma/scripts/migrate-menu-items-to-sizes.ts
ALTER TABLE `MenuItem` DROP COLUMN `price`, DROP COLUMN `size`;
