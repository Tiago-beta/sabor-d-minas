import { prisma } from '../db';
import { Decimal } from '@prisma/client/runtime/library';

export async function listProdutos() {
  return prisma.produto.findMany({ orderBy: { criadoEm: 'desc' } });
}

export async function createProduto(data: { nome: string; preco: number; sku?: string | null; }) {
  return prisma.produto.create({ data: { nome: data.nome, preco: new Decimal(data.preco), sku: data.sku ?? null } });
}
