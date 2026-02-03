/**
 * Client-side image compression for slow mobile (e.g. Sri Lanka). Target max size ~500KB.
 */

const MAX_SIZE_BYTES = 450 * 1024; // 450KB to stay under 500KB
const MAX_DIMENSION = 800;
const DEFAULT_QUALITY = 0.85;

export async function compressImageFile(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      let quality = DEFAULT_QUALITY;
      const tryBlob = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress"));
              return;
            }
            if (blob.size <= MAX_SIZE_BYTES || quality <= 0.3) {
              resolve(blob);
              return;
            }
            quality -= 0.1;
            tryBlob();
          },
          "image/jpeg",
          quality
        );
      };
      tryBlob();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}
