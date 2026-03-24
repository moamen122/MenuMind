# NestJS + Prisma — build TypeScript, run with Node (PostgreSQL required at runtime)
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# prisma generate only needs placeholder URLs (no DB connection)
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV DIRECT_URL="postgresql://build:build@localhost:5432/build"

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# --- runtime ---
FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma/
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
CMD ["node", "dist/main.js"]
