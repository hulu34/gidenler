/* #76 tadilat düzeltmesi; katalog ve Atlas birleşimi için geçerli. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { activeEntities, invalidRecord, realEntities, realVenueRecords } from '../data/real';
import first from '../data/paket/katalog-905/kayitlar.json';
import next from '../data/paket/katalog-913/kayitlar.json';

const previous = 'eb8c9863a9446b803bd9e46229e80b3aeb6b3d4f';
const live = '9a2f2f482b65709e862397911438d99b06230e2c';
const hold = 'burger-yiyelim-sancaktepe-bagcilar';
const oasis = 'burger-yiyelim-15-temmuz-bagcilar';
const proposed = [...first, ...next];
assert.equal(proposed.length, 21);
assert.equal(proposed.filter(r => r.slug === hold).length, 1);
const accepted = proposed.filter(r => r.slug !== hold);
const added = new Set(accepted.map(r => r.slug));
assert.equal(added.size, 20);
assert(added.has(oasis));

type Row = {slug: string};
const at = (sha: string, path: string) => JSON.parse(execFileSync('git', ['show', `${sha}:${path}`], {encoding: 'utf8'})) as Row[];
for (const index of ['isletme', 'presentation', 'sor-index']) {
  const path = `data/real/${index}.json`;
  const rows = JSON.parse(readFileSync(path, 'utf8')) as Row[];
  const baseline = at(live, path);
  assert.equal(rows.length, baseline.length + added.size, path);
  assert.equal(new Set(rows.map(r => r.slug)).size, rows.length, path);
  assert(!rows.some(r => r.slug === hold), path);
  assert.deepEqual(rows, at(previous, path).filter(r => r.slug !== hold), `${path}: only hold removed`);
  assert.deepEqual(rows.filter(r => !added.has(r.slug)), baseline, `${path}: all live rows unchanged`);
  assert.deepEqual(new Set(rows.filter(r => added.has(r.slug)).map(r => r.slug)), added, path);
  if (index === 'isletme') assert.deepEqual(rows.filter(r => added.has(r.slug)), accepted);
}
assert.equal(realVenueRecords.length, 912);
assert.equal(new Set(realVenueRecords.map(r => r.ref)).size, 912);
assert.equal(realEntities.length, 912);
assert.equal(activeEntities.length, 877);
assert.deepEqual(Object.fromEntries(['cat.restaurant','cat.cafe','cat.bar'].map(id => [
  id, activeEntities.filter(e => e.categoryId === id).length,
])), {'cat.restaurant': 752, 'cat.cafe': 114, 'cat.bar': 11});
for (const row of accepted) {
  const canonical = realVenueRecords.find(r => r.slug === row.slug);
  assert(canonical, row.slug);
  assert.equal(invalidRecord(canonical), null, row.slug);
  const entity = activeEntities.find(e => e.slug === row.slug);
  assert.equal(entity?.address, row.address, row.slug);
  assert.equal(entity?.location?.geo, undefined, row.slug);
}
assert(!realEntities.some(e => e.slug === hold));
console.log('PASS: +20 only; all 892 live rows preserved in three sources; Oasis retained; 912 / 877 / 752.');
