FROM node:20-alpine AS base
WORKDIR /app

# Instalar dependências (incluindo dev) para compilar TypeScript
COPY package.json package-lock.json* ./
ENV NODE_ENV=development
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh","-c","(npx prisma migrate deploy || npx prisma db push) && node dist/index.js"]
