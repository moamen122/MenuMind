# Backend deployment (Vercel)

Deploy this NestJS backend to Vercel with **Root Directory** set to this folder (`backend`).

---

## Fix 500 / FUNCTION_INVOCATION_FAILED on Vercel

If you see **"This Serverless Function has crashed"** or **Config validation error: "DATABASE_URL" is required. "JWT_SECRET" is required**, add the environment variables in Vercel:

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → select your **backend** project (e.g. menu-mind-ten).
2. Go to **Settings** → **Environment Variables**.
3. Add these variables (for **Production**, and optionally Preview):

   | Name            | Value |
   |-----------------|--------|
   | `DATABASE_URL`  | Your Supabase connection string. Use the **Transaction pooler** URL (port 6543) and add `?pgbouncer=true&sslmode=require` at the end. Example: `postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require` (copy from your local `backend/.env` or Supabase → Connect → Transaction mode). |
   | `JWT_SECRET`    | At least 16 characters (e.g. a long random string). Can be the same as in your local `backend/.env` or a new production secret. |
   | `CORS_ORIGINS`  | `https://menu-smart-analyzer.vercel.app` (your frontend URL so the browser allows API requests). |

4. Click **Save**, then trigger a **redeploy**: Deployments → ⋮ on the latest deployment → **Redeploy**.

After the redeploy, the backend should start and https://menu-mind-ten.vercel.app/health should respond.

---

## Local development (avoid Supabase P1001 / firewall)

Use **Docker Postgres** so you don’t need to reach Supabase from your machine:

1. Start the DB: `docker compose up -d`
2. In `.env`, use: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/menumind`
3. Apply schema: `npx prisma db push`, or run migrations: `npx prisma migrate deploy` (local DB is baselined with one Postgres migration; old MySQL migrations are in `prisma/migrations_mysql_backup`)

Production (Vercel) uses **Supabase** — set `DATABASE_URL` to your Supabase URI in the Vercel project’s environment variables.

## Required environment variables (Vercel project settings)

Set these in your Vercel project → Settings → Environment Variables so the serverless function can start:

| Variable           | Required | Example / notes |
|--------------------|----------|------------------|
| `DATABASE_URL`     | **Yes**  | Supabase (SSL required): `postgresql://postgres:[YOUR-PASSWORD]@db.utoabuwodxpavrndtzsy.supabase.co:5432/postgres?sslmode=require` — replace `[YOUR-PASSWORD]` with your DB password (Supabase → Project Settings → Database). |
| `JWT_SECRET`       | **Yes**  | At least 16 characters. Use a long random string in production. |
| `CORS_ORIGINS`     | Yes*     | `https://menu-smart-analyzer.vercel.app` (your frontend URL). Add multiple origins comma-separated if needed. |
| `PEXELS_API_KEY`   | Optional | Required for **extract-from-image** to return image URLs per item. Get a key at [Pexels API](https://www.pexels.com/api/). If missing, items will have `image: null` in production. |
| `FRONTEND_URL`     | Optional | `https://menu-smart-analyzer.vercel.app` — for QR codes and redirects. |
| `NODE_ENV`         | Optional | `production` |

\* Without `CORS_ORIGINS` including your frontend URL, the browser will block API requests from the deployed frontend.

## Why the function might crash (500 / FUNCTION_INVOCATION_FAILED)

1. **Missing env vars** — If `DATABASE_URL` or `JWT_SECRET` are not set, the app fails at startup. Add them in Vercel and redeploy.
2. **Database not reachable** — `DATABASE_URL` must point to your Supabase PostgreSQL (or another hosted Postgres). Replace `[YOUR-PASSWORD]` with your Supabase database password. Run migrations (`npx prisma migrate deploy`) before or after first deploy.
3. **CORS** — Set `CORS_ORIGINS` to your frontend URL (e.g. `https://menu-smart-analyzer.vercel.app`) so the frontend can call the API.

## Create tables in Supabase

Right now your tables exist only in **local Docker**. To see them in Supabase (and for production/Vercel), apply the schema to Supabase once.

### Option A: From your machine (if Supabase is reachable)

1. In `.env` **temporarily** set:
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_SUPABASE_PASSWORD@db.utoabuwodxpavrndtzsy.supabase.co:5432/postgres?sslmode=require&connect_timeout=30
   ```
2. Run: `npx prisma db push`
3. Switch `.env` back to local: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/menumind`

If you get **P1001** (can’t reach database), use Option B.

### Option B: From Supabase Dashboard (no connection from your PC needed)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Click **New query**.
3. Copy the **entire** contents of  
   `backend/prisma/migrations/20250316000000_baseline_postgres/migration.sql`  
   and paste into the editor.
4. Click **Run** (or Ctrl+Enter).

Your tables (User, Restaurant, Menu, MenuItem, etc.) will appear under **Table Editor**. Run this SQL only once; if you run it again you may get “already exists” errors.

### Test connection and add default user

1. **Test the connection**: In `backend/.env` set `DATABASE_URL` to your Supabase URI (with `?sslmode=require&connect_timeout=30`). Run `npm run db:test` from the backend folder — you should see "Database connection successful".
2. **Add default user and demo data**: Run `npm run db:seed`. This creates **demo@menumind.com** / **demo123** (OWNER), a demo restaurant, menu, and sample items. Use these to log in. Then set `DATABASE_URL` back to local if you use Docker.

### If you get P1001 "Can't reach database server" (from your PC)

**Full guide: [CONNECT-FROM-PC.md](CONNECT-FROM-PC.md)** — use Supabase **Session mode** pooler URI in `DATABASE_URL` (with `?sslmode=require`) to connect from your PC.

Your network may block Supabase’s direct connection. You can still add the default user and use the app:

1. **Add default user via SQL (no connection from your PC)**  
   From the `backend` folder run: `npm run db:seed-sql`  
   Copy the printed SQL and run it in **Supabase → SQL Editor**. That inserts **demo@menumind.com** / **demo123** and a demo restaurant. Then log in from your app; the backend on **Vercel** will connect to Supabase using `DATABASE_URL` set in the Vercel project.

2. **Optional: try the Connection pooler**  
   In Supabase → **Project Settings** → **Database** → **Connection string**, switch to **Transaction** (port 6543) or **Session** mode and copy the URI. Use that as `DATABASE_URL` and add `?pgbouncer=true&sslmode=require` for Transaction mode. Some networks can reach the pooler when direct fails.

3. **Add timeout and SSL** — Use `?sslmode=require&connect_timeout=30` at the end of `DATABASE_URL`.
4. **Project paused?** — Free-tier projects pause after inactivity; resume in the Supabase dashboard.

## After deploying

- Backend URL: `https://menu-mind-ten.vercel.app`
- Health: `https://menu-mind-ten.vercel.app/health`
- API docs: `https://menu-mind-ten.vercel.app/api/docs`

**Run and test:** See [RUN-AND-TEST.md](../RUN-AND-TEST.md) in the repo root for running locally and testing production.
