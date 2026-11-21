export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET only' });
  }

  res.setHeader('Cache-Control', 'no-store');
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '';
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const hasSecret = Boolean(process.env.CLOUDINARY_API_SECRET);

  return res.status(200).json({
    cloudName,
    uploadPreset,
    apiKey: hasSecret ? apiKey : '',
    signedEnabled: Boolean(cloudName && apiKey && hasSecret),
    unsignedEnabled: Boolean(cloudName && uploadPreset),
  });
}
