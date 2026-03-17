# Supabase connection strings (fix "Tenant or user not found")

Supabase uses **two different URL formats**. Using the wrong one causes **"FATAL: Tenant or user not found"**.

**Important:** `DIRECT_URL` and `DATABASE_URL` must point to the **same Supabase project**. Use the project ref from your Supabase dashboard (Connection string → Direct: host is `db.<PROJECT_REF>.supabase.co`).

## 1. Direct connection (port 5432) — use for **DIRECT_URL** and migrations

- **Host:** `db.<PROJECT_REF>.supabase.co`
- **Port:** `5432`
- **User:** `postgres` (just `postgres`, no project ref)
- **Password:** your database password (Supabase → Project Settings → Database)

Example:

```env
DIRECT_URL="postgresql://postgres:YOUR_DB_PASSWORD@db.utoabuwodxpavrndtzsy.supabase.co:5432/postgres?sslmode=require"
```

Where to get it: Supabase Dashboard → **Project Settings** → **Database** → **Connection string** → choose **URI** and **Direct connection** (not Transaction/Session). Copy and replace the password.

---

## 2. Pooler / Transaction mode (port 6543) — use for **DATABASE_URL** (app runtime)

- **Host:** `aws-1-eu-central-1.pooler.supabase.com` (or your region)
- **Port:** `6543`
- **User:** `postgres.<PROJECT_REF>` (e.g. `postgres.utoabuwodxpavrndtzsy`) — **required**, not just `postgres`
- **Password:** same database password

Example:

```env
DATABASE_URL="postgresql://postgres.utoabuwodxpavrndtzsy:YOUR_DB_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
```

Where to get it: Supabase → **Project Settings** → **Database** → **Connection string** → **Transaction** (or Session) → copy URI and add `?pgbouncer=true&sslmode=require` if missing.

---

## Summary

| Variable       | Use for        | Port | Username format      |
|----------------|----------------|------|----------------------|
| **DIRECT_URL** | Migrations     | 5432 | `postgres`           |
| **DATABASE_URL** | App runtime  | 6543 | `postgres.PROJECT_REF` |

**"Tenant or user not found"** usually means:

- You used **DATABASE_URL** (pooler) with username `postgres` → change to `postgres.<PROJECT_REF>`.
- Or you used **DIRECT_URL** (direct) with username `postgres.PROJECT_REF` → change to `postgres`.
- Or **DIRECT_URL** uses a different project ref than **DATABASE_URL** → use the same project’s direct host in DIRECT_URL.

---

## "Not IPv4 compatible" (Direct connection)

In the dashboard, Supabase may show **"Not IPv4 compatible"** for the direct connection. If your network is IPv4-only, the direct URL may fail (timeout or unreachable).

**Option 1 – Session pooler for migrations:** Use the **Session** pooler URL as `DIRECT_URL` (not Transaction). Session mode works with Prisma’s prepared statements, so migrations can run. In Supabase: Connection string → **Session** (not Direct) → copy URI and add `?sslmode=require`. Use that for `DIRECT_URL` (username will be `postgres.<PROJECT_REF>`).

**Option 2 – IPv4 add-on:** Purchase the IPv4 add-on in Supabase so the direct connection is reachable from IPv4.

After fixing, run again:

```bash
npx prisma migrate deploy
```
