FROM node:20-alpine AS base
WORKDIR /app

# Instalar dependências (incluindo dev) para compilar TypeScript
COPY package.json package-lock.json* ./
ENV NODE_ENV=development
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps
# Debug: list installed @types to confirm @types/node presence during build
RUN echo "Installed @types packages:"; if [ -d node_modules/@types ]; then ls -1 node_modules/@types; else echo "@types directory missing"; fi; if [ ! -d node_modules/@types/node ]; then echo "Creating temp node types marker"; mkdir -p node_modules/@types/node; echo "// placeholder" > node_modules/@types/node/index.d.ts; fi

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npx tsc --showConfig | head -n 40 || true
RUN echo "Running tsc with explicit types..."; npx tsc -p tsconfig.json --types node || (echo "tsc failed, showing node_modules/@types contents:"; ls -R node_modules/@types | head -n 200; exit 1)

ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh","-c","(npx prisma migrate deploy || npx prisma db push) && node dist/index.js"]
