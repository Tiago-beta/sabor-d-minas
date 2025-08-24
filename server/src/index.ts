import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './env.js';
import { produtosRoutes } from './routes/produtos';

const app = Fastify({ logger: true });

await app.register(sensible);
await app.register(cors, { origin: true });
await app.register(swagger, { openapi: { info: { title: 'API', version: '0.1.0' } } });
await app.register(swaggerUi, { routePrefix: '/docs' });

await app.register(produtosRoutes, { prefix: '/api' });

app.get('/health', async () => ({ status: 'ok' }));

app.listen({ port: env.PORT, host: '0.0.0.0' }).catch(err => {
  app.log.error(err);
  process.exit(1);
});
