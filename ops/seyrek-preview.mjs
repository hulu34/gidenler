/* SEYREK İLÇE PAKETİ · YALNIZ PREVIEW (izole Neon dalı). Yeni mekânlar Preview veritabanına tohumlanır; profil, arama,
   deneyim formu, sitemap ve ana sayfa denetlenir. Google uçları çağrılmaz. Log yalnız sayı/durum. */
import { readFileSync } from "node:fs";
const HOST = process.env.HOST, B = `https://${HOST}`, HB = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const res = []; const ok = (n, c, i = "") => { res.push(!!c); console.log(`${c ? "✓" : "✗"} ${n}${i !== "" ? " · " + i : ""}`); };
const admin = async (b) => { const r = await fetch(`${B}/api/admin/db/`, { method: "POST", headers: { ...HB, "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ target: "preview", confirm: "EVET", ...b }) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const d = await (await fetch(`${B}/api/admin/db/`, { headers: HB })).json().catch(() => ({}));
ok("izolasyon: Preview ortamı ve üretim dışı veritabanı", d.env === "preview" && d.db?.writeGuard?.ok === true, `env=${d.env}`);
if (d.env !== "preview" || d.db?.writeGuard?.ok !== true) process.exit(1);
const mg = await admin({ action: "migrate" }); ok("geçişler tamam", mg.s === 200 && (mg.j.status?.pending ?? ["?"]).length === 0);
const L = JSON.parse(readFileSync("ops/seyrek-sluglar.json", "utf8"));
const sd = await admin({ action: "seed", slugs: L.map((x) => x.slug) });
ok(`${L.length} yeni mekân Preview veritabanına tohumlandı (eklenen ${sd.j.inserted ?? "?"}, güncellenen ${sd.j.updated ?? "?"})`, sd.s === 200 && sd.j.env === "preview" && (sd.j.integrity?.ok ?? false), JSON.stringify(sd.j.error ?? ""));
for (const x of L) {
  const r = await fetch(`${B}/mekan/${x.slug}/`, { headers: HB }); const t = await r.text();
  ok(`profil ${x.ilce}: 200 ve adı sayfada`, r.status === 200 && t.includes(x.ad.replace(/&/g, "&amp;")) && !/Application error/.test(t), r.status);
  const a = await (await fetch(`${B}/api/ara/?q=${encodeURIComponent(x.ad)}&limit=8`, { headers: HB })).json().catch(() => ({}));
  ok(`arama: ${x.ilce} mekânı kendi adıyla ilk 8'de`, (a.items ?? []).some((i) => i.slug === x.slug));
  const y = await fetch(`${B}/yaz/${x.slug}/`, { headers: HB }); ok(`deneyim formu açılıyor (${x.ilce})`, y.status === 200);
}
const sm = await (await fetch(`${B}/sitemap.xml`, { headers: HB })).text();
ok("sitemap'te yeni mekânlar", L.every((x) => sm.includes(`/mekan/${x.slug}/`)), L.filter((x) => !sm.includes(`/mekan/${x.slug}/`)).length);
const h = await fetch(`${B}/`, { headers: HB }); ok("ana sayfa 200", h.status === 200);
const k = res.filter((x) => !x).length; console.log(`SEYREK PREVIEW: ${res.length - k}/${res.length}`); process.exit(k ? 1 : 0);
