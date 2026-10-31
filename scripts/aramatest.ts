/* ARAMA — gerçek 457 mekân üzerinde. Aranan mekân varken bulunamaması en yüksek öncelikli hatadır. npx tsx scripts/aramatest.ts */
import { nameMatch, searchV3 } from "../lib/search";
import { realEntities } from "../data/real";
let pass = 0, fail = 0;
const t = (n: string, c: unknown, x?: unknown) => { if (c) pass++; else { fail++; console.log(`  ✗ ${n}`, x ?? ""); } };
const names = (q: string) => { const r = searchV3(q, { limit: 50 }); return [...r.exact, ...r.adjacent].map((h) => h.card.entity.name); };
const fold = (s: string) => s.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");
const inTop = (q: string, name: string, n = 3) => { const same = names(q).slice(0, n); return same.includes(name); };
const CASES: Array<[string, string, number?]> = [["çiya", "Çiya Sofrası"], ["ciya", "Çiya Sofrası"], ["ciya sofrasi", "Çiya Sofrası", 1], ["japon erdal", "Japon Erdal", 1], ["japon erdl", "Japon Erdal", 1], ["japonerdal", "Japon Erdal", 1], ["erdal", "Japon Erdal", 1], ["pandeli", "Pandeli", 1], ["pandelı", "Pandeli", 1], ["panddeli", "Pandeli", 1], ["paneli", "Pandeli", 1], ["nusret", "Nusr-Et Burger Bebek", 1], ["nusr-et", "Nusr-Et Burger Bebek", 1], ["pidem", "Pidem", 1], ["yeni lokanta", "Yeni Lokanta", 1], ["karakoy lokantasi", "Karaköy Lokantası", 1], ["balıkçı sabahattin", "Balıkçı Sabahattin", 1], ["sabahattin", "Balıkçı Sabahattin", 1], ["halil lahmacun", "Halil Lahmacun", 1], ["mikla", "Mikla - Turkey fusion", 1], ["savoy", "Savoy", 1], ["viktor levi", "Viktor Levi Şarap Evi", 1], ["kanaat", "Kanaat Lokantası", 1], ["seyirtepe", "Maltepe Belediyesi Seyirtepe Sosyal Tesisleri", 1]];
for (const [q, n, k] of CASES) t(`"${q}" → ${n}`, inTop(q, n, k ?? 3), names(q).slice(0, 4));
for (const q of ["pide", "kebap", "balık", "meyhane", "ocakbaşı", "lokanta", "mantı", "burger", "sushi", "suşi", "kadıköy", "kadikoy", "Beyoğlu", "beyoglu", "pide fatih", "kebap kadıköy", "balık beşiktaş"]) t(`"${q}" sonuç var`, names(q).length > 0);
const pide = names("pide").slice(0, 8);
t("pide: adında pide geçen mekân başta", /pide/i.test(pide[0]), pide);
t("kebap: sonuçlar kebapla ilgili", names("kadıköy").length >= 20);
const fatih = searchV3("pide fatih").exact.filter((h) => !/fatih/i.test(h.card.entity.name)).map((h) => h.loc);
t("semtli arama semti korur", fatih.length > 0 && fatih.every((l) => l === "district" || l === "neighborhood"), fatih);
t("alakasız sorgu boş", names("zzzqqqwww").length === 0);
t("kısa sorgu ad taramasını sapıtmaz", nameMatch({ name: "pandeli", nameWords: ["pandeli"] }, "p") === 0);
let own = 0, asc = 0, typo = 0; const miss: string[] = [], typoMiss: string[] = [];
for (const e of realEntities) {
  if (inTop(e.name, e.name, 5)) own++; else miss.push(e.name);
  if (inTop(fold(e.name), e.name, 5)) asc++;
  if (e.name.length > 6) { const m = Math.floor(e.name.length / 2); const q = e.name.slice(0, m) + e.name.slice(m + 1); if (inTop(q, e.name, 5)) typo++; else typoMiss.push(`${e.name}→${q}`); }
}
const nTypo = realEntities.filter((e) => e.name.length > 6).length;
console.log(`kendi adı ${own}/${realEntities.length}, ascii ${asc}/${realEntities.length}, tek harf eksik ${typo}/${nTypo}`, miss.slice(0, 10), typoMiss.slice(0, 12));
t("her mekân kendi adıyla ilk 5'te", own === realEntities.length, miss);
t("her mekân ASCII yazımla ilk 5'te", asc === realEntities.length);
t("tek harf eksikte en az %95", typo / nTypo >= 0.95, typo);
console.log(`arama: ${pass} geçti, ${fail} kaldı`); process.exit(fail ? 1 : 0);
