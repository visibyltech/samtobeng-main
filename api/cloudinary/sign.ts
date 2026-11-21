import crypto from 'node:crypto';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0087310115';
const ADMIN_EMAILS = new Set(['samtobeng@gmail.com', 'usitakatelvin@gmail.com']);

function decodeJsonPart(part: string) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

async function verifyBootstrapAdmin(req: any): Promise<boolean> {
  try {
    const authHeader = String(req.headers?.authorization || '');
    const match = authHeader.match(/^Bearer\\s+(.+)$/i);
    if (!match) return false;

    const parts = match[1].split('.');
    if (parts.length !== 3) return false;
    const header = decodeJsonPart(parts[0]);
    const claims = decodeJsonPart(parts[1]);
    const now = Math.floor(Date.now() / 1000);

    if (
      header.alg !== 'RS256' ||
      !header.kid ||
      claims.aud !== FIREBASE_PROJECT_ID ||
      claims.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` ||
      Number(claims.exp || 0) <= now ||
      Number(claims.iat || 0) > now + 60 ||
      claims.email_verified !== true
    ) return false;

    const certResponse = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );
    if (!certResponse.ok) return false;
    const certs = await certResponse.json() as Record<string, string>;
    const cert = certs[header.kid];
    if (!cert) return false;

    const valid = crypto.verify(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      cert,
      Buffer.from(parts[2], 'base64url')
    );
    const email = String(claims.email || '').toLowerCase();
    return valid && ADMIN_EMAILS.has(email);
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }
  if (!(await verifyBootstrapAdmin(req))) {
    return res.status(403).json({ error: 'Verified SAMTOB P&C administrator sign-in is required.' });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(400).json({ error: 'Signed Cloudinary uploads are not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to Vercel environment variables, or use an unsigned upload preset.' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const allowedFolders = new Set(['samtobpc/products', 'samtobpc/receipts', 'samtobpc/banners']);
  const folder = allowedFolders.has(body.folder) ? body.folder : 'samtobpc/products';
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');

  return res.status(200).json({ cloudName, apiKey, timestamp, folder, signature });
}
