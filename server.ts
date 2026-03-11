import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import analyzeRouter from './server/routes/analyze.js';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 8080;

  app.use(express.json());
  app.use('/api/analyze', analyzeRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
