# New local database – create schema and deploy

Use this when you have a **new local PostgreSQL** (e.g. Docker or local install) and want to create the schema and optional seed data.

## 1. Set `.env` to your local database

In `backend/.env` set both URLs to your local Postgres (same value for local):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/menumind
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/menumind
```

- Replace `postgres:postgres` with your DB user and password if different.
- Replace `menumind` with your database name if different.
- Ensure the database exists (create it if needed: `CREATE DATABASE menumind;`).

## 2. Create schema (run migrations)

From the **backend** folder (use **npx** so Prisma runs from the project):

```bash
npx prisma migrate deploy
```

This applies all migrations and creates all tables (User, Restaurant, Menu, MenuItem, etc.).

**Alternative – push schema without migration history:**

If you prefer to sync the current Prisma schema without using migration files:

```bash
npx prisma db push
```

Use this only for local dev; for production stick to `migrate deploy`.

## 3. (Optional) Add demo user and data

To log in with **demo@menumind.com** / **demo123** and have a demo restaurant and menu:

```bash
npm run db:seed
```

## 4. Generate Prisma client (if needed)

If you get errors about missing client:

```bash
npx prisma generate
```

## Summary

```bash
cd backend
# 1. Ensure .env has DATABASE_URL and DIRECT_URL pointing to your local Postgres
npx prisma migrate deploy
npm run db:seed
npm run start:dev
```

Then open the app and log in with **demo@menumind.com** / **demo123**.
