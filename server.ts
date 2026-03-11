import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import analyzeRouter from './server/routes/analyze.js';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(rootDir, 'dist');
const distAssetsDir = path.join(distDir, 'assets');
const distIndexPath = path.join(distDir, 'index.html');

function countAssetFiles(directoryPath: string) {
  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile()).length;
}

function validateProductionArtifacts() {
  if (!fs.existsSync(distDir)) {
    throw new Error(`Thiếu thư mục build production tại ${distDir}`);
  }

  if (!fs.existsSync(distIndexPath)) {
    throw new Error(`Thiếu file index production tại ${distIndexPath}`);
  }

  if (!fs.existsSync(distAssetsDir)) {
    throw new Error(`Thiếu thư mục asset production tại ${distAssetsDir}`);
  }

  const assetFileCount = countAssetFiles(distAssetsDir);

  if (assetFileCount === 0) {
    throw new Error(`Không tìm thấy asset build nào trong ${distAssetsDir}`);
  }

  return assetFileCount;
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 8080;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());
  app.use('/api/analyze', analyzeRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const assetFileCount = validateProductionArtifacts();
    app.set('etag', false);

    console.info(
      `[startup] mode=production dist=${distDir} index=${distIndexPath} assets=${assetFileCount}`,
    );

    const sendIndex = (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(distIndexPath, {
        lastModified: false,
      });
    };

    app.get('/', sendIndex);
    app.get('/index.html', sendIndex);

    app.use(
      '/assets',
      express.static(distAssetsDir, {
        immutable: true,
        maxAge: '1y',
        index: false,
        lastModified: false,
      }),
    );

    app.use(
      express.static(distDir, {
        index: false,
        maxAge: 0,
        lastModified: false,
        setHeaders(res, servedPath) {
          if (servedPath === distIndexPath) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            return;
          }

          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        },
      }),
    );
    app.get(/^(?!\/(?:api|assets)(?:\/|$)).*/, sendIndex);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('[startup] Server failed to start:', error);
  process.exit(1);
});
