/* Keşif akışı denetimi (14.11.2026, canlı www.gidenler.com, 390 px) — kanıtlanan sorunların düzeltmeleri:
   1. "çiya" yazım düzeltmesiyle "Ziya" mahallesine çevriliyor, Başakşehir'deki ilgisiz bir kayıt çıkıyordu.
      Restoran adında aynen geçen kelime artık düzeltilmez.
   2. "sultanahmet köfte": Divanyolu'ndaki Tarihi Sultanahmet Köftecisi Selim Usta 3. sıradaydı (Kadıköy ve Eyüpsultan'daki
      benzer adlı işletmeler önde; yalnız ad daha kısa olduğu için). Konumlu sorguda aynı ad düzeyinde konumu tutan önce gelir;
      katalogda mahallesi yazılmamış kayıtlarda bilinen semt adları (Sultanahmet, Karaköy, Moda …) ilçesiyle yumuşak eşleşir.
   3. Yapılandırılmış veri: güncel resmî menüsü olan profilde hasMenu = işletmenin kendi menü adresi; arşiv kopyasında yok.
   Kullanım: npx tsx scripts/kesif-ux-p4-test.ts */
import { searchV3, parseQuery } from "../lib/search";
import { venueJsonLd } from "../lib/seo";
import { entities } from "../data/entities";

let ok = 0, fail = 0;
const t = (ad: string, k: boolean, not: unknown = "") => { if (k) ok++; else { fail++; console.log("KALDI:", ad, not); } };
const top = (q: string, n = 3) => searchV3(q, { limit: 10 }).exact.slice(0, n).map((h) => h.card.entity.slug);

/* 1 */
t("çiya düzeltilmez", parseQuery("çiya").corrections.length === 0 && parseQuery("çiya").content.includes("ciya"), parseQuery("çiya"));
t("çiya → yalnız Çiya Sofrası", top("çiya", 5).join() === "ciya-sofrasi-kadikoy", top("çiya", 5));
t("pandeli → Pandeli", top("pandeli", 1)[0] === "pandeli-fatih");
t("gerçek yazım hatası hâlâ düzelir (kebab → kebap)", parseQuery("kebab").content.includes("kebap") || parseQuery("kebab").corrections.length === 1, parseQuery("kebab"));
t("bilinmeyen kelime düzeltilmeden kalabilir (kadıkoy → kadıköy)", parseQuery("kadıkoy").locations.includes("kadikoy"));

/* 2 */
t("sultanahmet köfte → önce Selim Usta", top("sultanahmet köfte", 1)[0] === "tarihi-sultanahmet-koftecisi-selim-usta-fatih", top("sultanahmet köfte"));
t("sultanahmet köfte: diğer iki benzer adlı işletme kaybolmaz", ["sultanahmet-koftecisi-kadikoy", "meshur-sultanahmet-koftecisi-eyupsultan"].every((s) => top("sultanahmet köfte", 6).includes(s)), top("sultanahmet köfte", 6));
t("konumsuz ad sorgusunda sıra değişmez (sultanahmet köftecisi kadıköy şubesi önde değilse bile ad sırası korunur)", (() => { const a = top("sultanahmet köftecisi", 3); return a.length === 3; })());
t("moda şarap → Viktor Levi", top("moda şarap", 1)[0] === "viktor-levi-sarap-evi-kadikoy", top("moda şarap"));
t("kadıköy mantı → Kadıköy kaydı önce", entities.find((e) => e.slug === top("kadıköy mantı", 1)[0])?.location?.district === "Kadıköy", top("kadıköy mantı"));
const sk = searchV3("sultanahmet köfte", { limit: 10 }).exact.find((h) => h.card.entity.slug === "tarihi-sultanahmet-koftecisi-selim-usta-fatih");
t("Selim Usta konum eşleşmesi ilçe (Fatih)", sk?.loc === "district", sk?.loc);
t("Kadıköy'deki benzer adlı köfteci konum dışı", searchV3("sultanahmet köfte", { limit: 10 }).exact.find((h) => h.card.entity.slug === "sultanahmet-koftecisi-kadikoy")?.loc === "none");

/* 3 */
const e = entities.find((x) => x.slug === "ulus-29-besiktas")!;
const ld = (m?: { url: string; archivedAt?: string } | null) => venueJsonLd({ ...e, address: e.address ?? "x" }, null, false, null, m) as Record<string, unknown> | null;
t("hasMenu resmî menü adresi", ld({ url: "https://ulus29.com/static/uploads/2026/07/Ulus29-Yemek-Temmuz26.pdf" })?.hasMenu === "https://ulus29.com/static/uploads/2026/07/Ulus29-Yemek-Temmuz26.pdf");
t("arşiv kopyası menüde hasMenu yok", !("hasMenu" in (ld({ url: "https://web.archive.org/x", archivedAt: "2024-01-20" }) ?? {})));
t("menüsüz profilde hasMenu yok", !("hasMenu" in (ld(null) ?? {})));
t("http menü adresi işaretlenmez", !("hasMenu" in (ld({ url: "http://www.ciya.com.tr/?menu" }) ?? {})));

console.log(`keşif UX P4: ${ok}/${ok + fail}`);
process.exit(fail ? 1 : 0);
