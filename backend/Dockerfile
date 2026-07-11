FROM node:20-alpine AS base
WORKDIR /app

# Install deps first (cache layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm install -D typescript tsx && npx tsc

# ── Production image ──────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma

EXPOSE 8000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
