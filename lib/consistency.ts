import { getTopic } from "@/lib/api";
import { pulseOf } from "@/lib/pulse";
import { score1, windowIn } from "@/lib/format";

/* ==========================================================================
   DENEYİM – GRAFİK – PUAN TUTARLILIĞI (denetim; yalnız okur, hiçbir şeyi değiştirmez)
   Mevcut hesaplama kurallarına göre bir mekân sayfasında yan yana görünen sayıların çelişmediğini denetler:
   · aylık grafikteki deneyim sayılarının toplamı toplam deneyim sayısını aşamaz
   · manşet puan = grafiğin son ayı; "son 12 ay · N deneyim" = son 12 ayın toplamı (pulse)
   · özetteki "son üç ay" sayısı = grafiğin son 3 ayı; "son 12 ay" = son 12 ayı
   · özetteki yön cümlesi (yükseldi / geriledi / stabil) = sayfadaki son üç ay yönü (±0,15)
   · konu sayıları toplam deneyim sayısını aşamaz
   Gösterilen deneyim metinleri örnek seçkidir; ortalamalarının puana eşit olması BEKLENMEZ (yalnız bilgi olarak raporlanır).
   ========================================================================== */

export interface ConsistencyIssue { slug: string; rule: string; detail: string }

export function checkConsistency(slug: string): { issues: ConsistencyIssue[]; info: string[] } {
  const t = getTopic(slug);
  const issues: ConsistencyIssue[] = []; const info: string[] = [];
  if (!t) return { issues: [{ slug, rule: "bulunamadı", detail: "" }], info };
  const I = t.intelligence, tl = I.timeline, n = tl.length;
  const bad = (rule: string, detail: string) => issues.push({ slug, rule, detail });
  const sum = (xs: typeof tl) => xs.reduce((a, p) => a + p.experienceCount, 0);
  if (sum(tl) > I.experienceCount) bad("grafik toplamı > toplam deneyim", `${sum(tl)} > ${I.experienceCount}`);
  if (n && I.overallScore !== tl[n - 1].score) bad("manşet puan ≠ grafiğin son ayı", `${I.overallScore} ≠ ${tl[n - 1].score}`);
  const p = pulseOf(t.entity.id);
  if (p && p.volume !== sum(tl.slice(-12))) bad("nabız hacmi ≠ son 12 ay", `${p.volume} ≠ ${sum(tl.slice(-12))}`);
  const s = I.aiSummary;
  if (s && n) {
    const want = s.windowDays === 90 ? sum(tl.slice(-3)) : s.windowDays === 365 ? sum(tl.slice(-12)) : null;
    if (want === null) bad("özet penceresi tanımsız", `${s.windowDays} gün`);
    else if (s.basedOnCount !== want) bad(`özet "${windowIn(s.windowDays)}" sayısı ≠ grafik`, `${s.basedOnCount} ≠ ${want}`);
    const text = s.lines.join(" ");
    for (const m of text.matchAll(/(\d[\d.]*) deneyim/g)) if (Number(m[1].replace(/\./g, "")) > I.experienceCount) bad("özette toplamdan büyük sayı", m[0]);
    const dir = I.scoreTrend.direction;
    if (/son üç ayda [+−-]?[\d,.]+ yükseldi/.test(text) && dir !== "up") bad("özet \"yükseldi\" diyor, son üç ay yönü değil", dir);
    if (/son üç ayda [−-]?[\d,.]+ geriledi/.test(text) && dir !== "down") bad("özet \"geriledi\" diyor, son üç ay yönü değil", dir);
    if (/son üç ayda stabil/.test(text) && dir !== "flat") bad("özet \"stabil\" diyor, son üç ay yönü değil", dir);
    const m = text.match(/son üç ayda ([+−-])([\d,.]+) (yükseldi|geriledi)/);
    if (m && score1(Math.abs(I.scoreTrend.delta)) !== m[2].replace(".", ",")) bad("özetteki üç ay değişimi ≠ sayfadaki", `${m[1]}${m[2]} ≠ ${I.scoreTrend.delta}`);
  }
  for (const th of [...I.positiveThemes, ...I.negativeThemes]) if (th.count > I.experienceCount) bad("konu sayısı > toplam deneyim", `${th.label} ${th.count}`);
  const ex = t.experiences;
  if (ex.length) {
    const avg = ex.reduce((a, e) => a + e.overall, 0) / ex.length;
    info.push(`örnek seçki ${ex.length}/${I.experienceCount} metin, ortalaması ${score1(avg)} · puan ${I.overallScore === null ? "—" : score1(I.overallScore)}`);
  } else info.push(`deneyim metni gösterilmiyor (${I.experienceCount} deneyimin özeti)`);
  return { issues, info };
}
