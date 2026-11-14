/* Canlı 26 profil kalite denetiminin (14.11.2026) düzeltmeleri — yalnız sunum katmanı, veri değişmez:
   1. Üst eylem satırı profil verisiyle çalışır: profilde telefon/site varsa "Ara"/"Web sitesi" çıkar (önce yalnız katalog kaydına bakıyordu;
      Kanaat, 1924, Nicole, Selim Usta, TURK'ta "Ara", Mikla ve Nicole'de "Web sitesi" eksikti).
   2. Profilde rezervasyon bilgisi varsa üstte "Rezervasyon bilgisi" bağlantısı (#bilgi) çıkar; "rezervasyon yap" denmez.
   3. Menüyü ilgilendiren notlar (temsilî menü, fiyat geçerliliği, ayrı menüler) menünün hemen üstünde de gösterilir.
   4. 30 kalemden uzun menü: ilk bölümler açık, kalanı <details> içinde; bütün ürün adları ve fiyatlar HTML'de kalır.
   5. Menüsüz profil: örnek menü yok; resmî site varsa ona bağlantı.
   6. Saat biçimi: "12:00-15:00,18:00-02:00" → "12.00–15.00, 18.00–02.00".
   7. 70 profilin hepsi için: üst eylem satırında profil telefonu/sitesi kayıpsız; menülü her profilde HTML bütün kalemleri içerir.
   Kullanım: npx tsx scripts/profil-kalite-p0-test.ts */
import { readFileSync, readdirSync } from "node:fs";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { entities } from "../data/entities";
import { ProfileInput, type PlaceProfile } from "../lib/profile";
import { ProfileMenu, ProfileNoMenu, menuNotes, withProfile } from "../components/venue/profile/ProfileSections";
import { trHours } from "../components/venue/VenueInfo";
import { RealVenueNotice } from "../components/venue/VenueBadges";

(globalThis as { React?: typeof React }).React = React;
let ok = 0, fail = 0;
const t = (ad: string, kosul: boolean, not = "") => { if (kosul) ok++; else { fail++; console.log("KALDI:", ad, not); } };
const un = (h: string) => h.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/* dosyadaki profili sayfanın okuduğu biçime çevir (DB'den okunan PlaceProfile ile aynı alanlar) */
function prof(slug: string): PlaceProfile {
  const { videos, _kaynak_notu, ...raw } = JSON.parse(readFileSync(`content/profiles/${slug}.json`, "utf8")); void videos; void _kaynak_notu;
  const p = ProfileInput.parse(raw);
  return { ...p, notes: p.notes ?? [], amenities: p.amenities ?? null, menu: p.menu ?? null } as unknown as PlaceProfile;
}
const ent = (slug: string) => { const e = entities.find((x) => x.slug === slug); if (!e) throw new Error("kayıt yok: " + slug); return e; };
const hero = (slug: string) => {
  const p = prof(slug);
  return un(renderToStaticMarkup(createElement(RealVenueNotice, { entity: withProfile(ent(slug), p), hasMenu: !!p.menu, hasReservationInfo: !!p.reservation, mapsUrl: "https://maps.example/x" })));
};

/* 1 — üst eylem satırı */
for (const s of ["kanaat-lokantasi-uskudar", "1924-istanbul-beyoglu", "nicole-beyoglu", "tarihi-sultanahmet-koftecisi-selim-usta-fatih", "turk-fatih-tutak-sisli"]) {
  const tel = prof(s).phone!.value.replace(/[^+\d]/g, "");
  t(`${s}: üstte Ara profil telefonuyla`, hero(s).includes(`href="tel:${tel}"`), tel);
  t(`${s}: katalogda telefon yoktu (düzeltmenin nedeni)`, !ent(s).contact?.phone);
}
for (const s of ["mikla-turkey-fusion-beyoglu", "nicole-beyoglu"]) t(`${s}: üstte Web sitesi`, hero(s).includes(`href="${prof(s).website!.value}"`) && hero(s).includes("Web sitesi"));
const page = readFileSync("app/mekan/[slug]/page.tsx", "utf8");
t("sayfa: RealVenueNotice profil işlenmiş kaydı (ent) alıyor", /<RealVenueNotice entity=\{ent\}/.test(page) && !/<RealVenueNotice entity=\{entity\}/.test(page));
t("sayfa: menü bileşenine notlar veriliyor", page.includes("<ProfileMenu m={rp.menu} notes={rp.notes} />"));
t("sayfa: menüsüz profil ProfileNoMenu ile", page.includes("<ProfileNoMenu website={ent.contact?.website} />"));

/* 2 — rezervasyon bilgisi bağlantısı */
t("Ulus 29: Rezervasyon bilgisi → #bilgi", hero("ulus-29-besiktas").includes('href="#bilgi"') && hero("ulus-29-besiktas").includes("Rezervasyon bilgisi"));
t("Hacı Abdullah (rezervasyon alanı yok): bağlantı yok", !hero("haci-abdullah-beyoglu").includes("Rezervasyon bilgisi"));
t("'rezervasyon yap' denmiyor", !/rezervasyon yap/i.test(hero("ulus-29-besiktas")));
t("sayfada #bilgi çapası var", page.includes('id="bilgi"'));

/* 3 — menü notları */
const murver = prof("murver-beyoglu");
const hm = un(renderToStaticMarkup(createElement(ProfileMenu, { m: murver.menu!, notes: murver.notes })));
t("Mürver: 'temsilî' notu menünün içinde", /data-menu-notlari[\s\S]*temsilî/.test(hm));
t("Mürver: not metni değişmeden", murver.notes.filter((n) => /temsil/.test(n.value)).every((n) => hm.includes(n.value)));
t("Mikla: temsilî menü notu menüde", menuNotes(prof("mikla-turkey-fusion-beyoglu").notes).some((n) => /temsil/.test(n.value)));
t("Ulus 29: fiyat geçerlilik notu menüde", menuNotes(prof("ulus-29-besiktas").notes).some((n) => /07\.07\.2026/.test(n.value)));
t("Topaz: Eylül 2026 güncelleme notu menüde", menuNotes(prof("topaz-beyoglu").notes).some((n) => /Eylül 2026/.test(n.value)));
t("Mürver: otopark notu menüye taşınmıyor", !menuNotes(murver.notes).some((n) => /otopark/i.test(n.value)));
t("not verilmezse eski davranış (Menemen testi uyumu)", !un(renderToStaticMarkup(createElement(ProfileMenu, { m: murver.menu! }))).includes("data-menu-notlari"));

/* 4 — uzun menü katlama + 7 bütün profiller */
let menulu = 0, kayipsiz = 0, katli = 0;
for (const f of readdirSync("content/profiles")) {
  const s = f.replace(/\.json$/, "");
  const p = prof(s);
  if (p.menu) {
    menulu++;
    const h = un(renderToStaticMarkup(createElement(ProfileMenu, { m: p.menu, notes: p.notes })));
    const items = p.menu.sections.flatMap((x) => x.items);
    const all = items.every((it) => h.includes(it.name)) && p.menu.sections.every((x) => h.includes(x.title));
    if (all) kayipsiz++; else t(`${s}: menü HTML'i bütün kalemleri içeriyor`, false);
    const n = items.length, det = h.includes("data-menu-devami");
    t(`${s}: katlama yalnız 30+ kalemde (${n})`, det === n > 30);
    if (det) {
      katli++;
      /* açık kısım: katlama işaretinden önce başlığı geçen bölümler (aynı ürün adı iki bölümde olabilir; bölüm sayılır) */
      const mark = h.indexOf("data-menu-devami");
      const head = (x: { title: string }) => h.indexOf(`aria-label="${x.title}"`);
      const openSecs = p.menu.sections.filter((x) => head(x) >= 0 && head(x) < mark);
      const open = openSecs.reduce((a, x) => a + x.items.length, 0);
      t(`${s}: bölümler sırayla ayrılıyor`, p.menu.sections.slice(0, openSecs.length).every((x, i) => x === openSecs[i]));
      t(`${s}: açık kısım 14+ kalem, katlanan kısım boş değil`, open >= 14 && open < n, `${open}/${n}`);
      t(`${s}: özet doğru sayıyı söylüyor`, h.includes(`Menünün devamı · ${n - open} kalem daha`));
    }
  }
  /* 7 — üst eylem satırı her profilde profil telefonu/sitesiyle */
  const e = entities.find((x) => x.slug === s);
  if (!e) continue;
  const h = un(renderToStaticMarkup(createElement(RealVenueNotice, { entity: withProfile(e, p), hasMenu: !!p.menu, hasReservationInfo: !!p.reservation })));
  const tel = (p.phone?.value ?? e.contact?.phone)?.replace(/[^+\d]/g, "");
  if (tel) t(`${s}: Ara`, h.includes(`href="tel:${tel}"`));
  const site = p.website?.value ?? e.contact?.website;
  if (site) t(`${s}: Web sitesi`, h.includes(`href="${site}"`));
}
t(`menülü profillerin hepsi kayıpsız (${kayipsiz}/${menulu})`, kayipsiz === menulu && menulu >= 20);
t(`en az iki uzun menü katlanıyor (${katli})`, katli >= 2);

/* 5 — menüsüz profil */
const nm = un(renderToStaticMarkup(createElement(ProfileNoMenu, { website: "https://www.turkft.com" })));
t("menüsüz: örnek menü yok uyarısı korunuyor", nm.includes("Örnek menü ya da fiyat gösterilmez."));
t("menüsüz: resmî siteye bağlantı", nm.includes('href="https://www.turkft.com"') && nm.includes("turkft.com ↗"));
t("menüsüz, site yok: bağlantı yok", !un(renderToStaticMarkup(createElement(ProfileNoMenu, {}))).includes("href="));

/* 6 — saat biçimi */
t("iki servis", trHours("Mo-Fr 12:00-15:00,18:00-02:00; Sa-Su 18:00-02:00") === "Pzt-Cum 12.00–15.00, 18.00–02.00 · Cmt-Paz 18.00–02.00", trHours("Mo-Fr 12:00-15:00,18:00-02:00; Sa-Su 18:00-02:00"));
t("her gün", trHours("Mo-Su 07:00-22:30") === "Her gün 07.00–22.30");
t("gün listesi virgülleri", trHours("Mo,We,Th 16:00-00:00; Fr-Su 12:00-00:00").startsWith("Pzt,Çar,Per 16.00–00.00"), trHours("Mo,We,Th 16:00-00:00; Fr-Su 12:00-00:00"));
t("kapalı", trHours("Mo-Sa 12:00-00:00; Su off") === "Pzt-Cmt 12.00–00.00 · Paz kapalı", trHours("Mo-Sa 12:00-00:00; Su off"));

console.log(`profil kalite P0: ${ok}/${ok + fail}`);
process.exit(fail ? 1 : 0);
