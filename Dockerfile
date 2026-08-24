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
# Deep Dive PPTX->slide-image conversion (server/src/deepDive/pptxConverter.js):
# the actual LibreOffice conversion runs in the separate `unoserver` sidecar
# container (docker/unoserver/Dockerfile) so this image doesn't carry its
# ~300-500MB footprint. This image only needs the lightweight `unoconvert`
# client (talks to the sidecar over the compose network — no local `uno`/
# LibreOffice install needed for the client side) plus poppler-utils to
# rasterize the PDF the sidecar returns into per-slide PNGs.
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl poppler-utils python3-pip \
  && rm -rf /var/lib/apt/lists/* \
  && pip install --break-system-packages --no-cache-dir unoserver
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
