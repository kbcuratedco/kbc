// Client-side image compression for cart/inspo photos.
// Raw phone photos are 3–8 MB as data URLs, which overflows localStorage
// (~5 MB total) the moment you add a couple of inspo images to the cart.
// We downscale to a reasonable max dimension and re-encode as JPEG so
// what lands in localStorage / the order email stays small.

export async function resizeImageFile(file: File, maxDim = 1400, quality = 0.78): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  try {
    return await resizeImageDataUrl(dataUrl, maxDim, quality);
  } catch {
    return dataUrl;
  }
}

/**
 * Resize a photo, upload it to Cloud storage, and return a short signed URL.
 * Prevents cart localStorage from filling up with multi-MB base64 blobs.
 */
export async function uploadResizedImageFile(
  file: File,
  maxDim = 1400,
  quality = 0.78,
): Promise<string> {
  const dataUrl = await resizeImageFile(file, maxDim, quality);
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Could not encode image");
  const { uploadInspoImage } = await import("@/lib/inspo.functions");
  const { url } = await uploadInspoImage({ data: { contentType: m[1], base64: m[2] } });
  return url;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}

async function resizeImageDataUrl(src: string, maxDim: number, quality: number): Promise<string> {
  const img = await loadImage(src);
  const { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
