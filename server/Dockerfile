###############################
# syntax directive enables newer BuildKit features (if enabled)
###############################
# syntax=docker/dockerfile:1.7

###############################
# Stage 1: deps (npm install + prisma generate) — cached while package.json unchanged
###############################
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Faster & more reliable apt (force IPv4 + mirror switch) kept in an early layer
RUN echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4 \
	&& if [ -f /etc/apt/sources.list ]; then sed -i 's|deb.debian.org|mirror.azure.edge.kernel.org|g' /etc/apt/sources.list; else echo 'deb http://mirror.azure.edge.kernel.org/debian bookworm main\ndeb http://mirror.azure.edge.kernel.org/debian bookworm-updates main\ndeb http://mirror.azure.edge.kernel.org/debian-security bookworm-security main' > /etc/apt/sources.list; fi \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm set fetch-retries=5 \
		&& npm set fetch-retry-factor=2 \
		&& npm set fetch-retry-mintimeout=20000 \
		&& npm set fetch-retry-maxtimeout=120000 \
		&& npm ci --legacy-peer-deps

COPY prisma ./prisma
RUN npx prisma generate

###############################
# Stage 2: build (only app source changes invalidate)
###############################
FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/package.json ./
COPY --from=deps /app/package-lock.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm run build \
	&& npm prune --omit=dev

###############################
# Stage 3: runtime (smallest final image)
###############################
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# System deps only (match what build artifacts need)
RUN echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4 \
	&& if [ -f /etc/apt/sources.list ]; then sed -i 's|deb.debian.org|mirror.azure.edge.kernel.org|g' /etc/apt/sources.list; else echo 'deb http://mirror.azure.edge.kernel.org/debian bookworm main\ndeb http://mirror.azure.edge.kernel.org/debian bookworm-updates main\ndeb http://mirror.azure.edge.kernel.org/debian-security bookworm-security main' > /etc/apt/sources.list; fi \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

EXPOSE 3001
CMD ["sh","-c","npx prisma migrate deploy && node dist/index.js"]
