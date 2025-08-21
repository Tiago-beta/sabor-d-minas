import { config } from 'dotenv';
import { z } from 'zod';
config();

const schema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().regex(/^[0-9]+$/).transform(Number).default('3001')
});

export const env = schema.parse(process.env);
