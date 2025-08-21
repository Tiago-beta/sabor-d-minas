# Deploy da API

## Opção A - Serviço gerenciado (recomendado)
1. Crie Postgres (Railway / Render / Neon / Supabase / Aiven).
2. Configure DATABASE_URL no painel.
3. Deploy do repositório (GitHub) apontando para pasta `server/`.
4. Rodar comando inicial: `npx prisma migrate deploy && node dist/index.js`.
5. Expor porta (geralmente automático).

## Opção B - VPS Hostinger
1. Provisionar VPS (Ubuntu 22+).
2. Instalar Node LTS e PostgreSQL (ou usar Postgres gerenciado external).
3. Clonar repositório.
4. `cd server` / `npm ci` / `npx prisma migrate deploy`.
5. Instalar PM2: `npm i -g pm2`.
6. `pm2 start dist/index.js --name api-pao`.
7. Configurar Nginx reverse proxy:
```
server {
  server_name api.seu-dominio.com;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```
8. Certbot para HTTPS.

## Opção C - Hospedagem compartilhada
Não recomendada para Node persistente. Use serviço externo para a API.

## Migrações em produção
Use `prisma migrate deploy` (não `dev`).

## Variáveis ambiente obrigatórias
- DATABASE_URL
- PORT (opcional)

## Healthcheck
GET /health -> { status: "ok" }

## Documentação Swagger
/ docs (após subir)
