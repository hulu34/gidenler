/* EŞLEŞMESİ OLMAYAN MEKÂNLAR İÇİN GOOGLE ADAYI ARAMA (GitHub Actions'ta; ücretli çağrı yok, veritabanına YAZMAZ).
   Ortam: SLUGS (virgüllü) ya da LISTE (json dosyası: slug dizisi), HOST + VERCEL_BYPASS (yalnız kimlik listesi için, okuma),
          CIKTI (klasör), BEKLEME_MS. Her mekân için ad varyasyonlarıyla arar; adayı şube/konum, ad, tür ve kapanma
          kontrolünden geçirir. Sonuç: güçlü / orta / bulunamadı + gerekçe. Karar yöneticinindir. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mapsPageSource } from "../lib/gpuan/sources/mapsPage";
import { sheetVenues } from "../lib/gpuan/venues";
import { realVenueRecords } from "../data/real";
import { checkConsistency, typeCheck, idEvidence, STATUS, type GoogleId } from "../lib/gpuan/core";
import rawVenues from "../data/real/venues.json";
import { houseNoConflict, nameSimilarity } from "../lib/match/score";
import { stopIfScrapingDisabled } from "../lib/gpuan/policy";
stopIfScrapingDisabled("gpuan-arama");

const TRF: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "C", Ğ: "G", İ: "I", Ö: "O", Ş: "S", Ü: "U" };
const plain = (x: string) => x.split("").map((c) => TRF[c] ?? c).join("");
async function main() {
  /* LISTE öğesi slug ise ad varyasyonlarıyla ARAR; { slug, placeId } ise o kaydı doğrudan açıp kanıtını yeniden ölçer */
  const items = (process.env.LISTE ? JSON.parse(readFileSync(process.env.LISTE, "utf8")) : (process.env.SLUGS ?? "").split(",").filter(Boolean)) as Array<string | { slug: string; placeId: string }>;
  const slugs = items.map((x) => (typeof x === "string" ? x : x.slug));
  const fixed = new Map(items.filter((x): x is { slug: string; placeId: string } => typeof x !== "string").map((x) => [x.slug, x.placeId]));
  const vs = new Map(sheetVenues().map((v) => [v.slug, v]));
  /* ADAYLAR: henüz listede olmayan yeni mekân adayları (osm-aday çıktısı) — aynı kurallarla doğrulanır */
  const adaylar = process.env.ADAYLAR ? (JSON.parse(readFileSync(process.env.ADAYLAR, "utf8")) as Array<{ slug: string; name: string; categoryId: string; kind?: string; cuisine?: string[]; district: string; neighborhood?: string; address?: string; lat: number; lng: number; phone?: string; website?: string }>) : [];
  for (const a of adaylar) { vs.set(a.slug, { slug: a.slug, name: a.name, categoryId: a.categoryId, kind: a.kind ?? null, cuisine: a.cuisine ?? [], district: a.district, address: a.address ?? null, lat: a.lat, lng: a.lng }); slugs.push(a.slug); }
  /* HARIC: { slug: placeId } — reddedilen Google kaydı yeniden aday gösterilmez */
  const haric = new Map(Object.entries(process.env.HARIC ? (JSON.parse(readFileSync(process.env.HARIC, "utf8")) as Record<string, string>) : {}));
  const recs = new Map(realVenueRecords.map((r) => [r.slug, r]));
  const contact = new Map((rawVenues as Array<{ slug: string; phone?: string | null; website?: string | null }>).map((r) => [r.slug, r]));
  for (const a of adaylar) contact.set(a.slug, { slug: a.slug, phone: a.phone ?? null, website: a.website ?? null });
  let taken = new Map<string, string>();
  if (process.env.HOST) {
    const r = await fetch(`https://${process.env.HOST}/api/admin/google-puan/?rapor=kimlik`, { headers: { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS ?? "" } });
    if (r.ok) { const ids = ((await r.json()) as { ids: Record<string, GoogleId[]> }).ids; taken = new Map(Object.entries(ids).flatMap(([s, xs]) => xs.filter((x) => x.status !== "rejected").map((x) => [x.externalId, s] as [string, string]))); }
  }
  const src = await mapsPageSource();
  const out: object[] = []; let blocked = 0;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  try {
    for (const slug of slugs) {
      const v = vs.get(slug), rec = recs.get(slug);
      if (!v) { out.push({ slug, result: "listede yok" }); continue; }
      const street = (v.address ?? "").split(",")[0].replace(/\s+No:.*$/i, "").trim();
      const queries = [...new Set([`${v.name} ${v.district ?? ""} İstanbul`, `${plain(v.name)} ${v.district ?? ""}`, rec?.neighborhood ? `${v.name} ${rec.neighborhood}` : "", street ? `${v.name} ${street}` : ""].map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean))];
      const tried: object[] = []; let best: Record<string, unknown> | null = null;
      /* MAX_SORGU: aday doğrulamasında sorgu sayısı sınırı (Google'a giden istek azalsın) */
      for (const q of fixed.has(slug) ? ["(kayıtlı place ID)"] : queries.slice(0, Number(process.env.MAX_SORGU ?? 9))) {
        const r = fixed.has(slug)
          ? await src.fetch({ placeId: fixed.get(slug)!, name: v.name, mapsUrl: "" }).then((x) => (x.kind === "ok" ? { kind: "ok" as const, candidates: [{ placeId: fixed.get(slug)!, seen: x.seen }] } : x.kind === "blocked" ? { kind: "blocked" as const, reason: x.reason } : { kind: "error" as const, reason: x.reason }))
          : await src.search(q, 3);
        if (r.kind === "blocked") { blocked++; tried.push({ q, blocked: r.reason }); break; }
        if (r.kind !== "ok") { tried.push({ q, error: r.reason }); continue; }
        for (const c of r.candidates) {
          const con = checkConsistency(v, c.seen); const tv = typeCheck(c.seen, v.name);
          const other = taken.get(c.placeId);
          const why: string[] = [];
          if (!con.ok) why.push(con.reason);
          if (c.seen.closed) why.push("Google'da kalıcı kapalı");
          if (tv && tv.status !== STATUS.typeUnknown) why.push(tv.why);
          if (other && other !== slug) why.push(`bu Google kaydı başka mekâna bağlı (${other})`);
          if (haric.get(slug) === c.placeId) why.push("bu Google kaydı reddedildi (yanlış işletme türü)");
          const nm = nameSimilarity(v.name, c.seen.name);
          /* güçlü: (a) konum ≤ 50 m ve ad ≥ 0,85, ya da (b) konum ≤ 30 m ve aynı cadde/sokak + aynı kapı numarası ve ad ≥ 0,6.
             (b) eşiği gevşetmek değil, bağımsız ikinci kimlik kanıtıdır (adres birebir). Tür okunamadıysa güçlü sayılmaz. */
          const sameDoor = !!v.address && !!c.seen.address && (con.address ?? 0) >= 0.8 && !houseNoConflict(v.address, c.seen.address) && /\d/.test(v.address) && /\d/.test(c.seen.address);
          /* (c) telefon ya da işletmenin kendi alan adı birebir + konum ≤ 300 m + ad ≥ 0,6 (bağımsız kimlik kanıtı).
             Telefonlar ikisinde de var ve FARKLIYSA güçlü sayılmaz (şube/başka işletme işareti). */
          const idv = idEvidence(contact.get(slug) ?? {}, c.seen);
          const byContact = (idv.phone || idv.web) && con.distanceM != null && con.distanceM <= 300 && nm >= 0.6;
          const strong = !tv && !idv.phoneConflict && con.distanceM != null && ((con.distanceM <= 50 && nm >= 0.85) || (con.distanceM <= 30 && sameDoor && nm >= 0.6) || byContact);
          const level = why.length ? "uygun değil" : strong ? "güçlü" : "orta";
          const cand = { q, placeId: c.placeId, name: c.seen.name, address: c.seen.address, category: c.seen.category ?? "", rating: c.seen.rating, closed: !!c.seen.closed, limited: !!c.seen.limited,
            distanceM: con.distanceM, nameSim: +nm.toFixed(2), addressSim: con.address, phoneMatch: idv.phone, webMatch: idv.web, phoneConflict: idv.phoneConflict, level, why: why.join(" · ") || (tv ? tv.why : "") };
          tried.push(cand);
          if (level !== "uygun değil" && (!best || (best.level === "orta" && level === "güçlü"))) best = cand;
        }
        if (best?.level === "güçlü") break;
        await wait(Number(process.env.BEKLEME_MS ?? 4000));
      }
      out.push({ slug, name: v.name, district: v.district, address: v.address, result: best ? best.level : "bulunamadı", best, tried });
      console.log(`[arama] ${out.length}/${slugs.length} · ${best ? best.level : "bulunamadı"}`);
      if (blocked >= 3) { console.log("[arama] arka arkaya engel; durduruldu"); break; }
    }
  } finally { await src.close?.(); }
  const dir = process.env.CIKTI ?? "out/arama"; mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/adaylar.json`, JSON.stringify(out, null, 1));
  const t: Record<string, number> = {}; for (const o of out as Array<{ result: string }>) t[o.result] = (t[o.result] ?? 0) + 1;
  console.log(`[arama] sonuç ${JSON.stringify(t)} · engel ${blocked}`);
}
main().catch((e) => { console.error(`[arama] HATA: ${e instanceof Error ? e.message : e}`); process.exit(1); });
