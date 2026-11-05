/* Ana sayfa vitrini: çeşitlilik ve tarafsızlık kuralları (yalnız veri; ağ yok). */
import { readFileSync } from "node:fs";
import { realEntities } from "../data/real";
import { pickDiverse, HOME_EXCLUDE } from "../components/home/HomeDiscover";
let ok = 0, bad = 0; const t = (n: string, c: boolean, i = "") => { if (c) ok++; else bad++; console.log(`${c ? "✓" : "✗"} ${n}${i ? " · " + i : ""}`); };
const p = pickDiverse(realEntities, {});
t("4–6 mekân", p.length >= 4 && p.length <= 6, String(p.length));
t("kurucuyla ilişkili mekân vitrinde yok", !p.some((e) => HOME_EXCLUDE.has(e.slug)));
t("her tür en çok bir kez", new Set(p.map((e) => e.subcategory)).size === p.length);
t("her semt en çok bir kez", new Set(p.map((e) => e.location?.district)).size === p.length);
t("yalnız gerçek restoran kaydı", p.every((e) => e.isReal && !e.isDemo && e.categoryId === "cat.restaurant"));
t("seçim deterministik", JSON.stringify(pickDiverse(realEntities, {}).map((e) => e.slug)) === JSON.stringify(p.map((e) => e.slug)));
const page = readFileSync("app/page.tsx", "utf8");
t("gerçek ana sayfada tek Seçki yazısı vitrini yok", !/<HomeSecki/.test(page));
t("ana sayfa soru alanı gerçek /sor'a gider", /sorHref|\/sor\/\?q=/.test(readFileSync("components/home/HomeSor.tsx", "utf8")));
const sor = ["lib/sor/engine.ts", "lib/sor/ask.ts"].map((f) => readFileSync(f, "utf8")).join("\n");
t("Sor motorunda mekâna özel ayrıcalık/ceza yok", !/japon-erdal|HOME_EXCLUDE/i.test(sor));
console.log(`ana sayfa: ${ok} geçti, ${bad} kaldı`); process.exit(bad ? 1 : 0);
