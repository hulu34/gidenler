import ExcelJS from "exceljs";
import { COLUMNS, DERIVED, FINAL, HEADERS, OPTIONAL_HEADERS, STATUS, summarize, withDerived, type ColKey, type Decision, type Row } from "./core";

/* Excel okuma/yazma. Biçim 2 (8 sayfa):
   1 Tüm Mekânlar (veri, okunan sayfa) · 2 Puanı Doğrulananlar · 3 Aktarım Bekleyenler · 4 Yanlış Eşleşmeler · 5 Kapalı Mekânlar
   6 Place ID Eksikleri · 7 Güncelleme Geçmişi · 8 Yönetici Özeti — ayrıca Değişimler (puan geçmişi), Açıklama ve gizli _bicim.
   Okuyucu yalnız "Tüm Mekânlar"ı (eski dosyada "Mekânlar") okur, başlıkları ADLA eşler; türetilmiş sütunlar yok sayılır. */
export const FORMAT = "gidenler-google-puan/2";
const FORMATS: ReadonlySet<string> = new Set(["gidenler-google-puan/1", FORMAT]);
const SHEET = "Tüm Mekânlar";
const SHEETS_READ = [SHEET, "Mekânlar"];
const NUM: ReadonlySet<ColKey> = new Set(["rating", "reviews", "prevRating", "prevReviews", "distance", "nameSim"]);

const FILL: Record<string, string> = {
  [STATUS.fresh]: "FFD9F2D9", [STATUS.same]: "FFEAF6EA", [STATUS.waiting]: "FFF2F2F2", [STATUS.isNew]: "FFDDEBFF",
  [STATUS.error]: "FFFDE2C8", [STATUS.blocked]: "FFF8CBCB", [STATUS.branch]: "FFFBD3E9", [STATUS.noMatch]: "FFEDEDED",
  [STATUS.deferred]: "FFFFF2B3", [STATUS.removed]: "FFD0D0D0", [STATUS.typeMismatch]: "FFFBD3E9",
  [STATUS.typeSuspect]: "FFFFE0B2", [STATUS.typeUnknown]: "FFFFF2B3", [STATUS.closed]: "FFD0D0D0",
};
const FINAL_FILL: Record<string, string> = {
  [FINAL.shown]: "FFD9F2D9", [FINAL.awaitingMatch]: "FFFFF2B3", [FINAL.typeReview]: "FFFFE0B2", [FINAL.branch]: "FFFBD3E9", [FINAL.location]: "FFFBD3E9",
  [FINAL.wrongType]: "FFFBD3E9", [FINAL.closed]: "FFD0D0D0", [FINAL.noPlaceId]: "FFEDEDED", [FINAL.readError]: "FFFDE2C8", [FINAL.rejected]: "FFF8CBCB",
};

export interface Change { at: string; slug: string; name: string; from: number | null; to: number; fromN: number | null; toN: number | null }
export interface ClosureInfo { state: string; checkedAt: string; google: string; match: string; official: string; confidence: string; note: string }
export interface Meta { generatedAt: string; run?: string; note?: string; decisions?: Map<string, Decision>; closures?: Record<string, ClosureInfo>; site?: { shown: number; hidden: number } | null;
  /** isteğe bağlı: bekleyen eşleşmelerin kanıt seviyesi (A güçlü · B orta · C zayıf/çelişkili) — karar değildir */
  evidence?: Record<string, { tier: string; why: string; matcher?: string }> }

type Col = { header: string; key: string; width: number };
function sheet(wb: ExcelJS.Workbook, name: string, cols: Col[], rows: object[], freeze = 1) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", xSplit: freeze > 1 ? 2 : 0, ySplit: 1 }] });
  ws.columns = cols;
  for (const r of rows) ws.addRow(r);
  const head = ws.getRow(1); head.font = { bold: true, color: { argb: "FFFFFFFF" } }; head.height = 30; head.alignment = { vertical: "middle", wrapText: true };
  head.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } }; });
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: cols.length } };
  return ws;
}
const link = (ws: ExcelJS.Worksheet, key: string) => { const col = ws.getColumn(key); col.eachCell((c, i) => { const v = String(c.value ?? ""); if (i > 1 && v.startsWith("https://")) c.value = { text: v, hyperlink: v }; }); };
const tint = (ws: ExcelJS.Worksheet, key: string, map: Record<string, string>) => { ws.getColumn(key).eachCell((c, i) => { const v = String(c.value ?? ""); if (i > 1 && map[v]) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: map[v] } }; }); };
const pct = (a: number, b: number) => (b ? `%${((a / b) * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}` : "—");

export async function writeWorkbook(rowsIn: Row[], meta: Meta, changes: Change[] = []): Promise<Buffer> {
  const decisions = meta.decisions ?? new Map<string, Decision>();
  const closures = meta.closures ?? {};
  const rows = withDerived(rowsIn, decisions);
  const act = rows.filter((r) => r.record === "Aktif");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gidenler"; wb.created = new Date(meta.generatedAt);

  /* 1 · Tüm Mekânlar */
  const ws = sheet(wb, SHEET, COLUMNS.map(([key, header, width]) => ({ key, header, width })), rows.map((r) => Object.fromEntries(COLUMNS.map(([k]) => [k, r[k] ?? null]))), 2);
  ws.getColumn("rating").numFmt = "0.0"; tint(ws, "status", FILL); tint(ws, "finalState", FINAL_FILL); link(ws, "mapsUrl"); link(ws, "profileUrl");

  const base: Col[] = [{ header: "Gidenler ID", key: "slug", width: 34 }, { header: "Mekân adı", key: "name", width: 30 }, { header: "İlçe", key: "district", width: 13 }];
  const by = (...states: string[]) => act.filter((r) => states.includes(r.finalState));
  /* 2 · Puanı Doğrulananlar */
  const ok = sheet(wb, "Puanı Doğrulananlar", [...base, { header: "Google puanı (5 üzerinden)", key: "rating", width: 12 }, { header: "Değerlendirme sayısı", key: "reviews", width: 12 }, { header: "Eşleşme güveni", key: "confidence", width: 14 }, { header: "Google'daki tür", key: "seenCategory", width: 22 }, { header: "Son kontrol", key: "checkedAt", width: 20 }, { header: "Not", key: "finalReason", width: 50 }, { header: "Google Maps", key: "mapsUrl", width: 30 }, { header: "Gidenler profili", key: "profileUrl", width: 30 }], by(FINAL.shown));
  ok.getColumn("rating").numFmt = "0.0"; link(ok, "mapsUrl"); link(ok, "profileUrl");
  /* 3 · Aktarım Bekleyenler */
  const ev = meta.evidence ?? {};
  const TIER: Record<string, string> = { A: "A · güçlü kanıt — onay önerilir", B: "B · orta — elle bakılmalı", C: "C · zayıf/çelişkili — onaylanmamalı" };
  const wait = sheet(wb, "Aktarım Bekleyenler", [...base, { header: "Nihai durum", key: "finalState", width: 30 }, { header: "Neden", key: "finalReason", width: 60 }, { header: "Kanıt seviyesi", key: "tier", width: 30 }, { header: "Kanıt", key: "evWhy", width: 60 }, { header: "Okunan puan", key: "rating", width: 10 }, { header: "Eşleşme güveni", key: "confidence", width: 14 }, { header: "Google'da görünen ad", key: "seenName", width: 30 }, { header: "Google'daki tür", key: "seenCategory", width: 20 }, { header: "Konum farkı (m)", key: "distance", width: 10 }, { header: "Ad benzerliği", key: "nameSim", width: 10 }, { header: "Google Maps", key: "mapsUrl", width: 30 }], by(FINAL.awaitingMatch, FINAL.typeReview, FINAL.readError, FINAL.notTried, FINAL.other).map((r) => ({ ...r, tier: ev[r.slug] ? TIER[ev[r.slug].tier] ?? ev[r.slug].tier : "", evWhy: ev[r.slug]?.why ?? "" })));
  tint(wait, "finalState", FINAL_FILL); link(wait, "mapsUrl");
  /* 4 · Yanlış Eşleşmeler */
  const bad = sheet(wb, "Yanlış Eşleşmeler", [...base, { header: "Sorun", key: "finalState", width: 26 }, { header: "Açıklama", key: "finalReason", width: 60 }, { header: "Gidenler'deki adres", key: "address", width: 36 }, { header: "Google'da görünen ad", key: "seenName", width: 30 }, { header: "Google'da görünen adres", key: "seenAddress", width: 40 }, { header: "Google'daki tür", key: "seenCategory", width: 22 }, { header: "Konum farkı (m)", key: "distance", width: 10 }, { header: "Ad benzerliği", key: "nameSim", width: 10 }, { header: "Google Maps", key: "mapsUrl", width: 30 }], by(FINAL.branch, FINAL.location, FINAL.wrongType, FINAL.rejected).concat(act.filter((r) => r.finalState === FINAL.typeReview && r.status === STATUS.typeSuspect)));
  tint(bad, "finalState", FINAL_FILL); link(bad, "mapsUrl");
  /* 5 · Kapalı Mekânlar */
  const closedRows = act.filter((r) => r.status === STATUS.closed || closures[r.slug]).map((r) => {
    const c = closures[r.slug];
    return { ...r, cState: c ? (c.state === "closed_confirmed" ? "Kesin kapalı (closed_confirmed)" : c.state === "reopened" ? "Yeniden açıldı" : "Şüpheli (elle inceleme)") : "Denetlenmedi (yalnız otomatik okuma)",
      cGoogle: c?.google ?? "Kalıcı kapalı (otomatik okuma)", cMatch: c?.match ?? r.confidence, cOfficial: c?.official ?? "", cConf: c?.confidence ?? "", cAt: c?.checkedAt ?? r.attemptAt.slice(0, 10), cNote: c?.note ?? "" };
  });
  sheet(wb, "Kapalı Mekânlar", [...base, { header: "Kapanma durumu", key: "cState", width: 30 }, { header: "Google'ın gösterdiği durum", key: "cGoogle", width: 36 }, { header: "Eşleşme", key: "cMatch", width: 14 }, { header: "Gidenler'deki adres", key: "address", width: 36 }, { header: "Resmî kaynak kontrolü", key: "cOfficial", width: 50 }, { header: "Güven", key: "cConf", width: 10 }, { header: "Kontrol tarihi", key: "cAt", width: 14 }, { header: "Not", key: "cNote", width: 50 }, { header: "Google Maps", key: "mapsUrl", width: 30 }], closedRows);
  /* 6 · Place ID Eksikleri */
  sheet(wb, "Place ID Eksikleri", [...base, { header: "Kategori", key: "category", width: 11 }, { header: "Adres", key: "address", width: 40 }, { header: "Eşleşme durumu", key: "confidence", width: 16 }, { header: "Açıklama", key: "finalReason", width: 60 }, { header: "Gidenler profili", key: "profileUrl", width: 30 }], by(FINAL.noPlaceId));
  /* 7 · Güncelleme Geçmişi */
  const hist = sheet(wb, "Güncelleme Geçmişi", [...base, { header: "Son deneme", key: "attemptAt", width: 20 }, { header: "Son başarılı kontrol", key: "checkedAt", width: 20 }, { header: "Güncelleme durumu", key: "status", width: 18 }, { header: "Google görünümü", key: "view", width: 10 }, { header: "Hata / not", key: "error", width: 60 }, { header: "Önceki puan", key: "prevRating", width: 10 }, { header: "Puan", key: "rating", width: 10 }], act.filter((r) => r.placeId).sort((a, b) => (b.attemptAt || "").localeCompare(a.attemptAt || "")));
  tint(hist, "status", FILL);

  /* 8 · Yönetici Özeti */
  const s = summarize(rowsIn);
  const count = (st: string) => act.filter((r) => r.finalState === st).length;
  const shown = count(FINAL.shown);
  const lines: Array<[string, string | number]> = [
    ["Oluşturma (UTC)", meta.generatedAt], ...(meta.run ? [["Çalışma", meta.run] as [string, string]] : []),
    ["Aktif mekân", s.active], ["Google Place ID'si olan", s.withPlaceId], ["Google puanı okunmuş (herhangi bir zamanda)", s.withRating],
    ["— Nihai durum —", ""],
    ...Object.values(FINAL).map((f) => [f, count(f)] as [string, number]),
    ["— Tamamlanma —", ""],
    ["Puanı doğrulanıp sitede gösterilebilen", `${shown} / ${s.active} (${pct(shown, s.active)})`],
    ["Place ID'si olanlar içinde", `${shown} / ${s.withPlaceId} (${pct(shown, s.withPlaceId)})`],
    ["Değerlendirme sayısı da bilinen (sıralamaya girebilen)", act.filter((r) => r.finalState === FINAL.shown && r.reviews != null).length],
    ["Elle inceleme bekleyen (eşleşme + tür)", count(FINAL.awaitingMatch) + count(FINAL.typeReview)],
    ["Kesin kapalı (kapanış kaydı)", Object.values(closures).filter((c) => c.state === "closed_confirmed").length],
    ["Kapanması şüpheli (kapanış kaydı)", Object.values(closures).filter((c) => c.state === "closed_suspected").length],
    ["Yönetici kararı olan", [...decisions.values()].length],
    ...(Object.keys(ev).length ? (["A", "B", "C"].map((t) => [`Bekleyen eşleşme · kanıt ${TIER[t]}`, Object.values(ev).filter((x) => x.tier === t).length]) as Array<[string, number]>) : []),
    ...(meta.site ? [["Sitede gösterilen (veritabanı)", meta.site.shown] as [string, number], ["Sitede gizlenen (veritabanı)", meta.site.hidden] as [string, number]] : []),
    ...(meta.note ? [["Not", meta.note] as [string, string]] : []),
  ];
  const sum = sheet(wb, "Yönetici Özeti", [{ header: "Gösterge", key: "k", width: 52 }, { header: "Değer", key: "v", width: 26 }], lines.map(([k, v]) => ({ k, v })));
  sum.eachRow((row) => { if (String(row.getCell(1).value).startsWith("—")) row.font = { bold: true }; });

  const ch = sheet(wb, "Değişimler", [{ header: "Tarih", key: "at", width: 20 }, { header: "Gidenler ID", key: "slug", width: 34 }, { header: "Mekân adı", key: "name", width: 30 }, { header: "Önceki puan", key: "from", width: 12 }, { header: "Yeni puan", key: "to", width: 12 }, { header: "Önceki sayı", key: "fromN", width: 12 }, { header: "Yeni sayı", key: "toN", width: 12 }], changes);
  void ch;
  const info = wb.addWorksheet("Açıklama");
  info.columns = [{ header: "Başlık", key: "k", width: 30 }, { header: "Açıklama", key: "v", width: 110 }];
  for (const [k, v] of [
    ["Puan", "Google puanı 5 üzerindendir ve Gidenler puanı (10 üzerinden) değildir. İki puan hiçbir hesapta karışmaz."],
    ["Nihai durum", "Her mekân için tek cevap: kimlik doğru mu, puan güvenilir mi, sitede gösteriliyor mu. 'Puan doğrulandı (sitede)' dışındaki her durum gerekçesiyle yazılır."],
    ["Siteye aktarım", "Yalnız 'Onaylı' veya 'Otomatik' eşleşmeli (ya da yönetici onaylı), şube ve tür kontrolünü geçen satırlar aktarılır. Türü okunamayan, konaklama adı taşıyan ya da yeme-içme dışı türdeki kayıtlar yönetici onayı bekler."],
    ["Gizleme", "Yanlış tür/şube, kalıcı kapanma ya da yönetici reddi gibi olumsuz kanıt, sitede önceden gösterilen puanı gizler; satır ve geçmiş silinmez."],
    ["Değerlendirme sayısı", "Google sayfayı sınırlı görünümde verdiğinde sayı gösterilmez; o durumda sayı boş kalır (uydurulmaz) ve mekân sıralamaya girmez."],
    ["Başarısız deneme", "Puan silinmez veya sıfırlanmaz; önceki doğrulanmış değer ve son kontrol tarihi korunur, satır hata olarak işaretlenir."],
    ["Yönetici kararı", "Onay/ret veritabanında, gerekçesi ve denetim kaydıyla tutulur. Bu dosyadaki 'Yönetici kararı' sütunu yalnız gösterimdir; dosyayı elle düzenlemek karar yerine geçmez."],
    ["Kaynak", "Geçici kaynak: Google Maps'in herkese açık sayfası. Google'ın hizmet şartları otomatik okumayı ve verinin saklanmasını kısıtlar; bu kaynak yatırım sonrasında değiştirilecek."],
  ]) info.addRow({ k, v });
  info.getRow(1).font = { bold: true }; info.getColumn(2).alignment = { wrapText: true };

  const m = wb.addWorksheet("_bicim", { state: "veryHidden" });
  m.addRow(["format", FORMAT]); m.addRow(["generatedAt", meta.generatedAt]); m.addRow(["rows", rows.length]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const cellText = (v: ExcelJS.CellValue): string => {
  if (v == null) return "";
  if (typeof v === "object") {
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    if (v instanceof Date) return v.toISOString();
  }
  return String(v).trim();
};

export interface ReadResult { rows: Row[]; changes: Change[]; format: string | null; errors: string[] }
export async function readWorkbook(buf: Buffer | Uint8Array): Promise<ReadResult> {
  const wb = new ExcelJS.Workbook(); const errors: string[] = [];
  try { await wb.xlsx.load(buf as unknown as ArrayBuffer); } catch { return { rows: [], changes: [], format: null, errors: ["Dosya okunamadı (geçerli bir .xlsx değil)"] }; }
  const fmt = wb.getWorksheet("_bicim")?.getRow(1).getCell(2).value ?? null;
  if (!FORMATS.has(String(fmt))) errors.push(`Biçim tanınmadı (${String(fmt)})`);
  const ws = SHEETS_READ.map((n) => wb.getWorksheet(n)).find(Boolean);
  if (!ws) return { rows: [], changes: [], format: fmt ? String(fmt) : null, errors: [...errors, `"${SHEET}" sayfası yok`] };
  const head = (ws.getRow(1).values as ExcelJS.CellValue[]).slice(1).map(cellText);
  const idx = new Map(head.map((h, i) => [h, i + 1]));
  const missing = HEADERS.filter((h) => !idx.has(h) && !OPTIONAL_HEADERS.has(h));
  if (missing.length) return { rows: [], changes: [], format: String(fmt), errors: [...errors, `Eksik başlık: ${missing.join(", ")}`] };
  const rows: Row[] = [];
  ws.eachRow((row, i) => {
    if (i === 1) return;
    const r: Record<string, unknown> = {};
    for (const [k, h] of COLUMNS) {
      const raw = idx.has(h) && !DERIVED.has(k) ? cellText(row.getCell(idx.get(h)!).value) : "";
      if (NUM.has(k)) { const n = raw === "" ? null : Number(raw.replace(",", ".")); r[k] = n != null && Number.isFinite(n) ? n : raw === "" ? null : NaN; }
      else r[k] = raw;
    }
    if (!r.slug) return;
    rows.push(r as unknown as Row);
  });
  const changes: Change[] = [];
  wb.getWorksheet("Değişimler")?.eachRow((row, i) => {
    if (i === 1) return;
    const v = (row.values as ExcelJS.CellValue[]).slice(1).map(cellText);
    const num = (s: string) => (s === "" ? null : Number(s));
    if (v[1]) changes.push({ at: v[0], slug: v[1], name: v[2], from: num(v[3]), to: Number(v[4]), fromN: num(v[5]), toN: num(v[6]) });
  });
  return { rows, changes, format: String(fmt), errors };
}
