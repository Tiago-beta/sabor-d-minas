# Backend (API) - Plano Inicial

Este diretório conterá a API Node.js que irá substituir as coleções em memória do front.

## Stack sugerida
- Node.js + Fastify (rápido e simples) ou Express (mais comum). Aqui usaremos Fastify.
- Prisma ORM para Postgres.
- Dotenv para variáveis ambiente.
- Zod para validação.
- JWT para autenticação futura (pode começar sem auth).

## Estrutura proposta
```
server/
  prisma/
    schema.prisma
  src/
    index.ts            # bootstrap
    env.ts              # validação de variáveis
    db.ts               # cliente prisma
    routes/
      produtos.ts
      clientes.ts
      vendas.ts
    domain/
      produtos.service.ts
      vendas.service.ts
    utils/
      httpErrors.ts
  package.json
```

## Passos de implementação
1. Criar `package.json` no diretório `server` e instalar dependências.
2. Definir `schema.prisma` com tabelas iniciais: Produto, Cliente, Venda, VendaItem.
3. Rodar `npx prisma migrate dev` para gerar migrações (local) e depois aplicar em produção.
4. Implementar rotas CRUD básicas.
5. Ajustar frontend para chamar a API em vez das coleções em memória (transição gradual via feature flag).

## Próximas tabelas
- Kits / KitItem
- Consignacao / ConsignacaoItem
- Recebimento / RecebimentoItem
- PontoFuncionario, Adiantamento, etc.

## Deploy na Hostinger
Hostinger (planos compartilhados) geralmente não mantém processos Node permanentes. Opções:
1. Migrar para VPS Hostinger (melhor controle) rodando Node + PM2.
2. Usar serviço gerenciado (Railway, Render, Fly.io) para a API e manter o front estático na Hostinger.
3. Container Docker em VPS.

Se você só tem hospedagem compartilhada (PHP), recomendo opção 2.

## Ambiente
Criar `.env` dentro de `server/` com:
```
DATABASE_URL="postgresql://usuario:senha@host:5432/nome_db?schema=public"
PORT=3001
NODE_ENV=development
```

---
Podemos iniciar criando os arquivos básicos agora. Diga se prefere Fastify ou Express e se já possui um Postgres criado na Hostinger.
