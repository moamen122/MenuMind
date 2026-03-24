# MenuMind Backend

NestJS API for the MenuMind restaurant menu platform: auth, menus, analytics, AI-assisted extraction, and QR flows. Uses **Prisma** with **PostgreSQL**.

## Prerequisites

- **Node.js** 20+ (22 recommended)
- **npm**
- **PostgreSQL** locally, or **Docker** to run the database (and optionally the whole stack)

## Quick start (recommended for development)

Run the API on your machine against a local Postgres.

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Environment

Copy the example env file and edit values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL URL. With Docker Postgres below: `postgresql://postgres:postgres@localhost:5432/menumind` |
| `DIRECT_URL` | Yes | Same as `DATABASE_URL` for local Docker; for Supabase use a direct URL for migrations (see `.env.example`) |
| `JWT_SECRET` | Yes | Long random string (min 16 characters) |
| `JWT_REFRESH_SECRET` | No | Defaults to `JWT_SECRET` if omitted |
| `PORT` | No | Default `3000` |
| `CORS_ORIGINS` | Yes for browser apps | Comma-separated origins, e.g. `http://localhost:5173,http://localhost:8080` |
| `OPENAI_API_KEY` | No | Menu extraction; optional |
| `FRONTEND_URL` / `QR_MENU_BASE_URL` | No | Used for QR and redirects in production |

### 3. Start PostgreSQL (Docker)

From the `backend` folder:

```bash
docker compose up -d
```

Wait until Postgres is healthy (a few seconds). Default credentials: user `postgres`, password `postgres`, database `menumind`, port **5432**.

### 4. Database schema and seed

```bash
npx prisma migrate deploy
npm run db:seed
```

`db:seed` is optional; it adds demo data (see `prisma/LOCAL-DATABASE.md`).

### 5. Run the API

```bash
npm run start:dev
```

- **Swagger:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Health:** `GET http://localhost:3000/health`

---

## Full stack with Docker (Postgres + API + frontend)

If this repo sits next to the frontend repo as **`menu-smart-analyzer`** (sibling folder), you can run everything from `backend`:

```bash
docker compose -f docker-compose.dev.yml up --build
```

- **Frontend:** [http://localhost:8080](http://localhost:8080) (nginx serving the Vite build)
- **API:** [http://localhost:3000](http://localhost:3000)
- **Postgres:** `localhost:5432`

**First time:** with Postgres reachable on `localhost:5432`, apply migrations from your machine (the API image does not run Prisma CLI in production):

```bash
npx prisma migrate deploy
npm run db:seed
```

Then restart or start the stack again if the API was failing before migrations.

| Compose file | Purpose |
|--------------|---------|
| `docker-compose.yml` | **PostgreSQL only** — `docker compose up -d` |
| `docker-compose.dev.yml` | **Includes** the file above **plus** `api` and `frontend` services |

---

## Production build

```bash
npm run build
npm run start:prod
```

Docker image: build with `Dockerfile` in this directory (used by `docker-compose.dev.yml` for `api`).

---

## Tech stack

- NestJS, Prisma, PostgreSQL  
- Helmet, CORS, Throttler, class-validator, JWT (access + refresh)

## Project structure (overview)

```
src/
├── config/
├── common/
├── modules/          # auth, users, restaurants, menus, menu-items, ai, qr, …
└── ...
```

## Auth (summary)

JWT access and refresh tokens. Main routes: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`. Protect routes with `JwtAuthGuard` (and optional role guards).

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Dev server with watch |
| `npm run build` | Production build |
| `npm run start:prod` | Run compiled `dist/main.js` |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:studio` | Prisma Studio |
| `npm run db:seed` | Seed demo data |

More database notes: `prisma/LOCAL-DATABASE.md`.
