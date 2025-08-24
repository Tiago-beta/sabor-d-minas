import 'dotenv/config';
import { z } from 'zod';

// Esquema de validação das variáveis de ambiente.
const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL ausente'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production')
});

export const env = schema.parse(process.env);
