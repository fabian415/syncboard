# syntax=docker/dockerfile:1

# ---- Stage 1: install workspace deps, build client, generate Prisma client ----
FROM node:20-bookworm-slim AS build
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci

COPY server ./server
COPY client ./client

RUN npm run build -w client
RUN npx prisma generate --schema=server/prisma/schema.prisma
RUN npm prune --omit=dev

# ---- Stage 2: runtime image ----
FROM node:20-bookworm-slim AS runtime
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
COPY version.txt release_notes.txt ./

WORKDIR /app/server
EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3003)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node src/index.js"]
