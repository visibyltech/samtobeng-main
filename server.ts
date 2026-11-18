import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'samtob-pc-server', timestamp: new Date().toISOString() });
  });

  // Public Cloudinary config (never exposes API secret)
  app.get('/api/cloudinary/config', (_req, res) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '';
    const uploadPreset = process.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
    const apiKey = process.env.CLOUDINARY_API_KEY || '';
    const hasSecret = Boolean(process.env.CLOUDINARY_API_SECRET);
    res.json({
      cloudName,
      uploadPreset,
      apiKey: hasSecret ? apiKey : '',
      signedEnabled: Boolean(cloudName && apiKey && hasSecret),
      unsignedEnabled: Boolean(cloudName && uploadPreset),
    });
  });

  // Server-side Cloudinary upload signature generator
  app.post('/api/cloudinary/sign', (req, res) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      res.status(400).json({
        error: 'Server-side Cloudinary signing is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment secrets, or use an unsigned upload preset.',
      });
      return;
    }

    const folder = typeof req.body?.folder === 'string' && /^[a-zA-Z0-9_\/-]+$/.test(req.body.folder)
      ? req.body.folder
      : 'samtobpc/products';
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash('sha1')
      .update(`${paramsToSign}${apiSecret}`)
      .digest('hex');

    res.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    });
  });

  // Server-side image migration helper (transfers remote product image URLs to Cloudinary)
  app.post('/api/cloudinary/migrate-url', async (req, res) => {
    const sourceUrl = typeof req.body?.sourceUrl === 'string' ? req.body.sourceUrl : '';
    const folder = typeof req.body?.folder === 'string' ? req.body.folder : 'samtobpc/products';
    const cloudName = typeof req.body?.cloudName === 'string' && req.body.cloudName
      ? req.body.cloudName
      : (process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '');
    const uploadPreset = typeof req.body?.uploadPreset === 'string' && req.body.uploadPreset
      ? req.body.uploadPreset
      : (process.env.VITE_CLOUDINARY_UPLOAD_PRESET || '');
    const apiKey = process.env.CLOUDINARY_API_KEY || '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

    if (!sourceUrl || !sourceUrl.startsWith('https://')) {
      res.status(400).json({ error: 'Valid HTTPS sourceUrl is required.' });
      return;
    }
    if (!cloudName) {
      res.status(400).json({ error: 'Cloudinary cloudName is not configured.' });
      return;
    }

    try {
      const form = new FormData();
      form.append('file', sourceUrl);
      form.append('folder', folder);

      if (apiKey && apiSecret) {
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = crypto
          .createHash('sha1')
          .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
          .digest('hex');
        form.append('api_key', apiKey);
        form.append('timestamp', String(timestamp));
        form.append('signature', signature);
      } else if (uploadPreset) {
        form.append('upload_preset', uploadPreset);
      } else {
        res.status(400).json({ error: 'Configure either CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET or an unsigned uploadPreset.' });
        return;
      }

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
        method: 'POST',
        body: form,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        res.status(uploadRes.status).json({ error: uploadJson?.error?.message || 'Cloudinary migration failed.' });
        return;
      }
      res.json({ url: uploadJson.secure_url, publicId: uploadJson.public_id });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Migration error' });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SAMTOB P&C server running on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
