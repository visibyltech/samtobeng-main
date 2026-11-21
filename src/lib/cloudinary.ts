import { CloudinarySettings } from '../types';
import { auth } from './firebase';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

export interface ServerCloudinaryStatus {
  cloudName: string;
  uploadPreset: string;
  apiKey: string;
  signedEnabled: boolean;
  unsignedEnabled: boolean;
}

export async function fetchServerCloudinaryConfig(): Promise<ServerCloudinaryStatus> {
  try {
    const res = await fetch('/api/cloudinary/config');
    if (!res.ok) throw new Error('Could not fetch Cloudinary config');
    return await res.json();
  } catch {
    return {
      cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
      uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
      apiKey: '',
      signedEnabled: false,
      unsignedEnabled: Boolean(
        import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
      ),
    };
  }
}

export async function uploadImageToCloudinary(
  file: File,
  folder: 'samtobpc/products' | 'samtobpc/receipts' | 'samtobpc/banners' = 'samtobpc/products',
  adminSettings?: CloudinarySettings
): Promise<CloudinaryUploadResult> {
  const serverCfg = await fetchServerCloudinaryConfig();
  const cloudName =
    adminSettings?.cloudName?.trim() ||
    serverCfg.cloudName ||
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
    '';
  const uploadPreset =
    adminSettings?.uploadPreset?.trim() ||
    serverCfg.uploadPreset ||
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
    '';

  if (!cloudName) {
    throw new Error(
      'Cloudinary Cloud Name is not configured. Add it in Admin > Website & Payment Settings or set VITE_CLOUDINARY_CLOUD_NAME in environment variables.'
    );
  }

  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Sign in with an authorized administrator account before uploading images.');

  const effectiveCloudName = serverCfg.signedEnabled && serverCfg.cloudName ? serverCfg.cloudName : cloudName;
  let uploadCloudName = effectiveCloudName;
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);

  if (serverCfg.signedEnabled) {
    const signRes = await fetch('/api/cloudinary/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ folder }),
    });
    const signData = await signRes.json();
    if (!signRes.ok) {
      throw new Error(signData.error || 'Failed to obtain Cloudinary upload signature.');
    }
    uploadCloudName = signData.cloudName || uploadCloudName;
    form.append('api_key', signData.apiKey);
    form.append('timestamp', String(signData.timestamp));
    form.append('signature', signData.signature);
  } else if (uploadPreset) {
    form.append('upload_preset', uploadPreset);
  } else {
    throw new Error(
      'Cloudinary Upload Preset is not configured. Configure an unsigned Upload Preset in Admin Settings or set CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET on the server.'
    );
  }

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(uploadCloudName)}/image/upload`,
    {
      method: 'POST',
      body: form,
    }
  );
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(uploadJson?.error?.message || 'Cloudinary upload failed.');
  }

  return {
    url: uploadJson.secure_url,
    publicId: uploadJson.public_id,
    width: uploadJson.width,
    height: uploadJson.height,
  };
}

export async function migrateRemoteUrlToCloudinary(
  sourceUrl: string,
  folder = 'samtobpc/products',
  adminSettings?: CloudinarySettings
): Promise<string> {
  if (sourceUrl.includes('res.cloudinary.com')) {
    return sourceUrl;
  }
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Sign in with an authorized administrator account before migrating images.');
  const res = await fetch('/api/cloudinary/migrate-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      sourceUrl,
      folder,
      cloudName: adminSettings?.cloudName || '',
      uploadPreset: adminSettings?.uploadPreset || '',
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Could not migrate image to Cloudinary');
  }
  return data.url;
}

/**
 * Optimizes Cloudinary URLs with f_auto,q_auto and responsive width while preserving non-Cloudinary URLs cleanly.
 */
export function getOptimizedImageUrl(url: string | undefined, width = 800): string {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    const [prefix, suffix] = url.split('/upload/');
    if (suffix && !suffix.startsWith('f_auto')) {
      return `${prefix}/upload/f_auto,q_auto,w_${width},c_limit/${suffix}`;
    }
  }
  return url;
}

export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com');
}
