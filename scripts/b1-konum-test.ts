import assert from "node:assert/strict";
import { realEntities, realVenueRecords } from "../data/real";
import { mapLinks } from "../lib/venue";
import { venueJsonLd } from "../lib/seo";
import { dbFingerprint, previewWriteGuard } from "../lib/db/fingerprint";
const b1 = realVenueRecords.filter(r=>r.adresDuzeyi==="sokak");
assert.equal(b1.length,102);
for(const r of b1){
 const e=realEntities.find(e=>e.slug===r.slug)!;
 assert.equal(e.location?.precision,"street");
 const m=mapLinks(e)!;assert.ok(m);assert.ok(!m.osmEmbed.includes("marker="));assert.ok(!m.osm.includes("mlat="));assert.ok(!m.directions.includes("destination="));assert.ok(m.directions.includes("/search/"));
 assert.ok(!venueJsonLd(e,null,false)?.geo);
}
console.log("✓ 102/102 B1: sokak düzeyi taşınır; kesin harita işareti ve kapıya rota yok; SEO kesin koordinat vermez");
const a=realEntities.find(e=>e.slug==="ciya-sofrasi-kadikoy")!;assert.ok(mapLinks(a)?.directions.includes("destination="));assert.ok(venueJsonLd(a,null,false)?.geo);console.log("✓ A kaydının mevcut konum davranışı korunur");
process.env.VERCEL_ENV="preview";delete process.env.PRODUCTION_DB_FINGERPRINT;
assert.equal(previewWriteGuard("postgres://local-preview/test").ok,false);
process.env.PRODUCTION_DB_FINGERPRINT=dbFingerprint("postgres://ep-production.neon.tech/x")!;
assert.equal(previewWriteGuard("postgres://ep-production-pooler.neon.tech/x").ok,false);
assert.equal(previewWriteGuard("postgres://ep-isolated.neon.tech/x").ok,true);
console.log("✓ Preview: bilinmeyen ve Production DB kilitli; izole DB açık");
console.log("Sonuç: 104 konum + 3 ortam kontrolü geçti");
