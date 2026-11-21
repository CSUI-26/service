import type { ImageConfig } from '@zenith/shared';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

function parseAspectRatio(aspect: string): number {
  const [rawW, rawH] = aspect.split(':');
  const w = Number(rawW);
  const h = Number(rawH);
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? w / h : 1;
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode WebP image.'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      quality,
    );
  });
}

export async function renderCroppedWebp(
  img: HTMLImageElement,
  config: ImageConfig,
  maxEdge?: number,
  quality = 0.82,
): Promise<Blob> {
  const edge = maxEdge ?? (config.aspect === '1:1' ? 1200 : 1600);
  const ratio = parseAspectRatio(config.aspect);
  const outW = ratio >= 1 ? edge : Math.max(1, Math.round(edge * ratio));
  const outH = ratio >= 1 ? Math.max(1, Math.round(edge / ratio)) : edge;

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  const nw = img.naturalWidth || img.width || outW;
  const nh = img.naturalHeight || img.height || outH;
  const baseScale = Math.max(outW / nw, outH / nh);
  const drawW = nw * baseScale * config.zoom;
  const drawH = nh * baseScale * config.zoom;

  const panX = ((50 - config.x) / 100) * Math.max(0, drawW - outW);
  const panY = ((50 - config.y) / 100) * Math.max(0, drawH - outH);

  ctx.save();
  ctx.translate(outW / 2 + panX, outH / 2 + panY);
  ctx.rotate(((config.rotate ?? 0) * Math.PI) / 180);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const qualitySteps = [quality, ...[0.7, 0.55, 0.4].filter((q) => q < quality)];
  for (const stepQuality of qualitySteps) {
    const blob = await canvasToWebpBlob(canvas, stepQuality);
    if (blob.size <= MAX_UPLOAD_BYTES) {
      return blob;
    }
  }

  throw new Error('Image remains larger than 2 MB after compression.');
}
