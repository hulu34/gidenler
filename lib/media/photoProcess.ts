import { createHash } from "node:crypto";
import sharp from "sharp";

/* GÖRSEL İŞLEME — yüklenen dosya olduğu gibi saklanmaz. İmza denetlenir, yeniden kodlanır, EXIF ve konum atılır. */
export const MAX_BYTES = 4 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;
export const MIN_SIDE = 400;
export const VARIANTS = [480, 960, 1600] as const;

export type PhotoError = "empty" | "too_large" | "bad_type" | "corrupt" | "too_small";
export type SniffedType = "jpeg" | "png" | "webp";
/** Dosya imzası: uzantıya ve istemcinin bildirdiği türe güvenilmez. */
export function sniffImage(b: Buffer): SniffedType | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

export interface ProcessedPhoto { sha256: string; width: number; height: number; variants: Array<{ w: number; h: number; bytes: Buffer }> }
export async function processPhoto(input: Buffer): Promise<{ ok: true; photo: ProcessedPhoto } | { ok: false; error: PhotoError }> {
  if (!input.length) return { ok: false, error: "empty" };
  if (input.length > MAX_BYTES) return { ok: false, error: "too_large" };
  if (!sniffImage(input)) return { ok: false, error: "bad_type" };
  sharp.concurrency(1);
  const open = () => sharp(input, { failOn: "error", limitInputPixels: MAX_PIXELS, sequentialRead: true }).rotate();
  try {
    const m = await sharp(input, { failOn: "error", limitInputPixels: MAX_PIXELS }).metadata();
    const swap = (m.orientation ?? 1) >= 5;
    const width = (swap ? m.height : m.width) ?? 0, height = (swap ? m.width : m.height) ?? 0;
    if (Math.min(width, height) < MIN_SIDE) return { ok: false, error: "too_small" };
    const variants: ProcessedPhoto["variants"] = [];
    const top = Math.min(width, VARIANTS[VARIANTS.length - 1]);
    for (const w of [...VARIANTS.filter((v) => v < top), top]) {
      const { data, info } = await open().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
      variants.push({ w: info.width, h: info.height, bytes: data });
    }
    return { ok: true, photo: { sha256: createHash("sha256").update(input).digest("hex"), width, height, variants } };
  } catch { return { ok: false, error: "corrupt" }; }
}
