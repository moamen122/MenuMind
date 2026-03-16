# Backend deployment (Vercel)

Deploy this NestJS backend to Vercel with **Root Directory** set to this folder (`backend`).

## Required environment variables (Vercel project settings)

Set these in your Vercel project → Settings → Environment Variables so the serverless function can start:

| Variable           | Required | Example / notes |
|--------------------|----------|------------------|
| `DATABASE_URL`     | **Yes**  | Supabase: `postgresql://postgres:[YOUR-PASSWORD]@db.utoabuwodxpavrndtzsy.supabase.co:5432/postgres` — replace `[YOUR-PASSWORD]` with your Supabase database password (Project Settings → Database in Supabase dashboard). |
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

## After deploying

- Backend URL: `https://menu-mind-ten.vercel.app`
- Health: `https://menu-mind-ten.vercel.app/health`
- API docs: `https://menu-mind-ten.vercel.app/api/docs`
