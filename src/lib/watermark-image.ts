/**
 * Client-side watermark for listing images (easyadz.lk style).
 * Apply before upload so the watermark is visible to everyone.
 */

const WATERMARK_TEXT = "easyadz.lk";
const WATERMARK_OPACITY = 0.5;
const PADDING_X = 20;
const PADDING_Y = 20;
const FONT_SIZE_RATIO = 0.04; // 4% of min dimension

export async function applyEasyAdzWatermark(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.crossOrigin = "anonymous";
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const minDim = Math.min(canvas.width, canvas.height);
      const fontSize = Math.max(14, Math.round(minDim * FONT_SIZE_RATIO));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = `rgba(255, 255, 255, ${WATERMARK_OPACITY})`;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1;
      const x = PADDING_X;
      const y = canvas.height - PADDING_Y;
      ctx.strokeText(WATERMARK_TEXT, x, y);
      ctx.fillText(WATERMARK_TEXT, x, y);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create watermarked image"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.9
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}
