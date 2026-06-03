import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
  await fs.mkdir(path.join(env.UPLOAD_DIR, 'evidence'), { recursive: true });
  await fs.mkdir(path.join(env.UPLOAD_DIR, 'excel'), { recursive: true });
}

export async function saveEvidenceFile(
  buffer: Buffer,
  fileName: string
): Promise<{ filePath: string; mimeType: string; fileSize: number }> {
  const ext = path.extname(fileName).toLowerCase() || '.jpg';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const relativePath = path.join('evidence', uniqueName);
  const fullPath = path.join(env.UPLOAD_DIR, relativePath);

  let output = buffer;
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    output = await sharp(buffer)
      .rotate()
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  await fs.writeFile(fullPath, output);
  logger.debug('Evidence saved', { relativePath });

  return {
    filePath: relativePath,
    mimeType: ext === '.png' ? 'image/png' : 'image/jpeg',
    fileSize: output.length,
  };
}

export async function saveExcelFile(buffer: Buffer, fileName: string): Promise<string> {
  const uniqueName = `${Date.now()}-${fileName}`;
  const relativePath = path.join('excel', uniqueName);
  const fullPath = path.join(env.UPLOAD_DIR, relativePath);
  await fs.writeFile(fullPath, buffer);
  return relativePath;
}
