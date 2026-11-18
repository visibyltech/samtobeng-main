export function formatNaira(amount: number): string {
  return '₦' + Math.round(amount).toLocaleString('en-NG');
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'item';
}

export function computeDiscountPercent(price: number, oldPrice?: number | null): number | null {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function getStockSignal(stock: number): { bars: number; label: string } {
  if (stock <= 0) return { bars: 0, label: 'Out of stock' };
  if (stock <= 2) return { bars: 1, label: 'Low stock' };
  if (stock <= 5) return { bars: 2, label: `${stock} left` };
  if (stock <= 9) return { bars: 3, label: 'Good stock' };
  return { bars: 4, label: 'Strong stock' };
}

export function clampStr(val: string | undefined | null, maxLen: number): string {
  return (val || '').trim().slice(0, maxLen);
}
