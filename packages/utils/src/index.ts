import CryptoJS from 'crypto-js';

export function generateHash(...parts: (string | number | null | undefined)[]): string {
  const normalized = parts
    .filter((p) => p !== null && p !== undefined)
    .map((p) => String(p).trim().toUpperCase())
    .join('|');
  return CryptoJS.SHA256(normalized).toString(CryptoJS.enc.Hex);
}

export function generateDeliveryNumber(prefix = 'DLV'): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${y}${m}${d}${rand}`;
}

export function paginate(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
    page: safePage,
    limit: safeLimit,
  };
}

export function buildPaginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
