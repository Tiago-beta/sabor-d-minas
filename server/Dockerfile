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
RUN npm ci --legacy-peer-deps

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
