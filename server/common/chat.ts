export const CHAT_IMAGE_MAX_DATA_URI_LENGTH = 1_000_000;

export const CHAT_IMAGE_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

export function isChatImageDataUri(value: string): boolean {
  if (value.length > CHAT_IMAGE_MAX_DATA_URI_LENGTH) return false;
  const match = /^data:([^;]+);base64,/i.exec(value);
  if (!match) return false;
  const mime = match[1].toLowerCase();
  return CHAT_IMAGE_ALLOWED_MIME_TYPES.includes(mime);
}