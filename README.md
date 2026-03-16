# MenuMind Backend

NestJS backend for the MenuMind restaurant menu analytics platform. Clean Architecture (modular monolith) with Prisma + MariaDB.

## Tech Stack

- **Framework:** NestJS
- **Database:** MariaDB
- **ORM:** Prisma
- **Security:** Helmet, CORS, rate limiting (Throttler), global validation (class-validator), JWT auth with refresh tokens

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` – MariaDB connection string (e.g. `mysql://user:password@localhost:3306/menumind`)
   - `JWT_SECRET` – Min 16 characters (required for JWT access/refresh tokens)
   - `JWT_REFRESH_SECRET` – Optional; defaults to `JWT_SECRET` if not set
   - `PORT` – Server port (default 3000)
   - `OPENAI_API_KEY` – Optional, for AI features later
   - `CORS_ORIGINS` – Optional, comma-separated origins (e.g. `http://localhost:5173`)

3. **Database**

   ```bash
   npx prisma generate
   npx prisma migrate dev   # creates DB and runs migrations
   ```

4. **Run**

   ```bash
   npm run start:dev
   ```

   Health: `GET http://localhost:3000/health`  
   API docs: `http://localhost:3000/api/docs` (Swagger)

## Project Structure (Clean Architecture)

```
src/
├── config/                 # App configuration & env validation
├── common/                  # Guards, interceptors, filters, middlewares
├── domain/                  # Entities, repository interfaces (ports)
├── application/            # Services, use cases
├── infrastructure/         # Database (Prisma), external services
│   └── database/           # PrismaService, DatabaseModule (global)
├── interfaces/             # Controllers, DTOs
└── modules/                # Feature modules (auth, users, restaurants, menus, …)
    ├── auth/
    ├── users/
    ├── restaurants/
    ├── menus/
    ├── menu-items/
    ├── ingredients/
    ├── analytics/
    ├── ai/
    └── qr/
```

## Auth

JWT-based auth with access (15 min) and refresh (7 days) tokens. Refresh tokens are stored hashed in the `RefreshToken` table.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register (body: `email`, `password`) |
| `/auth/login` | POST | Login (body: `email`, `password`) |
| `/auth/refresh` | POST | New tokens (body: `refreshToken`) |
| `/auth/logout` | POST | Invalidate refresh token(s); requires Bearer token |
| `/auth/me` | GET | Current user; requires Bearer token |

**Protecting routes:** use `@UseGuards(JwtAuthGuard)` and optionally `@Roles('admin', 'owner', 'staff')` with `@UseGuards(JwtAuthGuard, RolesGuard)`. Get current user with `@CurrentUser() user: RequestUser`.

## Scripts

| Script            | Description              |
|-------------------|--------------------------|
| `npm run start:dev` | Start with watch mode  |
| `npm run build`     | Build for production   |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate`  | Run migrations        |
| `npm run prisma:studio`   | Open Prisma Studio    |
