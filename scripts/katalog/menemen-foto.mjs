/* MENEMEN GALERİSİ · İZİNLİ FOTOĞRAF — data/katalog/menemen/foto-izin.json'daki yazılı izin ve görsel kayıtlarını denetler,
   geçenleri mevcut fotoğraf aracıyla (scripts/foto-uygula.mjs: WebP 480/960/1440, EXIF silinir, kayıt izinli-fotograflar.json)
   işletmenin galerisine ekler. Varsayılan kip yalnız denetimdir; dosyalara --yaz ile yazılır. Production'a bir şey yazmaz.
   Ret nedenleri: yazılı izin yok ya da eksik; kapsamda "restoran profili" yok; hak sahibi işletme değil; içerik üreticisinin
   görseli (işletmenin izni tek başına yetmez); izin kapsamı dışında; orijinal dosya yok; kategori geçersiz.
   Sıra: dış cephe, iç mekân, imza menemen çeşitleri, kahvaltı sunumları, servis, diğer.
   Kullanım: node scripts/katalog/menemen-foto.mjs [izin.json] [--yaz] [--kok=<dizin>] */
import { readFileSync, existsSync } from "node:fs";
import { apply } from "../foto-uygula.mjs";
const args = process.argv.slice(2);
const P = args.find((a) => !a.startsWith("--")) ?? "data/katalog/menemen/foto-izin.json";
const yaz = args.includes("--yaz");
const kok = args.find((a) => a.startsWith("--kok="))?.slice(6) ?? new URL("../../", import.meta.url).pathname;
const SIRA = ["dis", "ic", "menemen", "kahvalti", "servis", "diger"];
const KAT = { dis: "dis", ic: "ic", menemen: "yemek", kahvalti: "yemek", servis: "yemek", diger: "diger" };
export function denetle(M) {
  const hata = [], kabul = [], ret = [];
  const z = M.izin;
  if (!z) return { hata: ["yazılı izin yok (izin: null) — görsel eklenmez"], kabul, ret: M.gorseller.map((g) => ({ ...g, neden: "yazılı izin yok" })) };
  for (const k of ["tarih", "veren", "belge", "kunye"]) if (!String(z[k] ?? "").trim() || /YYYY|yetkilinin|ör\./.test(z[k])) hata.push(`izin.${k} eksik`);
  if (!/^\d{4}-\d\d-\d\d$/.test(z.tarih ?? "")) hata.push("izin.tarih biçimi");
  if (!Array.isArray(z.kapsam) || !z.kapsam.some((k) => /restoran profili/i.test(k))) hata.push("izin kapsamında 'restoran profili' yok");
  if (hata.length) return { hata, kabul, ret: M.gorseller.map((g) => ({ ...g, neden: "izin kaydı eksik" })) };
  for (const g of M.gorseller) {
    const neden = !SIRA.includes(g.oncelik) ? "kategori geçersiz"
      : g.icerikUretici ? "içerik üreticisinin görseli: işletmenin izni tek başına yetmez"
      : String(g.hakSahibi ?? "").trim() !== M.isletme ? `hak sahibi işletme değil (${g.hakSahibi ?? "—"})`
      : g.izinKapsaminda !== true ? "izin kapsamı dışında"
      : !g.dosya || !existsSync(g.dosya) ? "orijinal dosya yok"
      : !String(g.kaynak ?? "").trim() ? "kaynak yok"
      : !String(g.alt ?? "").trim() ? "alt metin yok" : null;
    (neden ? ret : kabul).push(neden ? { ...g, neden } : g);
  }
  kabul.sort((a, b) => SIRA.indexOf(a.oncelik) - SIRA.indexOf(b.oncelik));
  return { hata, kabul, ret };
}
export function ogeler(M, kabul) {
  const z = M.izin;
  return kabul.map((g) => ({ slug: M.slug, url: g.dosya, sayfa: /^https:\/\//.test(g.kaynak) ? g.kaynak : M.kaynakSayfasi ?? "https://www.instagram.com/menemenbreakfast/", tur: KAT[g.oncelik], alt: g.alt, credit: z.kunye,
    license: `isletme-izni: ${z.veren} ${z.tarih} tarihli yazılı izin (${z.belge}); kapsam: ${z.kapsam.join(", ")}; hak sahibi: ${g.hakSahibi}${g.ceken ? `; çeken: ${g.ceken}` : ""}; kaynak: ${g.kaynak}` }));
}
if (process.argv[1]?.endsWith("menemen-foto.mjs")) {
  const M = JSON.parse(readFileSync(P, "utf8")); const d = denetle(M);
  const out = { kip: !yaz ? "yalnız denetim" : d.hata.length ? "yazılmadı (izin hatası)" : d.kabul.length ? "yazıldı" : "yazılmadı (kabul edilen görsel yok)", hata: d.hata, kabul: d.kabul.map((g) => `${g.oncelik}: ${g.dosya}`), ret: d.ret.map((g) => `${g.dosya ?? "—"}: ${g.neden}`) };
  if (yaz && !d.hata.length && d.kabul.length) {
    const yerel = async (yol) => ({ ok: existsSync(yol), status: existsSync(yol) ? 200 : 404, arrayBuffer: async () => readFileSync(yol) });
    out.eklenen = await apply(kok, ogeler(M, d.kabul), yerel);
  }
  console.log(JSON.stringify(out, null, 1)); process.exit(d.hata.length && yaz ? 1 : 0);
}
