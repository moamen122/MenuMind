# Connect to Supabase from your PC

If `npm run db:test` fails with **P1001 (Can't reach database server)**, your PC or network likely cannot reach Supabase’s **direct** connection. Supabase’s direct URL (`db.xxx.supabase.co:5432`) is **IPv6-only** by default; many home/office networks are **IPv4-only**, so the connection fails.

Use the **Session mode pooler** instead: it supports IPv4 and is reachable from most PCs.

---

## Step 1: Check reachability (optional)

From the `backend` folder:

```bash
npm run db:check-reachability
```

- If **TCP: OK** → the host is reachable; the issue may be SSL or credentials (e.g. add `?sslmode=require` to `DATABASE_URL`).
- If **TCP: FAILED** → use the Session pooler (Step 2).

---

## Step 2: Get the Session pooler URI from Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Click **Connect** (top right).
3. Under **Connection string**, choose **Session mode** (not “Direct” or “Transaction”).
4. Copy the **URI**. It will look like:
   ```text
   postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
   ```
   So the host is `aws-0-...pooler.supabase.com` (not `db....supabase.co`).

---

## Step 3: Set DATABASE_URL in .env

In `backend/.env` set:

- **Session mode (port 5432):** add `?sslmode=require`
- **Transaction mode (port 6543):** add `?pgbouncer=true&sslmode=require` — required so Prisma does not use prepared statements (avoids "prepared statement already exists" during seed).

Example (Transaction mode, port 6543):

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
```

Replace the URI with what you copied from the dashboard; keep the `?pgbouncer=true&sslmode=require` (or `&pgbouncer=true&sslmode=require` if the URI already has `?`).

---

## Step 4: Create tables and test

**Option A – Fast (recommended): create tables in Supabase SQL Editor**

1. Open **Supabase Dashboard** → your project → **SQL Editor** → **New query**.
2. Open this file in your repo and copy its **entire** contents:  
   `backend/prisma/migrations/20250316000000_baseline_postgres/migration.sql`
3. Paste into the SQL Editor and click **Run**. Tables are created on Supabase’s side (usually a few seconds).

**Option B – From your PC (slower over the network)**

From the `backend` folder run once: `npx prisma db push` (can be slow when connecting through the pooler).

---

Then continue:

1. **Test the connection:**
   ```bash
   npm run db:test
   ```
   You should see: **Database connection successful**.

3. **Add the default user and demo data:**
   ```bash
   npm run db:seed
   ```
   Creates **demo@menumind.com** / **demo123** and demo restaurant, menu, and items.

---

## If you still get P1001

1. **Windows Firewall**  
   Allow Node.js (or your terminal) outbound to port **5432** (and **6543** if you try Transaction mode later).

2. **Corporate/VPN**  
   Some networks block outbound PostgreSQL. Try another network (e.g. mobile hotspot) or use the SQL workaround: `npm run db:seed-sql` and run the printed SQL in Supabase → SQL Editor.

3. **Transaction mode (port 6543)**  
   In Connect, you can try **Transaction** mode and use that URI. For Prisma you must append `?pgbouncer=true&sslmode=require` (or `&pgbouncer=true&sslmode=require` if the URI already has `?`). Session mode is usually the one that works from PCs.

---

## Local Docker vs Supabase

- **Local dev:** Use Docker: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/menumind` and `docker compose up -d`.
- **Supabase from PC:** Use the Session pooler URI in `.env` as above when you want to run `db:test` or `db:seed` against Supabase.
- **Vercel/production:** Set the same Supabase URI (direct or pooler) in the Vercel project’s `DATABASE_URL`; the server can reach Supabase.
