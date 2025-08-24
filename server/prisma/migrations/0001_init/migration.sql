-- Initial migration: create core domain tables
-- This was crafted manually to reflect schema.prisma

CREATE TABLE "Produto" (
  "id" TEXT PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "preco" NUMERIC(10,2) NOT NULL,
  "sku" TEXT UNIQUE,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE "Cliente" (
  "id" TEXT PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "telefone" TEXT UNIQUE,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE "Venda" (
  "id" TEXT PRIMARY KEY,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "clienteId" TEXT,
  "total" NUMERIC(10,2) NOT NULL,
  CONSTRAINT "Venda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "VendaItem" (
  "id" TEXT PRIMARY KEY,
  "vendaId" TEXT NOT NULL,
  "produtoId" TEXT NOT NULL,
  "quantidade" INTEGER NOT NULL,
  "precoUnit" NUMERIC(10,2) NOT NULL,
  "subtotal" NUMERIC(10,2) NOT NULL,
  CONSTRAINT "VendaItem_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VendaItem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Helpful indexes for relations (optional but good practice)
CREATE INDEX "idx_venda_clienteId" ON "Venda"("clienteId");
CREATE INDEX "idx_vendaitem_vendaId" ON "VendaItem"("vendaId");
CREATE INDEX "idx_vendaitem_produtoId" ON "VendaItem"("produtoId");

-- Trigger to auto-update updatedAt columns (Prisma @updatedAt also does this application-side, this is defensive)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."atualizadoEm" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_produto
BEFORE UPDATE ON "Produto"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_cliente
BEFORE UPDATE ON "Cliente"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_venda
BEFORE UPDATE ON "Venda"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Done.