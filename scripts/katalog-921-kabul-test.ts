import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { activeEntities, realEntities, realVenueRecords, invalidRecord } from "../data/real";
import { searchV3 } from "../lib/search";
import rows from "../data/paket/katalog-921/kayitlar.json";
import proof from "../docs/katalog/katalog-921.json";

const base = "a7a13e2bcd432e68e2211c3d7a51158446099455";
const live = "9a2f2f482b65709e862397911438d99b06230e2c";
const git = (...a: string[]) => execFileSync("git",a,{encoding:"utf8"});
const old = (rev: string,path: string) => JSON.parse(git("show",`${rev}:${path}`));
const read = (path: string) => JSON.parse(readFileSync(path,"utf8"));
const digest = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
const [row] = rows;
const [e] = proof.sources;
const slug = "il-gattopardo-galataport-beyoglu";
const paths = Object.keys(proof.priorLocalDigest).sort() as (keyof typeof proof.priorLocalDigest)[];
assert.equal(git("rev-parse","HEAD").trim(),base);
assert.deepEqual(git("diff","--name-only",base).trim().split("\n").sort(),paths);
assert.equal(rows.length,1); assert.equal(proof.sources.length,1);
assert.equal(row.slug,slug); assert.equal(e.slug,slug); assert.equal(proof.priorHoldResolution.slug,slug);
assert.equal(proof.productionAdded+proof.previewAdded,0);
for(const path of paths){
 const before=old(base,path), production=old(live,path), after=read(path);
 assert.deepEqual(after.slice(0,before.length),before,path);
 assert.deepEqual(after.slice(0,production.length),production,path);
 assert.equal(digest(after.slice(0,-1)),proof.priorLocalDigest[path],`${path}: exact 920 prefix`);
 assert.equal(after.at(-1).slug,slug,path);
 if(path.endsWith("/isletme.json")) assert.deepEqual(after.at(-1),row);
}
const prior=[...read("data/real/venues.json"),...read("data/real/isletme.json").slice(0,-1)];
const fold=(x: string)=>x.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").replace(/[^a-z0-9]/g,"");
assert(!prior.some(r=>{
 const name=fold(r.name??""), address=fold(r.address??"");
 return r.slug===slug||r.ref===row.ref||r.website===e.officialSource||
 ["gattopardo","communite","havanayayincilik"].some(x=> name.includes(x)) ||
 (address.includes("14b")&&["meclisimebusan","galataport","kilicalipasa"].some(x=>address.includes(x)));
}));
assert.equal(row.ref,"isletme/"+slug);
assert.equal(invalidRecord(row as (typeof realVenueRecords)[number]),null);
assert.equal(row.categoryId,"cat.restaurant"); assert.equal(row.kind,"İtalyan");
assert.deepEqual(row.cuisine,["italian"]); assert.equal(row.kaliteSinifi,"A-konumsuz");
assert.equal(row.neighborhood,"Kılıçali Paşa");
assert.equal(row.sourceUrl,e.officialSource);
assert.equal(new URL(e.officialMenu).hostname,new URL(e.officialSource).hostname);
assert.notEqual(new URL(e.activitySource).hostname,new URL(e.officialSource).hostname);
assert.equal(e.activityPublicationDate,"2026-11-18"); assert.equal(e.exactVisitDate,null);
assert.equal(e.scope,"indoor_dining_room_only"); assert.equal(e.terraceExcluded,true); assert.equal(e.entrancePinVerified,false);
for(const k of ["lat","lng","location","osmRef","phone","openingHours","photos","menu","rating","instagram","aliases"]) assert(!Object.hasOwn(row,k),`forbidden ${k}`);
const entity=activeEntities.find(r=>r.slug===slug);
assert.equal(entity?.address,row.address); assert.equal(entity?.location?.geo,undefined);
assert.equal(entity?.location?.neighborhood,"Kılıçali Paşa"); assert.equal(entity?.location?.district,"Beyoğlu");
assert.equal(entity?.subcategory,"İtalyan");
assert.equal(searchV3("Il Gattopardo",{limit:5}).exact[0]?.card.entity.slug,slug);
for(const held of proof.holds) assert(!realEntities.some(r=>r.slug===held));
assert(!realEntities.some(r=>/gattopardo.*(terrace|terrazza|teras)/i.test(r.slug)));
assert.equal(realVenueRecords.length,921); assert.equal(realEntities.length,921); assert.equal(activeEntities.length,886);
assert.equal(activeEntities.filter(r=>r.categoryId==="cat.restaurant").length,761);
for(const k of ["slug","ref"] as const) assert.equal(new Set(realVenueRecords.map(r=>r[k])).size,921);
console.log("PASS: +1 indoor/pinsiz; exact 920 prefix, source date distinction, search, and holds; 921 total / 886 active / 761 active restaurants");
