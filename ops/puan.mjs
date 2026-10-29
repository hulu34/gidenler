/* Gerçek Gidenler puanı üretimi.
   PREVIEW: uçtan uca senaryo (test kullanıcıları, gerçek Neon), kuru rapor, günlük uç, sayfa ve yöntem metni.
   CANLI=1: yalnız okuma — kuru rapor (hangi mekânda ne puan çıkardı; YAZILMAZ), yöntem metni, günlük ucun yanıtı.
   Log yalnız mekân slug'ı ve sayılar; kişisel veri yok. */
import { writeFileSync, mkdirSync } from "node:fs";
const CANLI = process.env.CANLI === "1";
const HOST = CANLI ? "www.gidenler.com" : process.env.PREVIEW_HOST;
const ADMIN = CANLI ? process.env.ADAY_HOST : HOST;
const HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const HP = CANLI ? {} : HB;
const admin = `https://${ADMIN}/api/admin/db/`;
mkdirSync("out/puan", { recursive: true });
const res = []; const ok = (n, c, i = "") => { res.push(c); console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const post = (b) => fetch(admin, { method: "POST", headers: { ...HB, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: CANLI ? "production" : "preview", ...b }) });

const d = await (await fetch(admin, { headers: HB })).json();
ok(`ortam ${CANLI ? "production (yalnız okuma)" : "preview"}`, d.env === (CANLI ? "production" : "preview"), `env=${d.env}`);
if (d.env !== (CANLI ? "production" : "preview")) process.exit(1);

let slug = null;
if (!CANLI) {
  for (const s of ["ciya-sofrasi-kadikoy", "kronotrop-cihangir-beyoglu", "pandeli-fatih"]) {
    const r = await post({ action: "puan-senaryo", confirm: "EVET", slug: s });
    const j = await r.json().catch(() => ({}));
    if (j.error === "place_not_clean") { console.log(`  ${s}: senaryo dışı veri var, atlandı`); continue; }
    slug = s;
    for (const x of j.results ?? []) ok(`sunucu akışı (gerçek Neon) ${s}: ${x.name}`, x.ok, x.info ?? "");
    ok("puan senaryosu bütün olarak geçti", r.ok && j.ok === true, j.error ?? "");
    for (const n of j.evidence ?? []) console.log(`  kanıt: ${n.text} · ${n.scoredAt} · ${n.id}`);
    writeFileSync("out/puan/senaryo.json", JSON.stringify(j, null, 1));
    break;
  }
  if (!slug) ok("senaryo için temiz mekân bulundu", false);
}

const rp = await (await fetch(`${admin}?rapor=puan`, { headers: HB })).json().catch(() => ({}));
ok(`kuru rapor okunabildi (algoritma ${rp.algorithm}, en az ${rp.minAuthors} yazar, yazma ${rp.publish ? "AÇIK" : "kapalı"})`, Array.isArray(rp.rows) && rp.algorithm === "v1-2026-11", `mekân=${rp.places} puan çıkacak=${rp.wouldPublish}`);
for (const r of rp.rows ?? []) console.log(`  rapor: ${r.slug} · yazar ${r.authors} · deneyim ${r.reviews} · doğrulanmış ${r.verified} · hesap ${r.score ?? "puan yok"} (${r.confidence}) · önceki ${r.previous ? (r.previous.score ?? "puan yok") : "-"} · ${r.action}`);
writeFileSync("out/puan/rapor.json", JSON.stringify(rp, null, 1));
const BEKLENEN = process.env.YAYIN === "1";
if (CANLI) ok(`canlıda yazma anahtarı ${BEKLENEN ? "AÇIK" : "KAPALI"}`, rp.publish === BEKLENEN);
if (CANLI && process.env.UZLASTIR === "1") {
  const u = await post({ action: "puan-uzlastir", confirm: "EVET" });
  const uj = await u.json().catch(() => ({}));
  ok("canlı uzlaştırma çalıştı (yazma açık)", u.ok && uj.publish === true, `mekân=${uj.places} puan çıkan=${uj.wouldPublish}`);
  for (const r of uj.rows ?? []) console.log(`  uzlaştırma: ${r.slug} · yazar ${r.authors} · deneyim ${r.reviews} · ${r.score ?? "puan yok"} (${r.confidence}) · ${r.action}`);
  const again = await (await fetch(`${admin}?rapor=puan`, { headers: HB })).json().catch(() => ({}));
  ok("uzlaştırmadan sonra rapor: her mekân 'değişmedi' ya da 'boş' (tekrar yazılacak bir şey yok)", (again.rows ?? []).every((r) => r.action === "unchanged" || r.action === "nothing"), (again.rows ?? []).map((r) => `${r.slug}:${r.action}`).join(" "));
}

const cr = await fetch(`https://${HOST}/api/cron/puan/`, { headers: HP });
const cj = await cr.json().catch(() => ({}));
ok("günlük uzlaştırma ucu yanıt veriyor; yazılacak yeni sonuç yok", (cr.status === 200 && cj.written === 0 && cj.publish === (CANLI ? process.env.YAYIN === "1" : false)) || cr.status === 429, `HTTP ${cr.status} ${JSON.stringify(cj)}`);

const yt = (await (await fetch(`https://${HOST}/nasil-calisir/`, { headers: HP })).text());
ok("yöntem sayfası: sürüm v1-2026-11, 'en az 5 farklı kişinin', yazar güveni 'Henüz uygulanmıyor'", yt.includes("v1-2026-11") && yt.includes("en az 5 farklı kişinin") && yt.includes("Henüz uygulanmıyor"));

if (!CANLI && slug) {
  const html = await (await fetch(`https://${HOST}/mekan/${slug}/?r=${Date.now()}`, { headers: HP })).text();
  const txt = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  ok(`${slug} sayfası: 'Gidenler puanı 8,8', 'Sınırlı veri', puana giren 5 deneyim`, /Gidenler puanı 8,8/.test(txt) && txt.includes("Sınırlı veri") && /5 deneyimden/.test(txt), (txt.match(/Gidenler puanı[^.]{0,120}/) ?? [""])[0]);
}
console.log(`\nSONUÇ ${res.filter(Boolean).length}/${res.length}`);
process.exit(res.every(Boolean) ? 0 : 1);
