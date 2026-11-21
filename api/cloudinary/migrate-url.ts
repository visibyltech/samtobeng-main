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
    return valid && ADMIN_EMAILS.has(String(claims.email || '').toLowerCase());
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

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl : '';
  let parsedUrl: URL;
  try { parsedUrl = new URL(sourceUrl); } catch {
    return res.status(400).json({ error: 'A valid HTTPS source image URL is required.' });
  }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'rkcebsghghwxjvobenry.supabase.co') {
    return res.status(400).json({ error: 'Only images from the recovered SAMTOB legacy image host can be migrated.' });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || String(body.cloudName || '');
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET || String(body.uploadPreset || '');
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  if (!cloudName) {
    return res.status(400).json({ error: 'Set the Cloudinary Cloud Name in Admin > Website & Payment Settings first.' });
  }

  const folder = 'samtobpc/products';
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
    return res.status(400).json({ error: 'Set an unsigned Cloudinary Upload Preset in Admin Settings or configure signed Cloudinary API credentials in Vercel.' });
  }

  try {
    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      { method: 'POST', body: form }
    );
    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok || !uploadData.secure_url) {
      return res.status(502).json({ error: uploadData?.error?.message || 'Cloudinary could not import this image.' });
    }
    return res.status(200).json({ url: uploadData.secure_url, publicId: uploadData.public_id });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Cloudinary migration failed.' });
  }
}
