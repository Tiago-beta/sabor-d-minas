###############################
# Build stage
###############################
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install system deps (openssl for Prisma, ca-certificates)
RUN apt-get update && apt-get install -y --no-install-recommends \
	openssl ca-certificates && \
	rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
# Configure npm for more robust network handling and leverage cache. Retry loop reduces transient failures (exit code 146).
RUN npm set fetch-retries=5 \
	&& npm set fetch-retry-factor=2 \
	&& npm set fetch-retry-mintimeout=20000 \
	&& npm set fetch-retry-maxtimeout=120000 \
	&& npm set registry=https://registry.npmjs.org/ \
	&& for i in 1 2 3; do npm ci --legacy-peer-deps && break || (echo "npm ci failed attempt $i, retrying..." && sleep 8); done

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build
# Remove dev dependencies to shrink final image
RUN npm prune --omit=dev

###############################
# Runtime stage
###############################
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
	openssl ca-certificates && \
	rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

EXPOSE 3001
CMD ["sh","-c","npx prisma migrate deploy && node dist/index.js"]
