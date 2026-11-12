/* Menemen galerisi izin testi. Gerçek görsel kullanılmaz: geçici dizinde düz renkli deneme görselleri üretilir.
   1. Galerideki gerçek görseller: onay türü ve belgesi doğru (yazılı belge yok), kaynak resmî, sıra, WebP, EXIF; seçilmeyenler galeride yok.
   2. Eksik izin kaydı → hata, yazım yok.
   3. Tam izinle: yalnız hak sahibi işletme olan, kapsam içindeki orijinaller eklenir; içerik üreticisi görseli, başka hak sahibi,
      kapsam dışı ve dosyası olmayan görsel reddedilir. Sıra: dış cephe, iç mekân, menemen, kahvaltı.
   4. Her eklenen görselde künye, kaynak, hak sahibi, izin (veren, tarih, belge, kapsam) kaydı; 480/960/1440 WebP; EXIF yok.
   5. Diğer işletmelerin izinli fotoğrafları değişmez; tekrar çalıştırma çoğaltmaz.
   Kullanım: npx tsx scripts/menemen-foto-test.ts */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync, cpSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
let ok = 0, fail = 0; const t = (ad: string, kosul: boolean, not = "") => { if (kosul) ok++; else { fail++; console.log("KALDI:", ad, not); } };
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const REG = J("data/real/izinli-fotograflar.json"), M0 = J("data/katalog/menemen/foto-izin.json");
const calis = (kok: string, man: string, yaz: boolean) => { let o: string; try { o = execFileSync("node", ["scripts/katalog/menemen-foto.mjs", man, ...(yaz ? ["--yaz"] : []), `--kok=${kok}`], { encoding: "utf8" }); } catch (e) { o = String((e as { stdout?: string }).stdout ?? ""); } return JSON.parse(o); };
const kokHazirla = () => { const d = mkdtempSync(join(tmpdir(), "menemen-foto-")); mkdirSync(join(d, "data/real"), { recursive: true }); cpSync("data/real/izinli-fotograflar.json", join(d, "data/real/izinli-fotograflar.json")); return d; };

async function main() {
  /* 1. galerideki gerçek görseller (13.11.2026): doğrudan onay, yazılı belge yok — kayıt bunu olduğu gibi söylemeli */
  const G = REG["menemen-besiktas"] ?? [];
  t("onay kaydı var ve yazılı belge olmadığını açıkça söylüyor", !!M0.izin && /yazılı belge yok/i.test(M0.izin.tur) && /yazılı belge yok/i.test(M0.izin.belge) && M0.izin.tarih === "2026-11-13");
  t("onay kapsamı sitenin fiilî kullanımıyla aynı (profil, galeri, kapak kartları, og:image, JSON-LD; Seçki yok)", M0.izin.kapsam.length === 3 && /galerisi/.test(M0.izin.kapsam[0]) && /og:image/.test(M0.izin.kapsam[1]) && /JSON-LD/.test(M0.izin.kapsam[1]) && !/Seçki/.test(M0.izin.kapsam.join()));
  t("her görselin hak kaydı aynı kapsamı yazıyor", G.every((p: { rightsRef: string }) => p.rightsRef.includes("kapsam: " + M0.izin.kapsam.join(", "))));
  t("galeride 6 görsel", G.length === 6 && M0.gorseller.length === 6);
  t("sıra: dış cephe, iç mekân, sonra yemek", JSON.stringify(G.map((p: { category: string }) => p.category)) === JSON.stringify(["dis", "ic", "yemek", "yemek", "yemek", "yemek"]));
  t("kayıt ↔ galeri eşleşmesi", M0.gorseller.every((g: any, i: number) => g.galeriKaydi === G[i].src && g.alt === G[i].alt));
  t("depoda yerel dosya yolu yok", !/\/private\/|\/Users\//.test(JSON.stringify(M0)));
  for (const p of G) {
    t(`${p.src}: kaynak resmî (Instagram hesabı ya da resmî site arşivi)`, /^https:\/\/www\.instagram\.com\/menemenbreakfast\/p\/[A-Za-z0-9_-]+\/$/.test(p.sourceUrl) || p.sourceUrl === "https://web.archive.org/web/20240120112231/https://menemenbesiktas.com/");
    t(`${p.src}: hak kaydı yazılı belge iddia etmiyor`, /yazılı belge yok/.test(p.rightsRef) && !/tarihli yazılı izin/.test(p.rightsRef));
    t(`${p.src}: hak kaydında veren, kapsam, hak sahibi, kaynak`, ["veren: Menemen işletme sahibi", "kapsam: restoran profili", "hak sahibi: Menemen", "kaynak: https://"].every((x) => p.rightsRef.includes(x)));
    t(`${p.src}: künye ve ekleyen`, p.credit === "Menemen" && p.addedBy === "işletme");
    for (const w of [480, 960, 1440]) {
      const f = join("public", p.src.replace("-960.webp", `-${w}.webp`));
      t(`${p.src}: ${w} WebP var`, existsSync(f));
      if (existsSync(f)) { const md = await sharp(f).metadata(); t(`${p.src}: ${w} EXIF yok, genişlik ≤ ${w}`, !md.exif && md.format === "webp" && (md.width ?? 0) <= w); }
    }
  }
  t("2024 site görselleri tarihleriyle not edilmiş", G.filter((p: any) => /web\.archive\.org/.test(p.sourceUrl)).every((p: any) => /2024/.test(p.rightsRef)));
  t("yüzü tanınan kişili gönderi galeride yok", !G.some((p: any) => p.sourceUrl.includes("Dev1EJVDgrn")) && M0.secilmeyen.some((x: any) => x.kaynak.includes("Dev1EJVDgrn")));
  t("şubesi belirsiz iç mekân gönderisi galeride yok", !G.some((p: any) => p.sourceUrl.includes("Dfb_br0kcFg")));
  { const k = kokHazirla(); const r = calis(k, "data/katalog/menemen/foto-izin.json", true);
    t("orijinaller depoda yok: araç yeniden çalışınca hiçbir şey yazmaz", !r.eklenen && r.ret.length === 6 && readFileSync(join(k, "data/real/izinli-fotograflar.json"), "utf8") === readFileSync("data/real/izinli-fotograflar.json", "utf8")); }
  { const k = kokHazirla(); const r = calis(k, (() => { const p = join(mkdtempSync(join(tmpdir(), "m-")), "m.json"); writeFileSync(p, JSON.stringify({ ...M0, izin: null })); return p; })(), true);
    t("onay kaydı yokken araç ekleme yapmaz", r.hata.some((h: string) => /yazılı izin yok|izin: null/.test(h)) && !r.eklenen && /yazılmadı/.test(r.kip)); }

  /* deneme görselleri (EXIF'li) */
  const d = mkdtempSync(join(tmpdir(), "menemen-orijinal-"));
  const gorsel = async (ad: string, renk: string) => { const p = join(d, ad); await sharp({ create: { width: 1800, height: 1350, channels: 3, background: renk } }).withMetadata({ exif: { IFD0: { Artist: "Deneme", Copyright: "Deneme" } } }).jpeg().toFile(p); return p; };
  const g = {
    kahvalti: await gorsel("kahvalti.jpg", "#e8c070"), menemen: await gorsel("menemen.jpg", "#c0392b"), dis: await gorsel("dis.jpg", "#7f8c8d"), ic: await gorsel("ic.jpg", "#a0522d"),
    uretici: await gorsel("uretici.jpg", "#2c3e50"), baska: await gorsel("baska.jpg", "#16a085"), kapsamDisi: await gorsel("kapsam.jpg", "#8e44ad"),
  };
  const izin = { tarih: "2026-11-13", veren: "Deneme Yetkili (işletme sahibi)", belge: "deneme-izin-formu.pdf", kapsam: ["restoran profili", "Seçki (TR/EN)", "kırpma ve boyutlandırma"], kunye: "Menemen arşivi" };
  const kayit = (dosya: string, oncelik: string, ek: Record<string, unknown> = {}) => ({ dosya, oncelik, kaynak: "işletmenin 13.11.2026 tarihli e-postası", hakSahibi: "Menemen", icerikUretici: false, izinKapsaminda: true, alt: `Menemen — ${oncelik}`, ...ek });
  const manifest = (ek: Record<string, unknown>) => { const p = join(d, `m-${Math.random().toString(36).slice(2)}.json`); writeFileSync(p, JSON.stringify({ ...M0, ...ek })); return p; };

  /* 2. eksik izin */
  { const k = kokHazirla(); const r = calis(k, manifest({ izin: { ...izin, belge: "" }, gorseller: [kayit(g.dis, "dis")] }), true);
    t("eksik izin belgesi → hata, yazım yok", r.hata.includes("izin.belge eksik") && !r.eklenen && readFileSync(join(k, "data/real/izinli-fotograflar.json"), "utf8") === readFileSync("data/real/izinli-fotograflar.json", "utf8"));
    const r2 = calis(k, manifest({ izin: { ...izin, kapsam: ["editoryal sosyal medya"] }, gorseller: [kayit(g.dis, "dis")] }), true);
    t("kapsamda restoran profili yok → hata", r2.hata.some((h: string) => /restoran profili/.test(h)) && !r2.eklenen); }

  /* 3–5. tam izin */
  const k = kokHazirla();
  const m = manifest({ izin, gorseller: [
    kayit(g.kahvalti, "kahvalti"), kayit(g.menemen, "menemen"), kayit(g.dis, "dis"), kayit(g.ic, "ic"),
    kayit(g.uretici, "menemen", { icerikUretici: true, hakSahibi: "Menemen", ceken: "@bir_icerik_uretici" }),
    kayit(g.baska, "kahvalti", { hakSahibi: "Ajans X" }),
    kayit(g.kapsamDisi, "ic", { izinKapsaminda: false }),
    kayit(join(d, "yok.jpg"), "dis"),
  ] });
  const kuru = calis(k, m, false);
  t("kuru çalıştırma yazmaz", !kuru.eklenen && readFileSync(join(k, "data/real/izinli-fotograflar.json"), "utf8") === readFileSync("data/real/izinli-fotograflar.json", "utf8"));
  t("kuru çalıştırma 4 kabul, 4 ret", kuru.kabul.length === 4 && kuru.ret.length === 4, JSON.stringify(kuru));
  t("sıra: dış cephe, iç mekân, menemen, kahvaltı", JSON.stringify(kuru.kabul.map((x: string) => x.split(":")[0])) === JSON.stringify(["dis", "ic", "menemen", "kahvalti"]));
  t("içerik üreticisi reddedildi", kuru.ret.some((x: string) => x.includes("uretici.jpg") && /içerik üreticisi/.test(x)));
  t("başka hak sahibi reddedildi", kuru.ret.some((x: string) => x.includes("baska.jpg") && /hak sahibi/.test(x)));
  t("kapsam dışı reddedildi", kuru.ret.some((x: string) => x.includes("kapsam.jpg") && /kapsam/.test(x)));
  t("dosyası olmayan reddedildi", kuru.ret.some((x: string) => x.includes("yok.jpg") && /dosya/.test(x)));
  const r = calis(k, m, true);
  t("4 görsel eklendi", r.eklenen?.length === 4 && r.eklenen.every((x: { ok: boolean }) => x.ok), JSON.stringify(r.eklenen));
  const reg = J(join(k, "data/real/izinli-fotograflar.json")); const eski = new Set(G.map((p: { src: string }) => p.src)); const liste = (reg["menemen-besiktas"] ?? []).filter((p: { src: string }) => !eski.has(p.src));
  t("galeride 4 kayıt, kategoriler dis/ic/yemek/yemek", liste.length === 4 && JSON.stringify(liste.map((p: { category: string }) => p.category)) === JSON.stringify(["dis", "ic", "yemek", "yemek"]));
  for (const p of liste) {
    t(`${p.src}: künye`, p.credit === "Menemen arşivi");
    t(`${p.src}: hak kaydı (veren, tarih, belge, kapsam, hak sahibi, kaynak)`, ["isletme-izni:", "Deneme Yetkili", "2026-11-13", "deneme-izin-formu.pdf", "restoran profili", "hak sahibi: Menemen", "kaynak: işletmenin"].every((s) => p.rightsRef.includes(s)) && p.rightsRef.startsWith("isletme-izni: yazılı izin"), p.rightsRef);
    t(`${p.src}: addedBy işletme`, p.addedBy === "işletme");
    for (const w of [480, 960, 1440]) {
      const f = join(k, "public", p.src.replace("-960.webp", `-${w}.webp`));
      t(`${p.src}: ${w} WebP var`, existsSync(f));
      if (existsSync(f)) { const md = await sharp(f).metadata(); t(`${p.src}: ${w} EXIF yok`, !md.exif && md.format === "webp" && (md.width ?? 0) <= w); }
    }
  }
  t("içerik üreticisi görseli galeride yok", !liste.some((p: { alt: string }) => /uretici/.test(p.alt)));
  t("diğer işletmelerin ve mevcut Menemen kayıtlarının fotoğrafları aynı", Object.keys(REG).every((s) => s === "menemen-besiktas" ? REG[s].every((p: unknown, i: number) => JSON.stringify(reg[s][i]) === JSON.stringify(p)) : JSON.stringify(reg[s]) === JSON.stringify(REG[s])));
  t("kayıt dosyasının girinti biçimi korunuyor", /^\{\n "/.test(readFileSync(join(k, "data/real/izinli-fotograflar.json"), "utf8")));
  const r3 = calis(k, m, true); const reg3 = J(join(k, "data/real/izinli-fotograflar.json"));
  t("tekrar çalıştırma çoğaltmaz", r3.eklenen?.length === 4 && (reg3["menemen-besiktas"] ?? []).length === G.length + 4);
  t("depodaki kayıt dosyası değişmedi", JSON.stringify(J("data/real/izinli-fotograflar.json")) === JSON.stringify(REG));
  console.log(`Menemen galeri izni: ${ok} geçti, ${fail} kaldı`); process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
