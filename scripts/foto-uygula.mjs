/* ONAYLI FOTOĞRAFI ARŞİVE ALIR ya da KALDIRIR. Yalnız hak kaydı olan aday; WebP 480/960/1440, EXIF silinir; kayıt data/real/izinli-fotograflar.json.
   Uygula: node scripts/foto-uygula.mjs uygula <onaylilar.json>   ([{slug,url,sayfa,tur,credit,license}] — license "tür: kanıt")
   Kaldır: node scripts/foto-uygula.mjs kaldir <slug> <src> . Yayın ancak derlemeyle ve onayla olur. */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import sharp from "sharp";

const CAT = { yemek: "yemek", ic: "ic", dis: "dis" };
export function readReg(root) { return JSON.parse(readFileSync(`${root}/data/real/izinli-fotograflar.json`, "utf8")); }
export function writeReg(root, d) { writeFileSync(`${root}/data/real/izinli-fotograflar.json`, JSON.stringify(d, null, 2) + "\n"); }

export async function apply(root, items, get = fetch) {
  const reg = readReg(root); const done = [];
  for (const it of items) {
    const [type, ...ref] = String(it.license ?? "").split(": ");
    if (!["isletme-izni", "kendi", "acik-lisans"].includes(type) || ref.join(": ").length < 8 || !it.credit) { done.push({ slug: it.slug, ok: false, error: "hak_kaydi_yok" }); continue; }
    const r = await get(it.url); if (!r.ok) { done.push({ slug: it.slug, ok: false, error: `http_${r.status}` }); continue; }
    const buf = Buffer.from(await r.arrayBuffer()); const id = createHash("sha1").update(it.url).digest("hex").slice(0, 10);
    mkdirSync(`${root}/public/media/foto`, { recursive: true });
    const base = `${it.slug}-${id}`; const sizes = [480, 960, 1440];
    for (const w of sizes) await sharp(buf).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(`${root}/public/media/foto/${base}-${w}.webp`);
    const M = "/media/foto"; const photo = { src: `${M}/${base}-960.webp`, srcSet: sizes.map((w) => `${M}/${base}-${w}.webp ${w}w`).join(", "), full: `${M}/${base}-1440.webp`, category: CAT[it.tur] ?? "diger", alt: it.alt || `${it.slug} fotoğrafı`, credit: it.credit, sourceUrl: it.sayfa, addedBy: type === "acik-lisans" ? "commons" : "işletme", ...(type === "acik-lisans" ? { license: ref.join(": ").slice(0, 60) } : {}), rightsRef: `${type}: ${ref.join(": ")}${type === "isletme-izni" && !/restoran profili/i.test(ref.join(": ")) ? " (kapsam: restoran profili)" : ""}` };
    reg[it.slug] = [...(reg[it.slug] ?? []).filter((p) => p.src !== photo.src), photo]; done.push({ slug: it.slug, ok: true, src: photo.src });
  }
  writeReg(root, reg); return done;
}
export function remove(root, slug, src) {
  const reg = readReg(root); const list = reg[slug] ?? []; const p = list.find((x) => x.src === src); if (!p) return { ok: false, error: "yok" };
  reg[slug] = list.filter((x) => x !== p); if (!reg[slug].length) delete reg[slug]; writeReg(root, reg);
  if (src.startsWith("/media/foto/")) for (const w of [480, 960, 1440]) rmSync(`${root}/public${src.replace("-960.webp", `-${w}.webp`)}`, { force: true });
  return { ok: true };
}
if (process.argv[1]?.endsWith("foto-uygula.mjs")) {
  const [, , cmd, a, b] = process.argv; const root = new URL("../", import.meta.url).pathname;
  if (cmd === "uygula") console.log(JSON.stringify(await apply(root, JSON.parse(readFileSync(a, "utf8"))), null, 1));
  else if (cmd === "kaldir") console.log(JSON.stringify(remove(root, a, b)));
  else { console.log("uygula <dosya> | kaldir <slug> <src>"); process.exit(2); }
}
