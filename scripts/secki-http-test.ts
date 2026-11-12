import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { writeFileSync } from "node:fs";
import { Pool } from "pg";
import { SECKI_RESTAURANTS } from "../content/seckisi/restoranlar";
import plan from "../data/yayin/secki-menemen-20261112.json";

const origin=process.env.SECKI_TEST_ORIGIN ?? "http://localhost:3154";
assert.ok(["localhost","127.0.0.1"].includes(new URL(origin).hostname), "HTTP tests only run against isolated localhost");
const photos=["japon-erdal-dis-cephe-1246.jpg","japon-erdal-cift-yumurtali-1206.jpg"];
const get=async(path:string)=>{const r=await fetch(origin+path,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);return r.text();};
async function main(){
  const home=await get("/");assert.ok(home.includes('id="h-secki"'),"HomeSecki is missing from home");
  for(const [path,lang] of [["/","tr"],["/seckisi/","tr"],["/seckisi/en/","en"]] as const){
    const h=path==="/"?home:await get(path);
    const selection=h.match(path==="/"?/<section aria-labelledby="h-secki"[\s\S]*?<\/section>/:/<section aria-labelledby="h-restoran-seckisi"[\s\S]*?<\/section>/)?.[0];
    assert.ok(selection,`${path}: selection section missing`);
    assert.equal((selection.match(/<li\b/g)??[]).length,6,`${path}: expected six cards`);
    for(const r of SECKI_RESTAURANTS) assert.ok(selection.includes(`/mekan/${r.slug}/`),`${path}: ${r.slug} missing from selection`);
    for(const p of photos) assert.ok(h.includes(p),`${path}: cover missing`);
    if(lang==="en"){assert.ok(h.includes("Six restaurants, six sides of Istanbul"));assert.equal((h.match(/>Venue profile<\/a>/g)??[]).length,6);assert.equal((h.match(/>MICHELIN-starred<\/span>/g)??[]).length,3);assert.ok(h.includes("MICHELIN selection"));}
    console.log(`✓ ${path}: six profiles and paired cover; ${lang} copy`);
  }
  for(const r of SECKI_RESTAURANTS) await get(`/mekan/${r.slug}/`);
  for(const path of ["/seckisi/japon-erdal-dort-pide-bir-efsane/","/seckisi/en/japon-erdal-dort-pide-bir-efsane/"]){const h=await get(path);for(const p of photos) assert.ok(h.includes(p));}
  for(const p of photos){const r=await fetch(`${origin}/media/foto/${p}`);assert.equal(r.status,200);}
  const neolokal=await get("/mekan/neolokal-beyoglu/");assert.ok(neolokal.includes("SALT Galata, Bankalar Caddesi, Karaköy, 34420 İstanbul"));assert.ok(neolokal.includes("Adres kaynağı:"));
  const menemen=await get("/mekan/menemen-besiktas/");assert.ok(menemen.includes("Şair Veysi Sokağı No:31/A"));assert.ok(!menemen.includes("Konum OpenStreetMap adres verisinden"));
  const sitemap=await get("/sitemap.xml");assert.ok(sitemap.includes("/mekan/menemen-besiktas/"));
  let backend=false;
  if(process.env.DB_DRIVER==="pg"){
    const u=new URL(process.env.DATABASE_URL!);assert.ok(["localhost","127.0.0.1"].includes(u.hostname));
    const status=JSON.parse(await get("/api/admin/db/"));assert.equal(status.env,"local");assert.equal(status.integrity.present,793);assert.equal(status.integrity.ok,true);
    const post=async(body:unknown)=>fetch(origin+"/api/admin/db/",{method:"POST",headers:{Origin:origin,"Sec-Fetch-Site":"same-origin","Content-Type":"application/json"},body:JSON.stringify(body)});
    const wrong=await post({action:"seed-add-only",target:"production",confirm:"EVET",baselineCount:792,slugs:plan.slugs});assert.equal(wrong.status,400);
    const replay=await post({action:"seed-add-only",target:"local",confirm:"EVET",baselineCount:792,slugs:plan.slugs});assert.equal(replay.status,200);assert.equal((await replay.json()).total,793);
    const pool=new Pool({connectionString:u.href});
    try{
      const token="isolated-secki-session",uid="secki-preserve-user";
      await pool.query("INSERT INTO session(id,token,user_id,expires_at) VALUES ($1,$2,$3,$4)",["isolated-secki-session",token,uid,new Date(Date.now()+3600000)]);
      const secret=process.env.BETTER_AUTH_SECRET;assert.ok(secret);
      const cookie="__Secure-better-auth.session_token="+encodeURIComponent(token+"."+createHmac("sha256",secret).update(token).digest("base64"));
      const r=await fetch(origin+"/api/reviews/",{method:"POST",headers:{Cookie:cookie,Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({slug:"menemen-besiktas",body:"Bu yalnız izole test ortamındaki sentetik deneyimdir. Menemen kaydının doğru mekân kimliğiyle çalıştığını kontrol eder.",visitMonth:"2026-11",overall:8,ratings:{},returnIntent:"evet",disclosure:"none"})});const result=await r.json();assert.equal(r.status,201,JSON.stringify(result));
      const saved=await pool.query("SELECT p.slug FROM reviews r JOIN places p ON p.id=r.place_id WHERE r.id=$1 AND r.user_id=$2",[result.id,uid]);assert.equal(saved.rows[0]?.slug,"menemen-besiktas");backend=true;
    }finally{await pool.end();}
    console.log("✓ Isolated backend: 792+1, replay no-op, wrong target rejected, prepared-session review linked to Menemen (not real OAuth)");
  }
  if(process.env.SECKI_HTTP_EVIDENCE_PATH) writeFileSync(process.env.SECKI_HTTP_EVIDENCE_PATH,JSON.stringify({base:plan.baselineCommit,total:793,newVenues:1,homeSix:true,trSix:true,enSix:true,coverPair:true,neolokalAddress:true,isolatedBackend:backend,realOAuthTested:false},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
