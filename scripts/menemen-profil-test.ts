/* Menemen Beşiktaş profil testi (yalnız bu profil):
   1. Şema: ProfileInput; fiyat yok (pricesPublished=false, priceTry hiçbir kalemde yok); adres/telefon alanı yok (katalog ve Seçki testleriyle uyum).
   2. Kaynak doğruluğu: her ürün adı ve açıklamadaki her ifade, resmî sitenin arşiv metninde (data/katalog/menemen/…) geçiyor.
   3. Video: mevcut gömme ayrıştırıcısı (lib/media/embed) tanıyor; YouTube; reklam etiketi işaretli.
   4. Uygulama: gömülü veritabanında (PGlite) göçler + 793 kayıt + applyProfile → readProfile menüyü, saati, Instagram'ı ve notları döndürüyor; tekrar uygulama çoğaltmıyor.
   5. Menü bileşeni (ProfileMenu) sunucuda HTML üretiyor: bütün bölüm ve ürün adları var, "₺" yok.
   6. Katalog ve Seçki dosyaları Production tabanıyla (9a11a3b) aynı; yalnız bu profil eklendi.
   Kullanım: npx tsx scripts/menemen-profil-test.ts */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { realVenueRecords } from "../data/real";
import { seedRealVenues } from "../lib/db/seed";
import { applyMigrations, type Executor } from "../lib/db/migrate";
import { ProfileInput, applyProfile, readProfile } from "../lib/profile";
import { parseVideoUrl } from "../lib/media/embed";
import type { Db } from "../lib/db/client";
import * as schema from "../lib/db/schema";

let ok = 0, fail = 0; const t = (ad: string, kosul: boolean, not = "") => { if (kosul) { ok++; } else { fail++; console.log("KALDI:", ad, not); } };
const file = JSON.parse(readFileSync("content/profiles/menemen-besiktas.json", "utf8"));
const ARSIV = JSON.parse(readFileSync("data/katalog/menemen/resmi-site-arsiv-2024-01-20.json", "utf8"));
const { videos, _kaynak_notu, ...raw } = file;
const p = ProfileInput.parse(raw);
const items = p.menu!.sections.flatMap((s) => s.items);

/* 1. şema ve fiyat */
t("slug", p.slug === "menemen-besiktas");
t("kaynak notu var", typeof _kaynak_notu === "string" && /Google verisi kullanılmadı/.test(_kaynak_notu));
t("fiyat yayımlanmıyor", p.menu!.pricesPublished === false && items.every((i) => i.priceTry === undefined));
t("menü 6 bölüm, 45 ürün", p.menu!.sections.length === 6 && items.length === 45, `${p.menu!.sections.length} / ${items.length}`);
t("adres ve telefon alanı yok (çelişkili/aynı bilgi profile yazılmaz)", !("address" in raw) && !("phone" in raw) && !("website" in raw));
t("kaynaklar resmî: site arşivi ya da resmî Instagram", [p.description, p.instagram, p.hours, ...(p.notes ?? []), p.menu].every((f) => f && ((f.provider === "official_site" && f.url === ARSIV.kaynak) || (f.provider === "official_social" && f.url === "https://www.instagram.com/menemenbreakfast/"))));
t("Google bağlantısı yok", !/google\.|goo\.gl/i.test(JSON.stringify(file)));

/* 2. kaynak doğruluğu (yazım düzeltmeleri dışında birebir) */
const fold = (s: string) => s.toLocaleLowerCase("tr").replace(/nuttella/g, "nutella").replace(/fısdık/g, "fıstık").replace(/istğe/g, "isteğe").replace(/partakal/g, "portakal").replace(/tereyağ(?!ı)/g, "tereyağı").replace(/[^a-zçğıöşü0-9]/g, "");
const kaynak = fold(ARSIV.menuMetni);
for (const s of p.menu!.sections) {
  t(`bölüm kaynakta: ${s.title}`, s.title === "Kahvaltı" || kaynak.includes(fold(s.title)));
  for (const it of s.items) {
    t(`ürün kaynakta: ${it.name}`, kaynak.includes(fold(it.name)));
    for (const parca of (it.description ?? "").split(/[.;]\s*/).filter(Boolean)) t(`açıklama kaynakta: ${it.name} — ${parca.slice(0, 40)}`, kaynak.includes(fold(parca)));
  }
}
t("arşiv metninde fiyatlar var ama profile alınmadı", /\d+ TL/.test(ARSIV.menuMetni) && !/\bTL\b|₺/.test(JSON.stringify(p.menu)));

/* 3. video */
t("tek video", Array.isArray(videos) && videos.length === 1);
for (const v of videos ?? []) {
  const e = parseVideoUrl(v.url);
  t(`video tanınıyor: ${v.url}`, e?.platform === "youtube" && e.id === "e6OmpzizSoo");
  t("video içerik üreticisi ve tarih künyede", /Ayaküstü Lezzetler/.test(v.credit) && /2024/.test(v.credit) && /04:22/.test(v.credit));
  t("reklam etiketi işaretli", v.sponsored === true && v.category === "influencer");
}

/* 6. katalog ve Seçki tabanla aynı */
const BASE = "9a11a3b";
for (const f of ["data/real/venues.json", "data/real/isletme.json", "data/real/duzeltmeler.json", "data/real/kapanis.json", "data/real/izinli-fotograflar.json", "content/seckisi/restoranlar.ts", "lib/profile/index.ts", "components/venue/profile/ProfileSections.tsx"]) {
  t(`${f} tabanla aynı`, readFileSync(f, "utf8") === execFileSync("git", ["show", `${BASE}:${f}`], { encoding: "utf8" }));
}
t("katalog 793 kayıt, Menemen bir kez", realVenueRecords.length === 793 && realVenueRecords.filter((r) => r.slug === "menemen-besiktas").length === 1);

async function main() {
  /* 4. gömülü veritabanında uygulama */
  const pg = new PGlite();
  const x: Executor = { async query<T>(s: string) { return (await pg.query(s)).rows as T[]; }, async transaction(ss) { await pg.transaction(async (tx) => { for (const s of ss) if (!s.startsWith("SELECT pg_advisory")) await tx.query(s); }); } };
  const db = drizzlePglite(pg, { schema }) as unknown as Db;
  try {
    await applyMigrations(x); await seedRealVenues(db, realVenueRecords);
    t("uygulamadan önce profil yok", (await readProfile(db, "menemen-besiktas")) === null);
    const a1 = await applyProfile(db, p);
    const pr = await readProfile(db, "menemen-besiktas");
    t("uygulandı", a1.ok === true, JSON.stringify(a1).slice(0, 200));
    t("menü okunuyor: 6 bölüm, 45 ürün, fiyatsız", pr?.menu?.sections.length === 6 && pr.menu.sections.reduce((a, s) => a + s.items.length, 0) === 45 && pr.menu.pricesPublished === false);
    t("bölüm ve ürün sırası korunuyor", pr?.menu?.sections.map((s) => s.title).join("|") === p.menu!.sections.map((s) => s.title).join("|") && pr?.menu?.sections[1].items[0].name === "Menemen");
    t("saat, Instagram, tanıtım ve 2 not", pr?.hours?.value === "09:00-16:00" && pr?.instagram?.value === "menemenbreakfast" && !!pr?.description && pr?.notes.length === 2);
    t("adres kayıttaki gibi kalıyor", pr?.address === undefined);
    const n = async (tb: string) => Number((await pg.query<{ n: number }>(`select count(*)::int as n from ${tb}`)).rows[0].n);
    const m1 = await n("menu_items"), f1 = await n("field_provenance");
    const a2 = await applyProfile(db, p);
    t("tekrar uygulama: çoğalma yok", a2.ok === true && a2.unchanged === true && (await n("menu_items")) === m1 && (await n("field_provenance")) === f1);
    /* 5. menü bileşeni */
    (globalThis as { React?: typeof React }).React = React;
    const { ProfileMenu } = await import("../components/venue/profile/ProfileSections");
    const html = renderToStaticMarkup(createElement(ProfileMenu, { m: pr!.menu! }));
    const unescape = (s: string) => s.replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    const metin = unescape(html);
    t("bileşen bütün bölümleri gösteriyor", p.menu!.sections.every((s) => metin.includes(s.title)));
    t("bileşen bütün ürünleri gösteriyor", items.every((i) => metin.includes(i.name)), items.filter((i) => !metin.includes(i.name)).map((i) => i.name).join(", "));
    t("bileşende fiyat yok", !/₺/.test(metin));
    t("bileşende kaynak bağlantısı", metin.includes("web.archive.org"));
  } finally { await pg.close(); }
  console.log(`Menemen profili: ${ok} geçti, ${fail} kaldı`); process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
