import { supabaseAdmin } from '../config/supabase';
import crypto from 'crypto';
import { ValidationError } from '../lib/errors';

function safeKey(filename: string) {
  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
  const base = filename.replace(ext, '').replace(/[^a-z0-9-_]/gi, '_') || 'file';
  return `${Date.now()}_${crypto.randomUUID()}_${base}${ext}`;
}

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf']);

const ALLOWED_CONTENT_TYPES: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.pdf': ['application/pdf'],
};

const MAX_FILENAME_LENGTH = 255;

export async function createSignedUploadUrl(filename: string, contentType?: string) {
  if (!filename) throw new Error('filename required');

  if (filename.length > MAX_FILENAME_LENGTH) {
    throw new ValidationError(`Filename too long. Maximum ${MAX_FILENAME_LENGTH} characters allowed.`);
  }

  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new ValidationError(`File type not allowed. Accepted: ${[...ALLOWED_EXTENSIONS].join(', ')}`);
  }

  if (contentType) {
    const allowedForExt = ALLOWED_CONTENT_TYPES[ext];
    if (!allowedForExt || !allowedForExt.includes(contentType)) {
      throw new ValidationError(
        `Content type "${contentType}" does not match extension "${ext}". Allowed: ${(allowedForExt || []).join(', ')}`
      );
    }
  }

  const key = `uploads/${safeKey(filename)}`;
  const { data, error } = await supabaseAdmin.storage
    .from('uploads')
    .createSignedUploadUrl(key);

  if (error) throw error;

  const { data: publicData } = supabaseAdmin.storage
    .from('uploads')
    .getPublicUrl(key);

  return {
    uploadUrl: data.signedUrl,
    token: data.token,
    path: key,
    publicUrl: publicData.publicUrl,
  };
}

export function getPublicUrl(path: string) {
  const { data } = supabaseAdmin.storage.from('uploads').getPublicUrl(path);
  return data.publicUrl;
}
