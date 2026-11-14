/* Semt rehberi pilotu (Kadıköy, Beyoğlu rotası, Tarihî Yarımada) — içerik kuralları:
   1. Seçki şeması (iki dil, yapı ve rakam eşitliği), tür "semt", durum "kontrol": Production'da görünmez, Preview/yerelde görünür.
   2. Her mekân Production kataloğunda gerçek kayıt + content/profiles profili; semt adı katalog ilçesiyle tutarlı.
   3. Sıralama/popülerlik dili yok ("en iyi", "en popüler", "1 numara", "top", "best" ...); puan alanı yok.
   4. Her mekân için işletmenin kendi kaynağı (kind=isletme) ve Gidenler profili kaynakta; işletme kaynağının alan adı profildeki resmî kaynakla aynı.
   5. Gövdedeki her fiyat ve tarih, o mekânın profilinde (menü, not ya da açıklama) geçiyor — uydurma rakam yok.
   6. Sahiplik/kurucu ilişkisi olan mekân (Japon Erdal) rehberde yok; ticari ilişki doğrulanmadığı için yayımlanamaz durumda.
   7. Kapak: hakkı doğrulanmış görsel yoksa "yok" ve gerekçe.
   Kullanım: npx tsx scripts/semt-rehber-test.ts */
import { readFileSync, existsSync } from "node:fs";
import { entities } from "../data/entities";
import { ALL_ARTICLES, articles, articleBySlug, reviewVisible } from "../lib/seckisi";

let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, not); } };
const SLUGS: Record<string, string[]> = {
  "kadikoyde-nerede-ne-yenir": ["Kadıköy"],
  "beyoglu-gastronomi-rotasi-karakoyden-cihangire": ["Beyoğlu"],
  "tarihi-yarimadanin-koklu-sofralari": ["Fatih"],
};
/* profilde değil, işletmenin sitesinde geçen ve yazıda kaynağıyla anılan rakamlar */
const OUTSIDE: Record<string, string> = { "lokanta-1741-fatih:300": "lokanta1741.com/en/about/ — \"Cagaloglu Hammam's 300-year-old history\" (14.11.2026)" };
const host = (u: string) => new URL(u).host.replace(/^www\./, "");
const RANK = /\b(en iyi|en iyisi|en popüler|en çok|bir numara|1 numara|top ?\d+|best|most popular|number one|must[- ]try)\b/i;
t("yerel geliştirme modunda kontrol görünür (test ortamı)", reviewVisible({ NODE_ENV: "development" }) && !reviewVisible({ VERCEL_ENV: "production", NODE_ENV: "production" }));

for (const [slug, districts] of Object.entries(SLUGS)) {
  const a = ALL_ARTICLES.find((x) => x.slug === slug);
  t(`${slug}: dizinde`, !!a);
  if (!a) continue;
  t(`${slug}: semt + kontrol + yayın tarihi yok`, a.kind === "semt" && a.status === "kontrol" && a.publishedAt === null && !a.featured);
  t(`${slug}: Production'da görünmez`, !articles(false).includes(a) && articleBySlug(slug, false) === null);
  t(`${slug}: Preview'da görünür`, articles(true).includes(a));
  t(`${slug}: ticari ilişki doğrulanmadı → yayımlanamaz`, a.commercial.state === "dogrulanmadi" && a.ownership === null);
  t(`${slug}: ziyaret iddiası yok`, a.editorial.visited === false);
  t(`${slug}: sıralama dili yok uyarısı`, !!a.notice && /sıralama değil/.test(a.notice.tr) && /not a ranking/.test(a.notice.en));
  t(`${slug}: puan alanı yok`, !a.ranking);
  t(`${slug}: kapak hakkı yoksa gerekçe`, a.cover.state === "yok" ? a.cover.gap.tr.length > 10 : true);
  const text = (l: "tr" | "en") => [a.title[l], a.dek[l], a.why[l], ...a.body[l].map((b) => ("h" in b ? b.h : "p" in b ? b.p : b.list.join(" "))), ...a.know[l]].join(" \n ");
  t(`${slug}: sıralama/popülerlik ifadesi yok`, !RANK.test(text("tr")) && !RANK.test(text("en")), (text("tr").match(RANK) ?? text("en").match(RANK) ?? [""])[0]);
  t(`${slug}: en az 4 mekân`, a.venues.length >= 4);
  t(`${slug}: Japon Erdal (sahiplik ilişkisi) yok`, !a.venues.some((v) => v.slug === "japon-erdal-beyoglu"));
  for (const v of a.venues) {
    const e = entities.find((x) => x.slug === v.slug);
    t(`${slug}/${v.slug}: Production kataloğunda gerçek kayıt`, !!e && e.isReal === true);
    t(`${slug}/${v.slug}: ilçe ${districts.join("/")}`, !!e && districts.includes(e.location?.district ?? ""), e?.location?.district);
    const pf = `content/profiles/${v.slug}.json`;
    t(`${slug}/${v.slug}: profil var`, existsSync(pf));
    if (!existsSync(pf)) continue;
    const p = JSON.parse(readFileSync(pf, "utf8"));
    const name = e!.name;
    const heads = a.body.tr.filter((b) => "h" in b).map((b) => (b as { h: string }).h);
    t(`${slug}/${v.slug}: gövdede kendi başlığı`, heads.some((h) => h.includes(name.split(" - ")[0].split(" ")[0])), name);
    const official = [p.description, p.address, p.phone, p.website, p.hours, p.reservation, p.menu].filter(Boolean).map((f: { url: string }) => host(f.url));
    t(`${slug}/${v.slug}: işletme kaynağı profildeki resmî alan adından`, a.sources.some((s) => s.kind === "isletme" && official.includes(host(s.url))), official.join(","));
    t(`${slug}/${v.slug}: Gidenler profili kaynakta`, a.sources.some((s) => s.kind === "gidenler" && s.url === `https://www.gidenler.com/mekan/${v.slug}/`));
  }
  /* 5 — gövde ve "gitmeden bilin"deki rakamlar profilden: her mekân bölümündeki 3+ haneli sayılar o mekânın profil metninde geçmeli */
  const blocks = a.body.tr;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (!("h" in b)) continue;
    const v = a.venues.find((x) => { const e = entities.find((y) => y.slug === x.slug)!; return b.h.includes(e.name.split(" - ")[0].split(" ")[0]); });
    const para = blocks[i + 1] && "p" in blocks[i + 1] ? (blocks[i + 1] as { p: string }).p : "";
    if (!v) continue;
    const raw = readFileSync(`content/profiles/${v.slug}.json`, "utf8");
    const p = JSON.parse(raw);
    const pool = [raw, ...((p.menu?.sections ?? []) as { items: { priceTry?: number }[] }[]).flatMap((s) => s.items.map((it) => String(it.priceTry ?? "")))].join(" ").replace(/[.,]/g, "");
    const date = (d: string) => d.split(".").reverse().join("-");
    for (const n of para.match(/\d{1,2}\.\d{2}\.\d{4}|\d[\d.]{2,}\d|\b\d{3,4}\b/g) ?? []) {
      const ok2 = /^\d{2}\.\d{2}\.\d{4}$/.test(n) ? raw.includes(date(n)) : pool.includes(n.replace(/\./g, "")) || OUTSIDE[`${v.slug}:${n}`] !== undefined;
      t(`${slug}: "${n}" (${v.slug}) profilde geçiyor`, ok2);
    }
  }
}
console.log(`semt rehberi: ${ok}/${ok + fail}`);
process.exit(fail ? 1 : 0);
