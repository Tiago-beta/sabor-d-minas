import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { listProdutos, createProduto } from '../domain/produtos.service.js';

export async function produtosRoutes(app: FastifyInstance) {
  app.get('/produtos', async () => {
    return await listProdutos();
  });

  app.post('/produtos', async (req, reply) => {
    const bodySchema = z.object({ nome: z.string().min(1), preco: z.number().nonnegative(), sku: z.string().optional() });
    const parse = bodySchema.safeParse((req as any).body);
    if (!parse.success) {
      return reply.code(400).send({ error: parse.error.flatten() });
    }
    const created = await createProduto(parse.data);
    return reply.code(201).send(created);
  });
}
