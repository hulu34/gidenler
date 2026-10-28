/* CANLI ÖNCESİ HAZIRLIK — aday Production dağıtımının yönetim ucu (target "production"), korumalı adres.
   1) bekleyen veritabanı geçişi yok mu  2) şüpheli 6 otomatik eşleşme bekletmeye (silinmez)
   3) doğrulanmış 10 video, atıflarıyla (platform + kimlik tekil; mükerrer kayıt olmaz)
   Kullanıcı verisine dokunulmaz. Log: yalnız sayılar ve kendi kayıt adlarımız. */
import { readFileSync } from "node:fs";
const BYPASS = process.env.VERCEL_BYPASS, HOST = process.env.TEST_HOST;
const admin = `https://${HOST}/api/admin/db/`, auth = { "x-vercel-protection-bypass": BYPASS };
const post = async (b) => { const r = await fetch(admin, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ confirm: "EVET", target: "production", ...b }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };

const st = await (await fetch(admin, { headers: auth })).json().catch(() => null);
console.log("ortam:", st?.env, "· bekleyen geçiş:", st?.migrations?.pending?.length, "· bütünlük:", JSON.stringify(st?.integrity?.ok ?? st?.integrity?.summary ?? null));
if (st?.env !== "production" || st?.migrations?.pending?.length) { console.log("Hazır değil; durduruldu."); process.exit(1); }

const HOLD = ["aga-ocakbasi-beyoglu", "ali-ocakbasi-kadikoy", "bambi-cafe-sisli", "gelik-et-atakoy-istanbul-bakirkoy", "cc-lider-pide-tepeustu-otoparkli-sube-umraniye", "yucetepe-kir-gazinosu-adalar"];
const h = await post({ action: "google-hold", slugs: HOLD, why: "canlı öncesi denetim: şube eki ya da yalnız web sitesiyle doğrulama" });
console.log("bekletilen:", h.s, JSON.stringify(h.j.held ?? h.j), "· durumlar:", JSON.stringify(h.j.stats ?? null));

const list = JSON.parse(readFileSync(new URL("./medya.json", import.meta.url), "utf8"));
const CREDIT = { ScfoX3m8Ijs: "Gezdik Tozduk Doyduk", "0YM9bckNVfE": "Tatlı Kaşifler", cl98JDpQJiw: "The Fat Passport", ho9MpBsIIgY: "Yolüstü Tatlar" };
let fail = 0;
for (const [slug, urls] of Object.entries(list)) {
  if (slug.startsWith("_")) continue;
  for (const item of urls) {
    const { url, credit } = typeof item === "string" ? { url: item, credit: undefined } : item;
    const id = url.match(/shorts\/([\w-]{11})/)?.[1];
    const r = await post({ action: "media-add", slug, url, credit: credit ?? (id ? CREDIT[id] : undefined) });
    if (!r.j.ok) fail++;
    const v = (r.j.videos ?? []).find((x) => x.externalId === r.j.externalId);
    console.log(slug, r.j.ok ? `${r.j.platform} ${r.j.created ? "eklendi" : "vardı"} · atıf: ${v?.credit ?? "-"}` : `HATA ${r.j.error ?? r.s}`);
  }
}
for (const slug of Object.keys(list).filter((k) => !k.startsWith("_"))) {
  const v = await (await fetch(`https://${HOST}/api/media/${slug}/`, { headers: auth })).json().catch(() => null);
  const by = (v?.videos ?? []).reduce((m, x) => ((m[x.platform] = (m[x.platform] ?? 0) + 1), m), {});
  console.log(`${slug}: ${v?.videos?.length ?? 0} video`, JSON.stringify(by), "· atıfsız:", (v?.videos ?? []).filter((x) => !x.credit).length);
}
const g = await (await fetch(`${admin}?rapor=google`, { headers: auth })).json().catch(() => null);
console.log("Google:", JSON.stringify(g?.stats), "· kuyruk:", JSON.stringify(g?.queue), "· harcama:", g?.spend?.usd);
process.exit(fail ? 1 : 0);
