import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './env.js';
import { produtosRoutes } from './routes/produtos.js';

const app = Fastify({ logger: true });

await app.register(sensible);
// Configura CORS dinamicamente: se ALLOWED_ORIGINS fornecido, restringe; caso contrário libera (true)
const allowed = env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean);
await app.register(cors, { origin: allowed && allowed.length ? allowed : true });
await app.register(swagger, { openapi: { info: { title: 'API', version: '0.1.0' } } });
await app.register(swaggerUi, { routePrefix: '/docs' });

await app.register(produtosRoutes, { prefix: '/api' });

app.get('/health', async () => ({ status: 'ok' }));
// Provide namespaced health endpoint for consistency
app.get('/api/health', async () => ({ status: 'ok' }));

// Rota raiz simples para facilitar teste no navegador
app.get('/', async () => ({ name: 'Sabor D Minas API', status: 'ok', docs: '/docs', health: '/health' }));
app.get('/api', async () => ({ name: 'Sabor D Minas API', status: 'ok', docs: '/docs', health: '/api/health' }));

app.listen({ port: env.PORT, host: '0.0.0.0' }).catch(err => {
  app.log.error(err);
  process.exit(1);
});
