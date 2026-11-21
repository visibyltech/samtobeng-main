import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getOptimizedImageUrl, isCloudinaryUrl, uploadImageToCloudinary } from '../lib/cloudinary';

interface CloudinaryUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: 'samtobpc/products' | 'samtobpc/receipts' | 'samtobpc/banners';
  multiple?: boolean;
  maxFiles?: number;
  label?: string;
}

export function CloudinaryUploader({
  images,
  onChange,
  folder = 'samtobpc/products',
  multiple = true,
  maxFiles = 12,
  label = 'Upload Images to Cloudinary',
}: CloudinaryUploaderProps) {
  const { settings } = useStore();
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (!user || !isAdmin) {
      setErrorMsg('Administrator sign-in is required to upload images.');
      return;
    }
    setErrorMsg(null);
    setUploading(true);

    try {
      const remaining = maxFiles - images.length;
      const toUpload = multiple ? files.slice(0, Math.max(0, remaining)) : [files[0]];
      const uploadedUrls: string[] = [];

      for (const file of toUpload) {
        const res = await uploadImageToCloudinary(file, folder, settings.cloudinary);
        uploadedUrls.push(res.url);
      }

      if (multiple) {
        onChange([...images, ...uploadedUrls].slice(0, maxFiles));
      } else {
        onChange(uploadedUrls);
      }
      showToast(`Uploaded ${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} to Cloudinary`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image upload failed';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleAddManualUrl() {
    const trimmed = manualUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMsg('Please enter a valid http/https image URL.');
      return;
    }
    setErrorMsg(null);
    if (multiple) {
      onChange([...images, trimmed].slice(0, maxFiles));
    } else {
      onChange([trimmed]);
    }
    setManualUrl('');
  }

  function handleRemove(index: number) {
    onChange(images.filter((_, idx) => idx !== index));
  }

  function handleMove(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    onChange(copy);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          disabled={uploading || (multiple && images.length >= maxFiles)}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 border border-ink px-4 py-2 rounded-full text-xs font-medium hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          {uploading ? 'Uploading...' : label}
        </button>

        <div className="flex-1 min-w-[200px] flex gap-2">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="Or paste Cloudinary / image URL..."
            className="flex-1 border border-line rounded-full px-3.5 py-1.5 text-xs focus:outline-none focus:border-signal"
          />
          <button
            type="button"
            onClick={handleAddManualUrl}
            className="px-3.5 py-1.5 rounded-full border border-line text-xs font-medium hover:border-signal hover:text-signal"
          >
            Add URL
          </button>
        </div>
      </div>

      {errorMsg && (
        <p className="text-xs text-signal bg-signal/5 border border-signal/20 rounded-xl px-3 py-2">
          {errorMsg}
        </p>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="relative group rounded-xl border border-line bg-[#F5F4F0] p-2 flex flex-col gap-2"
            >
              <div className="aspect-square flex items-center justify-center overflow-hidden rounded-lg bg-white">
                <img
                  src={getOptimizedImageUrl(url, 320)}
                  alt={`Preview ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-1.5"
                />
              </div>
              <div className="flex items-center justify-between gap-1 text-[10px] font-data text-steel">
                <span>{isCloudinaryUrl(url) ? 'Cloudinary' : 'External'}</span>
                <div className="flex items-center gap-1">
                  {multiple && idx > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMove(idx, -1)}
                      aria-label="Move earlier"
                      className="p-1 rounded hover:bg-ink/5 text-ink"
                    >
                      <ArrowUp size={12} />
                    </button>
                  )}
                  {multiple && idx < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 1)}
                      aria-label="Move later"
                      className="p-1 rounded hover:bg-ink/5 text-ink"
                    >
                      <ArrowDown size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    aria-label="Delete image"
                    className="p-1 rounded hover:bg-signal/10 text-signal"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
