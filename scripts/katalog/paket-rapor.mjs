/* STANDART PAKET RAPORU (paket 16+): altı tablo + kümülatif büyüme + üç başarı göstergesi, paket dosyalarından üretilir.
   Sayılar elle yazılmaz; testler ve GitHub bilgileri girdi dosyasından (rapor-girdi.json) gelir.
   Kullanım: node scripts/katalog/paket-rapor.mjs <paket-klasörü> <rapor-girdi.json> <ilce-sayim.json>  → stdout (markdown) */
import { readFileSync } from "node:fs";
const [dir, girdiP, ilceP] = process.argv.slice(2);
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const P = J(`${dir}/paket.json`).eklenen, I = J(`${dir}/inceleme.json`).kayitlar, G = J(girdiP), ILCE = J(ilceP);
const n = G.incelenen, pct = (x, t = n) => `%${(100 * x / t).toFixed(1).replace(".", ",")}`;
const A = P.filter((r) => r.sinif === "A").length, AK = P.filter((r) => r.sinif === "A-konumsuz").length;
const by = (s) => I.filter((x) => x.sinif === s).length;
const B = by("B"), C = by("C"), V906 = by("906"), cak = by("çakışma");
const diger = n - (A + AK + B + C + V906 + cak + G.prodMevcut + G.prMevcut);
const az = P.filter((r) => (ILCE[r.ilce] ?? 0) < 25).length;
const alan = P.reduce((s, r) => s + (r.sinif === "A" ? 5 : 4), 0) / (5 * Math.max(P.length, 1));
const L = [];
L.push(`**Başarı göstergeleri:**`,
  `- İncelenen adaylardan doğrulananlar: ${A + AK}/${n} (${pct(A + AK)})`,
  `- Restoran başına doğrulanmış veri alanı: ${pct(alan * 100, 100)} (5 eksen: kimlik, faaliyet, adres, tür, koordinat; A = 5/5, A-konumsuz = 4/5)`,
  `- Az temsil edilen ilçelere (katalogda < 25 mekân) kazandırılan: ${az}`, "");
const t1 = G.onceki; const yeniBekleyen = t1.bekleyen + A + AK;
L.push("**Tablo 1 — Genel durum**", "", "| Gösterge | Önceki durum | Yeni durum | Değişim |", "|---|---:|---:|---:|",
  `| Production mekân sayısı | ${G.production} | ${G.production} | 0 |`,
  `| Yayını bekleyen benzersiz kayıtlar | ${t1.bekleyen} | ${yeniBekleyen} | +${A + AK} |`,
  `| Yeni A sınıfı (bekleyen toplam) | ${t1.A} | ${t1.A + A} | +${A} |`,
  `| Yeni A-konumsuz (bekleyen toplam) | ${t1.AK} | ${t1.AK + AK} | +${AK} |`,
  `| Toplam yayın adayı (A + B1 + A-konumsuz) | ${t1.bekleyen} | ${yeniBekleyen} | +${A + AK} |`,
  `| Yayın sonrası hedef mekân sayısı | ${G.production + t1.bekleyen} | ${G.production + yeniBekleyen} | +${A + AK} |`, "");
L.push(`**Tablo 2 — Araştırma ve doğrulama sonuçları (${n} aday, birbirini dışlayan)**`, "", "| Sonuç | Adet | Oran |", "|---|---:|---:|",
  `| İncelenen aday | ${n} | %100 |`, `| Production'da mevcut | ${G.prodMevcut} | ${pct(G.prodMevcut)} |`, `| Açık PR'larda mevcut | ${G.prMevcut + cak} | ${pct(G.prMevcut + cak)} |`,
  `| 906 havuzuyla ortak | ${V906} | ${pct(V906)} |`, `| Yeni A | ${A} | ${pct(A)} |`, `| Yeni A-konumsuz | ${AK} | ${pct(AK)} |`,
  `| B — eksik kanıt | ${B} | ${pct(B)} |`, `| C — güvenilir değil / kapsam dışı | ${C} | ${pct(C)} |`, `| Diğer elenenler | ${diger} | ${pct(diger)} |`, "");
const top = P.slice().sort((a, b) => b.oncelikPuani - a.oncelikPuani).slice(0, 20);
L.push(`**Tablo 3 — Yeni restoranlar (öncelik sırasına göre ilk ${top.length}; tam liste paket.json)**`, "", "| Restoran | İlçe | Mutfak | Kalite | Konum güveni | Kanıt |", "|---|---|---|---|---|---|",
  ...top.map((r) => { const u = r.kaynak.find((k) => /^https?:/.test(k) && !k.includes("openstreetmap")); const esc = (x) => String(x).replace(/\|/g, "\\|"); return `| ${esc(r.ad)} | ${r.ilce} | ${esc(r.tur)} | ${r.sinif} | ${r.sinif === "A" ? "OSM restoran kaydı" : "yok (Overture önerisi ayrı)"} | [${new URL(u).host.replace(/^www\./, "")}](${u}) |`; }), "");
const cnt = (re) => I.filter((x) => [...(x.eksik ?? []), ...(x.neden ?? [])].some((s) => re.test(s))).length;
L.push("**Tablo 4 — Eksikler ve riskler**", "", "| Sorun | Etkilenen kayıt | Önem derecesi | Çözüm / sonraki işlem |", "|---|---:|---|---|",
  `| Koordinat doğrulanamadı | ${AK} | Orta | A-konumsuz; Overture noktası yalnız öneri dosyasında, şema kararı Codex'te |`,
  `| Tam adres eksik | ${cnt(/adres|kapı numarası/)} | Yüksek (B) | iletişim sayfası derin tarama, schema.org PostalAddress |`,
  `| Resmî site doğrulanamadı | ${cnt(/http|ilçe resmî sitede/)} | Orta (B) | https / ilçe kanıtı bulunursa yeniden ölçüm |`,
  `| Mutfak türü belirsiz | ${cnt(/tür|türü|kategori/)} | Orta (B) | menü sayfası; Overture kategorisi tek başına kabul edilmez |`,
  `| Mükerrer şüphesi | ${V906 + cak} | Düşük | yeni kayıt açılmadı; 906 kimliği korunur |`,
  ...(G.ekRisk ?? []).map((r) => `| ${r.sorun} | ${r.adet} | ${r.onem} | ${r.cozum} |`), "");
L.push("**Tablo 5 — Test ve yayın hazırlığı**", "", "| Test | Sonuç | Başarılı / Toplam | Açıklama |", "|---|---|---|---|", ...G.testler.map((t) => `| ${t.ad} | ${t.sonuc} | ${t.oran} | ${t.not} |`), "");
L.push("**Tablo 6 — GitHub teslim bilgileri**", "", "| Alan | Değer |", "|---|---|", ...Object.entries(G.github).map(([k, v]) => `| ${k} | ${v} |`), "");
L.push("**Kümülatif büyüme**", "", "| Paket | Yeni A | Yeni A-konumsuz | Yeni B1 | Kümülatif hedef | Yayın durumu |", "|---|---:|---:|---:|---:|---|", ...G.kumulatif.map((k) => `| ${k.paket} | ${k.A} | ${k.AK} | ${k.B1} | ${k.hedef} | ${k.durum} |`));
console.log(L.join("\n"));
