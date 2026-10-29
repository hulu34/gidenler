/* CANLI · yalnız okuma: ops/grup.txt'deki mekânların (+ karşılaştırma için bir grup 7 mekânı) Google eşleşme durumu. Kimlik yazılmaz, yalnız durum sayıları. Hiçbir yazım yok. */
import { readFileSync } from "node:fs";
const HOST = process.env.ADAY_HOST;
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const admin = `https://${HOST}/api/admin/db/`;
const slugs = [...readFileSync("ops/grup.txt", "utf8").split(/\s+/).filter(Boolean), "muptela-kahvalti-brunch-atasehir"];
for (const slug of slugs) {
  const r = await (await fetch(`${admin}?rapor=profil&slug=${slug}`, { headers: H })).json();
  const g = r.google?.identifiers ?? [];
  const say = {}; for (const x of g) say[x.status] = (say[x.status] ?? 0) + 1;
  console.log(`${slug} · env=${r.env} · google=${JSON.stringify(say)} · yöntem=${[...new Set(g.map((x) => x.matchMethod))].join(",") || "-"} · kaynak=${(r.identifiers ?? []).map?.((x) => x.provider).join(",") ?? "-"}`);
}
