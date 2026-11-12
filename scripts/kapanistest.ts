/* Kapanış işaretleri paketi testi.
   1. Kararlar: kapsam, tür, güven, kimlik, kanıt (kaynak, bağlantı, tarih, güç), Google bağlantısı yok.
   2. Kural: tek sinyalle kesin kapanış yok; isim değişikliği kapanış sayılmaz; yeni işletme eski profile yazılmaz.
   3. Kuru çalıştırmadaki 7 kural değişikliği AYRI AYRI: yalnız o kayıt, yalnız beklenen alanlar, beklenen değer.
   4. Sahip kararları varsayılan çalıştırmada uygulanmaz; yalnız --sahip ile ve yalnız onaylanan kayıt.
   5. Katalogdaki 792 kaydın kimlik ve diğer bilgileri korunur (veri dosyaları bayt bayt aynı, kapanış durumu yalnız hedeflerde değişir).
   6. Tekrar çalıştırma: dosya bayt bayt aynı kalır, değişiklik sayısı 0.
   Kullanım: npx tsx scripts/kapanistest.ts [data/katalog/kapanis/kapanis-kararlari-2026-11-12.json] */
import { readFileSync, readdirSync, mkdtempSync, cpSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { realEntities } from "../data/real/index";
const kp = process.argv[2] ?? "data/katalog/kapanis/kapanis-kararlari-2026-11-12.json";
const J = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const K = J(kp), KAP = J("data/real/kapanis.json"), V = J("data/real/venues.json") as Record<string, any>[];
const bySlug = new Map(V.map((v) => [v.slug, v]));
let ok = 0, fail = 0; const t = (ad: string, kosul: boolean, not = "") => { if (kosul) ok++; else { fail++; console.log("KALDI:", ad, not); } };
const kayitlar = Object.entries(KAP).filter(([k]) => !k.startsWith("_")) as [string, any][];
const GOOGLE_URL = /google\.|goo\.gl|maps\.app/i;
const tumKararlar: [string, any][] = [...K.kural.map((x: any) => [x.slug, x]), ...K.sahip.map((x: any) => [x.slug, x]), ...Object.entries(K.kalsin), ...Object.entries(K.acikIsaret)];

/* 1. kararlar */
const supheli = kayitlar.filter(([, r]) => r.state === "closed_suspected").map(([s]) => s);
const karar = new Set([...K.kural.map((x: any) => x.slug), ...K.sahip.map((x: any) => x.slug), ...Object.keys(K.kalsin)]);
t("şüpheli kayıt sayısı 17", supheli.length === 17, `${supheli.length}`);
for (const s of supheli) t(`${s}: şüpheli kayıt karar aldı`, karar.has(s));
t("her kayıt tek kararda", new Set(tumKararlar.map(([s]) => s)).size === tumKararlar.length);
for (const [s, x] of tumKararlar) {
  const v = bySlug.get(s);
  t(`${s}: katalogda`, !!v);
  t(`${s}: tür ve güven yazılı`, !!x.tur && ["yüksek", "orta", "düşük"].includes(x.guven));
  t(`${s}: kimlik katalogla aynı`, x.kimlik?.ad === v?.name && x.kimlik?.ilce === v?.district && x.kimlik?.adres === (v?.address ?? null) && x.kimlik?.telefon === (v?.phone ?? null));
  for (const k of x.kanitlar ?? []) {
    t(`${s}: kanıtta kaynak, tarih, güç, sinyal`, !!k.kaynak && /^\d{4}-\d\d-\d\d$/.test(k.tarih) && ["güçlü", "zayıf"].includes(k.guc) && ["kapanış", "açık", "isim", "taşınma", "kimlik"].includes(k.sinyal), JSON.stringify(k));
    t(`${s}: Google dışı kanıtta bağlantı var`, /^Google/.test(k.kaynak) || /^https?:\/\//.test(k.url ?? ""));
    t(`${s}: Google bağlantısı kanıt değil`, !GOOGLE_URL.test(k.url ?? ""));
    t(`${s}: bu pakette yeni Google okuması yok`, !/^Google/.test(k.kaynak) || /önceki/.test(k.kaynak));
  }
}
/* 2. kurallar */
for (const x of K.sahip) {
  const kap = (x.kanitlar as any[]).filter((k) => k.sinyal === "kapanış");
  if (x.yama.state === "closed_confirmed") {
    t(`${x.slug}: kesin kapanış en az iki bağımsız sinyalle`, new Set(kap.map((k) => k.kaynak.replace(/ \(.*$/, ""))).size >= 2);
    t(`${x.slug}: kesin kapanışta Google dışı güçlü sinyal`, kap.some((k) => !/^Google/.test(k.kaynak) && k.guc === "güçlü"));
    t(`${x.slug}: şube kapanışı marka kapanışından ayrı`, x.tur !== "şube kapanışı" || /marka açık/i.test(x.oneri + x.yama.note));
  }
  if (x.yama.state === "reopened") t(`${x.slug}: yeniden açık için resmî güçlü açık sinyali`, (x.kanitlar as any[]).some((k) => k.sinyal === "açık" && k.guc === "güçlü" && /Resmî/.test(k.kaynak)));
  if (/isim/.test(x.tur)) t(`${x.slug}: isim değişikliğinde ad profile yazılmıyor`, !("name" in x.yama) && /ayrı .*karar/i.test(x.oneri));
  t(`${x.slug}: kimlik kanıtı ve görünür etki yazılı`, !!x.kimlikKaniti && !!x.etki);
}
t("kural satırlarında kesin kapanış üretilmiyor", K.kural.every((x: any) => x.islem !== "yeni-supheli" || x.kayit.state === "closed_suspected"));
t("isim/yeni işletme sinyali kapanış sayılmıyor (Yako)", K.kesinKapanis.find((x: any) => x.slug === "yako-balik-kadikoy")?.sinif.startsWith("isim"));
t("yeni işletme eski profile yazılmıyor (Kalis Lokanta)", !JSON.stringify(K.kural.concat(K.sahip)).includes('"name":') && /dönüştürülmez/.test(K.kural.find((x: any) => x.slug === "yako-balik-kadikoy").ek));
t("35 kesin kapanış sınıflandı", K.kesinKapanis.length === kayitlar.filter(([, r]) => r.state === "closed_confirmed").length);
/* sahip kararı (2026-11-12): tek Google sinyalli kesin kapanışlar kesin kalır; paket bunlara dokunmaz */
const tekSinyal = K.kesinKapanis.filter((x: any) => x.sinif === "yalnız Google (tek sinyal)").map((x: any) => x.slug);
const kk = K.sahipKararlari?.find((k: any) => /tek sinyal/.test(k.konu));
t("sahip kararı kayıtlı: tek sinyalli kesin kapanışlar kesin kalsın", kk?.karar === "kesin kalsın" && kk.tarih === "2026-11-12" && !!kk.kaynak);
t("sahip kararının kapsamı listeyle aynı (27)", tekSinyal.length === 27 && JSON.stringify(kk?.kayitlar) === JSON.stringify(tekSinyal));
for (const s of tekSinyal) {
  t(`${s}: kesin kapalı ve sahip kararı işli`, KAP[s]?.state === "closed_confirmed" && K.kesinKapanis.find((x: any) => x.slug === s).sahipKarari === "kesin kalsın");
  t(`${s}: pakette bu kayda değişiklik yok`, !K.kural.some((x: any) => x.slug === s) && !K.sahip.some((x: any) => x.slug === s));
}

/* geçici kopya: data/real tamamı + betik */
const hash = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const kopya = () => { const d = mkdtempSync(join(tmpdir(), "kapanistest-")); cpSync("data/real", join(d, "data/real"), { recursive: true }); cpSync("scripts/katalog/kapanis-uygula.mjs", join(d, "scripts/katalog/kapanis-uygula.mjs")); cpSync(kp, join(d, "k.json")); return d; };
const calis = (d: string, ...ek: string[]) => JSON.parse(execFileSync("node", ["scripts/katalog/kapanis-uygula.mjs", "k.json", "--yaz", ...ek], { cwd: d, encoding: "utf8" }));
const veriDosyalari = readdirSync("data/real").filter((f) => f !== "kapanis.json" && !f.endsWith(".ts"));
const onceHash = Object.fromEntries(veriDosyalari.map((f) => [f, hash(`data/real/${f}`)]));
const farkli = (a: any, b: any) => Object.keys({ ...a, ...b }).filter((k) => JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k]));

/* 3. yedi kural değişikliği ayrı ayrı */
t("kural değişikliği sayısı 7", K.kural.length === 7);
for (const x of K.kural) {
  const d = kopya(); const r = calis(d, `--yalniz=${x.slug}`); const out = J(join(d, "data/real/kapanis.json"));
  t(`[${x.slug}] tek değişiklik`, r.kural === 1 && r.sahip === 0 && r.atlanan.length === 0, JSON.stringify(r));
  const degisen = Object.keys({ ...KAP, ...out }).filter((s) => JSON.stringify(KAP[s]) !== JSON.stringify(out[s]));
  t(`[${x.slug}] yalnız bu kayıt değişti`, JSON.stringify(degisen) === JSON.stringify([x.slug]), degisen.join(","));
  if (x.islem === "yeni-supheli") {
    t(`[${x.slug}] yeni şüphe beklenen kayıtla aynı`, JSON.stringify(out[x.slug]) === JSON.stringify(x.kayit));
    t(`[${x.slug}] yeni kayıt kesin kapalı değil`, out[x.slug].state === "closed_suspected");
  } else {
    const once = KAP[x.slug], sonra = out[x.slug];
    t(`[${x.slug}] yalnız note/sources değişti`, farkli(once, sonra).every((k) => ["note", "sources"].includes(k)), farkli(once, sonra).join(","));
    t(`[${x.slug}] state ve checkedAt aynı`, sonra.state === once.state && sonra.checkedAt === once.checkedAt);
    t(`[${x.slug}] not beklenen değerde`, sonra.note === `${once.note} · ${x.ek}`);
    t(`[${x.slug}] kaynaklar eski + yeni`, JSON.stringify(sonra.sources ?? []) === JSON.stringify([...(once.sources ?? []), ...(x.sources ?? []).filter((u: string) => !(once.sources ?? []).includes(u))]));
  }
  for (const f of veriDosyalari) t(`[${x.slug}] ${f} bayt bayt aynı`, hash(join(d, "data/real", f)) === onceHash[f]);
  const r2 = calis(d, `--yalniz=${x.slug}`); t(`[${x.slug}] tekrar çalıştırma değişiklik yapmıyor`, r2.kural === 0 && JSON.stringify(J(join(d, "data/real/kapanis.json"))) === JSON.stringify(out));
}

/* 4. sahip kararları */
{ const d = kopya(); calis(d); const out = J(join(d, "data/real/kapanis.json"));
  for (const x of K.sahip) t(`${x.slug}: varsayılan çalıştırmada sahip kararı uygulanmadı`, JSON.stringify(out[x.slug]) === JSON.stringify(KAP[x.slug]));
  const r = calis(d, "--sahip=bilinmeyen-slug"); t("bilinmeyen onay raporlanıyor, hiçbir şey uygulanmıyor", r.sahip === 0 && r.bilinmeyenOnay.includes("bilinmeyen-slug")); }
for (const x of K.sahip) {
  const d = kopya(); const r = calis(d, `--sahip=${x.slug}`); const out = J(join(d, "data/real/kapanis.json"));
  t(`[${x.slug}] tek onay yalnız onu uygular`, r.sahip === 1);
  const digerSahip = K.sahip.filter((y: any) => y.slug !== x.slug); for (const y of digerSahip) t(`[${x.slug}] ${y.slug} değişmedi`, JSON.stringify(out[y.slug]) === JSON.stringify(KAP[y.slug]));
  t(`[${x.slug}] yama uygulandı, Google alanı ve eski not korundu`, out[x.slug].state === x.yama.state && out[x.slug].google === KAP[x.slug].google && out[x.slug].note.includes(KAP[x.slug].note));
  const r2 = calis(d, `--sahip=${x.slug}`); t(`[${x.slug}] sahip kararı tekrar çalıştırmada değişmiyor`, r2.sahip === 0 && r2.kural === 0 && JSON.stringify(J(join(d, "data/real/kapanis.json"))) === JSON.stringify(out));
}

/* 5. 792 kaydın korunması ve 6. tam tekrar çalıştırma */
const kimlik = (e: any) => JSON.stringify([e.id, e.slug, e.name, e.categoryId, e.subcategory, e.address, e.location, e.contact, e.source, e.tags]);
t("katalogda 792 kayıt", realEntities.length === 792, `${realEntities.length}`);
t("kimlikler tekil", new Set(realEntities.map((e) => e.id)).size === 792 && new Set(realEntities.map((e) => e.slug)).size === 792);
for (const mod of [[], ["--sahip=hepsi"]]) {
  const d = kopya(); calis(d, ...mod); const out = J(join(d, "data/real/kapanis.json")); const h1 = hash(join(d, "data/real/kapanis.json"));
  const ad = mod.length ? "kural + sahip" : "kural";
  for (const f of veriDosyalari) t(`(${ad}) ${f} bayt bayt aynı`, hash(join(d, "data/real", f)) === onceHash[f]);
  const hedef = new Set([...K.kural.map((x: any) => x.slug), ...(mod.length ? K.sahip.map((x: any) => x.slug) : [])]);
  let degisenKayit = 0, beklenmeyen: string[] = [];
  for (const e of realEntities) { const a = KAP[e.slug], b = out[e.slug]; if (JSON.stringify(a) !== JSON.stringify(b)) { degisenKayit++; if (!hedef.has(e.slug)) beklenmeyen.push(e.slug); } }
  t(`(${ad}) 792 kayıttan yalnız hedeflerin kapanış kaydı değişti`, beklenmeyen.length === 0 && degisenKayit === hedef.size, `${degisenKayit} / ${beklenmeyen.join(",")}`);
  t(`(${ad}) kapanış dosyasında katalog dışı slug yok`, Object.keys(out).filter((s) => !s.startsWith("_")).every((s) => bySlug.has(s)));
  t(`(${ad}) açıklama alanı korundu`, out._aciklama === KAP._aciklama);
  const r2 = calis(d, ...mod); t(`(${ad}) tekrar çalıştırma: 0 değişiklik`, r2.kural === 0 && r2.sahip === 0, JSON.stringify(r2));
  t(`(${ad}) tekrar çalıştırma: dosya bayt bayt aynı`, hash(join(d, "data/real/kapanis.json")) === h1);
}
const ent2 = realEntities.map(kimlik); t("792 kaydın kimlik alanları okunabilir ve tam", ent2.every((s) => s.length > 10));
console.log(`kapanış: ${ok} geçti, ${fail} kaldı`); process.exit(fail ? 1 : 0);
