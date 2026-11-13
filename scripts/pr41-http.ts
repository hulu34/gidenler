import assert from 'node:assert/strict';
export const origin='http://localhost:3189';
export async function request(body?:unknown,headers:Record<string,string>={},path='/api/admin/db/'){
 const r=await fetch(origin+path,{method:body?'POST':'GET',redirect:'error',headers:{Origin:origin,'Sec-Fetch-Site':'same-origin','Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90000)});
 return {status:r.status,body:await r.json()};
}
export async function get(slug:string){const r=await request(undefined,{},'/api/admin/db/?rapor=profil&slug='+encodeURIComponent(slug));assert.equal(r.status,200);return r.body}
export async function apply(profile:any){const r=await request({action:'profile-apply',target:'preview',confirm:'EVET',profile});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.body.ok,true);assert.equal(r.body.profileOk,true);return r.body}
export const rollback=(auditId:string)=>request({action:'profile-rollback',target:'preview',confirm:'GERI-AL',auditId});
export const business=(j:any)=>({place:j.place,profile:j.profile,videos:[...j.videos].sort((a:any,b:any)=>a.id.localeCompare(b.id))});
export const requireRolledBack=(r:any)=>{assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.body.ok,true)};
