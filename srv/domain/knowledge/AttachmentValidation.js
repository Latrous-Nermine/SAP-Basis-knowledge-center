/**
 * Single source of truth for attachment upload limits. Referenced by the
 * CREATE handler (authoritative - the frontend is never trusted alone)
 * and mirrored for pre-upload UX only in the UI, not duplicated as a
 * second independent limit.
 */

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',        // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',// .pptx
  'image/png',
  'image/jpeg',
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function isAllowedType(mimeType) {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

export function isAllowedSize(sizeBytes) {
  return Number.isInteger(sizeBytes) && sizeBytes > 0 && sizeBytes <= MAX_FILE_SIZE_BYTES;
}
