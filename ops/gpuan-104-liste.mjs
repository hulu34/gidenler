/* 104 inceleme listesi (Production, yalnız okuma): rapor + kimlik → ölçüm listesi. Log: yalnız sayılar. */
import { writeFileSync } from "node:fs";
const B = `https://${process.env.HOST}`, H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const r = await (await fetch(`${B}/api/admin/google-puan/?rapor=gunluk`, { headers: H })).json();
const k = await (await fetch(`${B}/api/admin/google-puan/?rapor=kimlik`, { headers: H })).json();
const slugs = JSON.parse(await (await import("node:fs")).promises.readFile("ops/gidenler-sluglar.json", "utf8"));
const fixed = [...r.review, ...r.wrong].filter((x) => x.placeId).map((x) => ({ slug: x.slug, placeId: x.placeId, state: x.state }));
const withId = new Set(Object.entries(k.ids).filter(([, xs]) => xs.some((x) => x.status !== "rejected")).map(([s]) => s));
const closed = new Set(r.closures.suspected.map((x) => x.slug));
const noId = slugs.filter((s) => !withId.has(s));
/* kapanma şüphesi: kayıtlı Google kimliği yeniden ölçülür (kapalı bilgisi doğru işletmeye mi ait?) */
const have = new Set(fixed.map((x) => x.slug));
for (const s of closed) { const id = (k.ids[s] ?? []).find((x) => x.status !== "rejected"); if (id && !have.has(s)) fixed.push({ slug: s, placeId: id.externalId, state: "kapanma şüphesi" }); }
writeFileSync("out/liste.json", JSON.stringify([...fixed.map(({ slug, placeId }) => ({ slug, placeId })), ...noId]));
writeFileSync("out/liste-meta.json", JSON.stringify({ fixed, noId, suspected: [...closed] }));
console.log("liste", JSON.stringify({ review: r.review.length, wrong: r.wrong.length, fixed: fixed.length, noId: noId.length, suspected: closed.size, all: slugs.length }));
