/* Issue #36: controlled provider only; never opens a database or upstream connection. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { sor, RequestSchema } from "../lib/sor/ask";
import { parseQuery, answer, findCandidates, emptyIntent, VENUES, type Venue } from "../lib/sor/engine";
import { resetAIConfig } from "../lib/ai/config";
import { cache } from "../lib/ai/cache";
import { resetBetaForTests } from "../lib/sor/beta";
import { resetHarcamaForTests } from "../lib/sor/harcama";
import { resetKotaForTests } from "../lib/sor/kota";
for (const key of ["DATABASE_URL","DATABASE_URL_UNPOOLED","KV_REST_API_URL","KV_REST_API_TOKEN","VERCEL_ENV","AI_LEDGER_FILE","SOR_AI_PROVIDER","SOR_ALLOW_PAID"]) delete process.env[key];
process.env.GROQ_API_KEY="isolated-fake-provider";
process.env.AI_PRIMARY_MODEL="openai/gpt-oss-120b";
process.env.AI_FAST_PROVIDER="groq"; process.env.AI_FAST_MODEL="openai/gpt-oss-20b";
const realFetch=globalThis.fetch;
let pass=0,fail=0,calls=0,mode="valid";
let modelIntent:Record<string,unknown>={};
const evidence:unknown[]=[];
globalThis.fetch=(async(url:string|URL|Request,init?:RequestInit)=>{
  assert.equal(new URL(String(url)).host,"api.groq.com"); calls++;
  if(mode==="timeout")throw new DOMException("aborted","AbortError");
  if(mode==="provider_error") return new Response("unavailable",{status:503});
  if(mode==="quota") return new Response("rate limited",{status:429});
  const body=JSON.parse(String(init?.body)),text=body.messages.at(-1).content;
  const block=text.match(/<gidenler_data name="candidates"[^>]*>\n(.*?)\n<\/gidenler_data>/s);
  const payload=block?{picks:[{slug:"tarabya-balik-sariyer",why:"Viski servisi var."},...JSON.parse(block[1]).slice(0,5).map((v:{slug:string})=>({slug:v.slug,why:"Kayıtlı tür ve ilçe bilgisi."}))].slice(0,8),note:"Viski servis edilir."}:modelIntent;
  const content=mode==="invalid"?"not-json":JSON.stringify(payload);
  return new Response(JSON.stringify({choices:[{message:{content}}],usage:{prompt_tokens:20,completion_tokens:10}}),{status:200});
}) as typeof fetch;
async function reset(ai:boolean){process.env.AI_PRIMARY_PROVIDER=ai?"groq":"none";resetAIConfig();resetBetaForTests();resetHarcamaForTests();resetKotaForTests();await cache().clear();calls=0;mode="valid";modelIntent={action:"new",cuisine:"balik",attrs:["romantik","gosterissiz"],not_cuisines:[]};}
async function test(name:string,fn:()=>unknown|Promise<unknown>){try{await fn();pass++;console.log("PASS",name);}catch(e){fail++;console.error("FAIL",name,e instanceof Error?e.message:e);}}
const realQuery="9. ay sevgililik ayı kutlamasına gidecem. erkek arkadasımla. balık sevmiyor kırmızı et yemiyor ve sadece viski içiyor. onu nereye goturebilirim";
const cases=["Balık seviyorum","Balık sevmiyorum","Balık restoranı istemiyorum","Balık yemeyen sevgilimle nereye gidelim?","Balık sevmiyor, kırmızı et yemiyor","Balık sevmiyor dedim, neden balık önerdin?","Balık seviyorum ama sevgilim sevmiyor","Romantik, viski içebileceğimiz bir yer arıyorum"];
const safe=(r:Awaited<ReturnType<typeof sor>>)=>assert.ok([...r.items,...r.alternatives].every(v=>v.kind!=="Balık restoranı"&&!/bal[iı]k/i.test(v.name)));
async function main(){
 for(const ai of [false,true]){
  for(const [n,query] of cases.entries())await test(`${ai?"AI":"kurallı"}: ${query}`,async()=>{await reset(ai);const r=await sor({query});
    if(n===0){assert.equal(r.understood.cuisine,"balik");assert.ok(r.items.length);assert.ok(!r.understood.notCuisines.includes("balik"));}
    else if(n<7){assert.ok(r.understood.notCuisines.includes("balik"));assert.notEqual(r.understood.cuisine,"balik");safe(r);}
    if(n===4)assert.ok(r.understood.notFoods.includes("kirmizi-et"));
    if(n===7){assert.deepEqual(r.understood.drinks,["viski"]);assert.equal(r.items.length,0);assert.equal(r.alternatives.length,0);assert.match(r.note??"",/doğrulanmış mekân bulamadım/);}
    assert.ok(!r.understood.attrs.includes("gosterissiz"));if(!ai)assert.equal(calls,0);
  });
  await test(`${ai?"AI":"kurallı"}: gerçek hata ve itiraz`,async()=>{await reset(ai);const a=await sor({query:realQuery});const b=await sor({query:"Balık sevmiyor dedim, neden balık önerdin?",context:a.context,shown:a.shown});
    for(const r of [a,b]){assert.ok(r.understood.notCuisines.includes("balik"));assert.deepEqual(r.understood.notFoods,["kirmizi-et"]);assert.deepEqual(r.understood.drinks,["viski"]);assert.equal(r.understood.occasion,"ozel-gun");assert.deepEqual(r.understood.attrs,[]);assert.equal(r.items.length,0);assert.equal(r.alternatives.length,0);safe(r);}
    evidence.push({path:ai?"controlled-ai":"rules",query:realQuery,first:a,correction:b});
  });
  await test(`${ai?"AI":"kurallı"}: yeni semt ve yemek güvenlik tercihlerini silmez`,async()=>{await reset(ai);const a=await sor({query:realQuery});const b=await sor({query:"Kadıköy'de pizza olsun",context:a.context});assert.ok(b.understood.notCuisines.includes("balik"));assert.deepEqual(b.understood.notFoods,["kirmizi-et"]);assert.deepEqual(b.understood.drinks,["viski"]);});
  await test(`${ai?"AI":"kurallı"}: farklı konuşmalar birbirini etkilemez`,async()=>{await reset(ai);const a=await sor({query:realQuery});const b=await sor({query:"Balık seviyorum"});const a2=await sor({query:"Başka öner",context:a.context,shown:a.shown});assert.ok(b.items.length);assert.deepEqual(b.understood.notCuisines,[]);assert.deepEqual(b.understood.drinks,[]);assert.equal(a2.items.length,0);assert.deepEqual(a2.understood.drinks,["viski"]);});
 }
 for(const query of ["balik sevmiyor","BALIK SEVMİYORUM","balık istemiyor","Balık restoranları istemem","balık ve kebap yemiyorum","balık seviyorum ama erkek arkadaşım yemiyor"])await test("yerel olumsuzluk: "+query,()=>assert.ok(parseQuery(query).notCuisines.includes("balik")));
 await test("takip mesajıyla yeni beslenme ve içecek tercihi eklenir",async()=>{await reset(false);const a=await sor({query:"Kadıköyde bir yer"});const b=await sor({query:"Kırmızı et yemiyor, sadece viski içiyor",context:a.context});assert.deepEqual(b.understood.notFoods,["kirmizi-et"]);assert.deepEqual(b.understood.drinks,["viski"]);assert.ok(!b.understood.attrs.includes("gosterissiz"));});
 await test("olumlu ve farklı olumsuz yemek karışmaz",()=>{const i=parseQuery("Balık seviyorum ama pizza sevmiyorum");assert.equal(i.cuisine,"balik");assert.ok(i.notCuisines.includes("pizza"));assert.ok(!i.notCuisines.includes("balik"));});
 await test("isim eşleşmesi yemek dışlamasını aşmaz",()=>{const fish=VENUES.find(v=>v.kind==="Balık restoranı")!;assert.equal(findCandidates({...emptyIntent(),name:fish.slug,notCuisines:["balik"]}).some(v=>v.slug===fish.slug),false);});
 await test("tür etiketi genel olsa da balık adı dışlanır",()=>{const v:Venue={slug:"isolated-fish",name:"Deneme Balık",kind:"Restoran",district:"Kadıköy",neighborhood:null,address:null,lat:null,lng:null,hours:null,description:null,notes:[],menu:[],priceRange:null,secki:null};VENUES.push(v);try{assert.ok(!findCandidates({...emptyIntent(),notCuisines:["balik"]},{limit:10000}).some(c=>c.slug===v.slug));}finally{VENUES.pop();}});
 await test("kırmızı et odaklı türlerin tamamı dışlanır",()=>{const i=parseQuery("Kadıköy'de kırmızı et yemiyorum");assert.deepEqual(i.notFoods,["kirmizi-et"]);assert.ok(findCandidates(i,{limit:10000}).every(v=>!["Steakhouse","Kebapçı / Ocakbaşı","Dönerci","Burger"].includes(v.kind)));});
 await test("viski kanıtı varsa yalnız kanıtlı kayıt seçilir; yokluk kanıt değildir",()=>{const base:Venue={slug:"isolated-whisky",name:"Deneme",kind:"Restoran",district:"Kadıköy",neighborhood:null,address:null,lat:null,lng:null,hours:null,description:null,notes:[],menu:["Viski"],priceRange:null,secki:null};VENUES.push(base,{...base,slug:"isolated-no-whisky",menu:["Viski servisi yok"]},{...base,slug:"isolated-unverified-whisky",menu:[],notes:["Viski servisi doğrulanmadı."]});try{const r=answer(parseQuery("Kadıköy'de viski içebileceğimiz bir yer"));assert.deepEqual(r.items.map(v=>v.slug),[base.slug]);assert.match(r.items[0].why.join(" "),/viski/i);}finally{VENUES.splice(-3);}});
 for(const reason of ["provider_error","quota","invalid","timeout"])await test("AI fallback güvenli: "+reason,async()=>{await reset(true);mode=reason;const r=await sor({query:realQuery});assert.equal(r.mode,"veri");assert.deepEqual(r.understood.drinks,["viski"]);assert.ok(r.understood.notCuisines.includes("balik"));assert.equal(r.items.length,0);assert.equal(r.alternatives.length,0);});
 await test("AI seçiminde aday dışı balık ve kanıtsız servis cümlesi reddedilir",async()=>{await reset(true);const v:Venue={slug:"isolated-ai-whisky",name:"Deneme",kind:"Restoran",district:"Kadıköy",neighborhood:null,address:null,lat:null,lng:null,hours:null,description:null,notes:[],menu:["Viski"],priceRange:null,secki:null};VENUES.push(v);try{const r=await sor({query:"Kadıköy'de viski içmek istiyoruz, balık sevmiyoruz"});assert.equal(r.mode,"ai");assert.deepEqual(r.items.map(c=>c.slug),[v.slug]);assert.ok(r.gated>0);assert.ok(!r.items[0].why.some(w=>/servisi var/.test(w)));safe(r);}finally{VENUES.pop();}});
 await test("AI cache koşulları ve itirazı karıştırmaz",async()=>{await reset(true);const a=await sor({query:"Kadıköy'de balık sevmiyorum"});const n=calls;const b=await sor({query:"Kadıköy'de balık sevmiyorum"});assert.deepEqual(a,b);assert.equal(calls,n);const c=await sor({query:"Kadıköy'de balık seviyorum"});assert.ok(c.items.length);safe(a);safe(b);});
 await test("eski istemci bağlamı yeni alan varsayılanlarıyla kabul edilir",()=>{const old=JSON.parse(JSON.stringify(emptyIntent()));delete old.drinks;delete old.notFoods;delete old.occasion;const r=RequestSchema.parse({query:"Balık sevmiyor dedim",context:old});assert.deepEqual(r.context?.drinks,[]);assert.deepEqual(r.context?.notFoods,[]);});
 if(process.env.SOR_PREFERENCE_EVIDENCE)writeFileSync(process.env.SOR_PREFERENCE_EVIDENCE,JSON.stringify({pass,fail,realModelCalls:0,productionWrites:0,evidence},null,2));
 console.log(`Sor tercih regresyonu: ${pass} geçti, ${fail} kaldı. Gerçek model ve Production yazması: 0.`);process.exitCode=fail?1:0;
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{globalThis.fetch=realFetch;});
