# Backend deployment (Vercel)

Deploy this NestJS backend to Vercel with **Root Directory** set to this folder (`backend`).

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
| `FRONTEND_URL`     | Optional | `https://menu-smart-analyzer.vercel.app` — for QR codes and redirects. |
| `NODE_ENV`         | Optional | `production` |

\* Without `CORS_ORIGINS` including your frontend URL, the browser will block API requests from the deployed frontend.

## Why the function might crash (500 / FUNCTION_INVOCATION_FAILED)

1. **Missing env vars** — If `DATABASE_URL` or `JWT_SECRET` are not set, the app fails at startup. Add them in Vercel and redeploy.
2. **Database not reachable** — `DATABASE_URL` must point to your Supabase PostgreSQL (or another hosted Postgres). Replace `[YOUR-PASSWORD]` with your Supabase database password. Run migrations (`npx prisma migrate deploy`) before or after first deploy.
3. **CORS** — Set `CORS_ORIGINS` to your frontend URL (e.g. `https://menu-smart-analyzer.vercel.app`) so the frontend can call the API.

## Database setup (Supabase)

The project is configured for **PostgreSQL (Supabase)**. For a **fresh** Supabase database, sync the schema once:

```bash
npx prisma db push
```

This creates all tables from your current schema. (Existing migrations in the repo were for MySQL and are not run against PostgreSQL.)

To create proper migrations for PostgreSQL later (e.g. for production history), run `npx prisma migrate dev --name init_postgres` once with `DATABASE_URL` pointing at Supabase.

### If you get P1001 "Can't reach database server"

1. **Add timeout and SSL** — Use `?sslmode=require&connect_timeout=30` at the end of `DATABASE_URL`.
2. **Check the exact URI** — In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **Database**: copy the **Connection string** → **URI** and ensure your `.env` matches (password, no typos).
3. **Try the Connection pooler** — If the direct connection (port 5432) still fails (e.g. firewall), use the **Session** or **Transaction** pooler instead:
   - In Database settings, open **Connection string** and switch to **Session** or **Transaction** mode.
   - Copy the URI (it uses a different host, e.g. `aws-0-XX.pooler.supabase.com`, and port **6543**).
   - For **Transaction** mode, add `?pgbouncer=true&sslmode=require` to the URI so Prisma doesn’t use prepared statements.
4. **Project paused?** — Free-tier projects pause after inactivity; resume the project in the Supabase dashboard.

## After deploying

- Backend URL: `https://menu-mind-ten.vercel.app`
- Health: `https://menu-mind-ten.vercel.app/health`
- API docs: `https://menu-mind-ten.vercel.app/api/docs`
