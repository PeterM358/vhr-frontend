import { Platform } from 'react-native';

const DEFAULT_MAX_EDGE = 1600;
const DEFAULT_QUALITY = 0.7;

function isImageMime(mimeType, fileName = '') {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  const ext = String(fileName || '').toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif'].includes(ext);
}

function isPdf(mimeType, fileName = '') {
  const mime = String(mimeType || '').toLowerCase();
  if (mime === 'application/pdf') return true;
  return String(fileName || '').toLowerCase().endsWith('.pdf');
}

async function compressWebImage(attachment, { maxEdge, quality }) {
  const src = attachment.file || attachment.uri;
  if (!src || typeof document === 'undefined') return attachment;

  const objectUrl =
    typeof src === 'string'
      ? src
      : URL.createObjectURL(src);

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not load image for compression'));
      el.src = objectUrl;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return attachment;

    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if (!ctx) return attachment;
    ctx.drawImage(img, 0, 0, tw, th);

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });
    if (!blob) return attachment;

    const baseName = String(attachment.fileName || 'receipt.jpg').replace(/\.[^.]+$/, '');
    const fileName = `${baseName}.jpg`;
    const file = new File([blob], fileName, { type: 'image/jpeg' });
    return {
      ...attachment,
      uri: URL.createObjectURL(file),
      fileName,
      mimeType: 'image/jpeg',
      file,
      compressed: true,
    };
  } finally {
    if (attachment.file && objectUrl.startsWith('blob:')) {
      // keep original blob URL for UI until replaced; only revoke if we created it here from File
      if (typeof src !== 'string') URL.revokeObjectURL(objectUrl);
    }
  }
}

async function compressNativeImage(attachment, { maxEdge, quality }) {
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const actions = [{ resize: { width: maxEdge } }];
    // If taller than wide, constrain by height via width-only may overshoot —
    // manipulateAsync with width only keeps aspect ratio.
    const result = await ImageManipulator.manipulateAsync(
      attachment.uri,
      actions,
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    const baseName = String(attachment.fileName || 'receipt.jpg').replace(/\.[^.]+$/, '');
    return {
      ...attachment,
      uri: result.uri,
      fileName: `${baseName}.jpg`,
      mimeType: 'image/jpeg',
      file: null,
      compressed: true,
      width: result.width,
      height: result.height,
    };
  } catch {
    return attachment;
  }
}

/**
 * Resize/compress receipt photos before upload (max edge ~1600px, JPEG ~0.7).
 * PDFs and non-images pass through unchanged.
 */
export async function compressImageForUpload(attachment, options = {}) {
  if (!attachment) return null;
  const maxEdge = options.maxEdge || DEFAULT_MAX_EDGE;
  const quality = options.quality ?? DEFAULT_QUALITY;

  if (isPdf(attachment.mimeType, attachment.fileName)) {
    return attachment;
  }
  if (!isImageMime(attachment.mimeType, attachment.fileName)) {
    return attachment;
  }

  if (Platform.OS === 'web') {
    return compressWebImage(attachment, { maxEdge, quality });
  }
  return compressNativeImage(attachment, { maxEdge, quality });
}

export async function compressImagesForUpload(attachments, options = {}) {
  const list = Array.isArray(attachments) ? attachments : [];
  const out = [];
  for (const item of list) {
    out.push(await compressImageForUpload(item, options));
  }
  return out.filter(Boolean);
}
