/* ÜRETİM · yalnız okuma. Google'a istek ATMAZ, /api/google çağrılmaz. Log: sayılar, eşleşme durumu ve slug listesi (Google içeriği yok). */
import { writeFileSync, mkdirSync } from "node:fs";
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }, A = `https://${process.env.PROD_HOST}/api/admin/db/`;
const g = await (await fetch(`${A}?rapor=google`, { headers: H })).json();
const u = await (await fetch(`${A}?rapor=google-slug`, { headers: H })).json();
console.log("ortam", g.env, "acik", g.enabled);
console.log("STATS", JSON.stringify(g.stats)); console.log("QUEUE", JSON.stringify(g.queue)); console.log("USAGE", JSON.stringify(g.usage));
console.log("USABLE", JSON.stringify(u.slugs));
for (const s of ["bafetto-pizza-kartal","pidem-fatih","ibb-eyupsultan-kent-lokantasi-eyupsultan","maltepe-belediyesi-seyirtepe-sosyal-tesisleri-maltepe"]) { const r = await (await fetch(`${A}?rapor=profil&slug=${s}`, { headers: H })).json(); console.log("GID", s, JSON.stringify((r.google?.identifiers ?? []).map((i) => ({ source: i.source, status: i.status ?? i.matchStatus, active: i.active, conf: i.confidence, at: i.createdAt ?? i.verifiedAt }))), "audit", (r.google?.audits ?? []).length); }
