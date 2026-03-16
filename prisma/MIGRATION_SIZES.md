# Menu item sizes migration

The schema now uses `MenuItemSize` for prices (one item can have multiple sizes). `MenuItem` no longer has `price` or `size` columns.

## Steps (if your DB still has `MenuItem.price` and `MenuItem.size`)

1. **Apply the migration that adds `MenuItemSize`** (if not already applied):

   ```bash
   npx prisma migrate deploy
   ```

   This applies `20260308190915_add_menu_item_sizes_table`.

2. **Populate `MenuItemSize` from existing data** (run once):

   ```bash
   npx ts-node prisma/scripts/migrate-menu-items-to-sizes.ts
   ```

   Or with tsx: `npx tsx prisma/scripts/migrate-menu-items-to-sizes.ts`

3. **Apply the migration that drops `price` and `size` from `MenuItem`** (required for saving new menus):
   ```bash
   npx prisma migrate deploy
   ```
   This applies `20260308200000_drop_menuitem_price_size`. After this, creating menus with items will work (prices go in `MenuItemSize` only).

If you see "Null constraint violation on price" when saving a menu, run step 2 then step 3.
