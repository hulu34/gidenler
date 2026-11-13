import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BASE,pool,gitJson} from './pr41-fixture';
export async function checkAddresses(){
 const slugs=['altin-sofra-kucukcekmece','bayindir-restoran-pendik','antula-gurme-beykoz'];
 const old=new Map([...gitJson(BASE,'data/real/venues.json'),...gitJson(BASE,'data/real/isletme.json')].map((v:any)=>[v.slug,v]));
 const current=JSON.parse(readFileSync('../candidate/data/real/venues.json','utf8'));const c=await pool.connect();
 const initial=(await c.query('SELECT * FROM places WHERE slug=ANY($1::text[]) ORDER BY slug',[slugs])).rows;assert.equal(initial.length,3);
 await c.query('BEGIN');
 try{
  // Reproduce the exact published baseline only inside a throwaway transaction; no Production data is copied.
  for(const row of initial){const v=old.get(row.slug) as any;await c.query('UPDATE places SET address=$1,neighborhood=$2 WHERE id=$3',[v.address,v.neighborhood??null,row.id])}
  const before=(await c.query('SELECT * FROM places WHERE slug=ANY($1::text[]) ORDER BY slug',[slugs])).rows;await c.query('SAVEPOINT bounded_address_patch');
  for(const row of before){const v=current.find((x:any)=>x.slug===row.slug);assert(v);const r=await c.query('UPDATE places SET address=$1,neighborhood=$2 WHERE id=$3 AND slug=$4 AND address IS NOT DISTINCT FROM $5 AND neighborhood IS NOT DISTINCT FROM $6 RETURNING *',[v.address,v.neighborhood??null,row.id,row.slug,row.address,row.neighborhood]);assert.equal(r.rowCount,1);for(const k of Object.keys(row))if(!['address','neighborhood'].includes(k))assert.deepEqual(r.rows[0][k],row[k]);
   const repeat=await c.query('UPDATE places SET address=$1,neighborhood=$2 WHERE id=$3 AND (address IS DISTINCT FROM $1 OR neighborhood IS DISTINCT FROM $2)',[v.address,v.neighborhood??null,row.id]);assert.equal(repeat.rowCount,0)
  }
  await c.query('ROLLBACK TO SAVEPOINT bounded_address_patch');assert.deepEqual((await c.query('SELECT * FROM places WHERE slug=ANY($1::text[]) ORDER BY slug',[slugs])).rows,before);await c.query('ROLLBACK');
  assert.deepEqual((await c.query('SELECT * FROM places WHERE slug=ANY($1::text[]) ORDER BY slug',[slugs])).rows,initial);return {records:3,slugs,changedColumns:['address','neighborhood'],repeatNoOp:true,targetedRollback:true,initialIsolatedStateRestored:true};
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
