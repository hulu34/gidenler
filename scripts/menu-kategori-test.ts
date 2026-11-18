import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { realEntities, realVenueRecords } from '../data/real';
import { realEntities as clientEntities } from '../data/real/presentation';
import { G_CATEGORIES } from '../lib/homeRank';
import { VENUES } from '../lib/sor/engine';
import { DISH_BY_SUB } from '../lib/search';
const cases = [
 ['my-home-doner-fatih', 'Dönerci'],
 ['massa-bistro-turkish-kitchen-fatih', 'Türk mutfağı'],
 ['isil-garden-rooftop-restaurant-ve-turkish-cuisine-fatih', 'Türk mutfağı'],
];
const pr72 = JSON.parse(readFileSync('data/paket/birlesik-879-kabul/kayitlar.json', 'utf8'));
assert.equal(realVenueRecords.length, 892);
for (const addition of pr72) {
 assert.deepEqual(realVenueRecords.find(e => e.slug === addition.slug), addition);
 assert.equal(clientEntities.find(e => e.slug === addition.slug)?.subcategory, addition.kind);
 assert.equal(VENUES.find(e => e.slug === addition.slug)?.kind, addition.kind);
}
const seafood = G_CATEGORIES.find(c => c.key === 'balik')!;
assert.equal(seafood.label, 'Deniz ürünleri');
for (const [slug, expected] of cases) {
 assert.equal(realVenueRecords.find(e => e.slug === slug)?.kind, expected);
 assert.equal(realEntities.find(e => e.slug === slug)?.subcategory, expected);
 assert.equal(clientEntities.find(e => e.slug === slug)?.subcategory, expected);
 assert.equal(VENUES.find(e => e.slug === slug)?.kind, expected);
 assert.equal(seafood.test(realEntities.find(e => e.slug === slug)!), false);
}
const myHome = realEntities.find(e => e.slug === cases[0][0])!;
assert.equal(G_CATEGORIES.find(c => c.key === 'doner')!.test(myHome), true);
assert.equal(G_CATEGORIES.find(c => c.key === 'kebap')!.test(myHome), false);
assert.equal(G_CATEGORIES.find(c => c.key === 'burger')!.test(myHome), false);
assert.equal(seafood.test({ ...myHome, subcategory: 'Türk mutfağı', tags: ['fish','seafood'] }), false);
assert.equal(seafood.test({ ...myHome, subcategory: 'Deniz ürünleri', menuVerifiedKind: 'Deniz ürünleri', tags: [] }), true);
// Unreviewed/secondary seafood classifications are not silently changed in this narrow fix.
for (const slug of ['koco-kadikoy', 'lacivert-beykoz']) {
 assert.equal(seafood.test(realEntities.find(e => e.slug === slug)!), true);
}
assert.ok(DISH_BY_SUB['Deniz ürünleri'].includes('balık'));
assert.ok(realEntities.every(e => e.subcategory !== 'Balık restoranı'));
assert.ok(VENUES.every(e => e.kind !== 'Balık restoranı'));
const raw = JSON.parse(readFileSync('data/real/venues.json', 'utf8'));
assert.equal(raw.find((e: {slug:string}) => e.slug === cases[0][0]).kind, 'Kebapçı / Ocakbaşı');
assert.deepEqual(raw.find((e: {slug:string}) => e.slug === cases[1][0]).cuisine, ['fish','kebab','turkish']);
const corrections = JSON.parse(readFileSync('data/real/duzeltmeler.json', 'utf8'));
for (const [slug] of cases) {
 assert.ok(corrections[slug].sourceUrl.startsWith('https://'));
 assert.equal(corrections[slug].checkedAt, '2026-11-18');
 assert.ok(corrections[slug].why.length > 20);
}
console.log('Menu category regression: all assertions passed; raw evidence retained.');
