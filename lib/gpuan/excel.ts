import ExcelJS from "exceljs";
import { COLUMNS, DERIVED, FINAL, HEADERS, MAIN, OPTIONAL_HEADERS, STATUS, summarize, withDerived, type ColKey, type Decision, type Evidence, type Row } from "./core";

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
  /** isteğe bağlı: kanıt seviyesi ve kanıt metni (bekleyen eşleşme ölçümü, eşleşmesiz mekân araması) — karar değildir */
  evidence?: Record<string, Evidence>;
  /** isteğe bağlı: eşleşmesi olmayan mekân için bulunan Google adayı */
  candidates?: Record<string, { level: string; placeId: string; name: string; address: string; why: string }> }

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
  const rows = withDerived(rowsIn, decisions, closures, meta.evidence ?? {});
  const act = rows.filter((r) => r.record === "Aktif");
  const cands = meta.candidates ?? {};
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gidenler"; wb.created = new Date(meta.generatedAt);

  /* 1 · Tüm Mekânlar — her satırda kaynak, kanıt, güven, son kontrol, sonraki işlem */
  const ws = sheet(wb, SHEET, COLUMNS.map(([key, header, width]) => ({ key, header, width })), rows.map((r) => Object.fromEntries(COLUMNS.map(([k]) => [k, r[k] ?? null]))), 2);
  ws.getColumn("rating").numFmt = "0.0"; tint(ws, "status", FILL); tint(ws, "finalState", FINAL_FILL); link(ws, "mapsUrl"); link(ws, "profileUrl");

  const base: Col[] = [{ header: "Gidenler ID", key: "slug", width: 34 }, { header: "Mekân adı", key: "name", width: 30 }, { header: "İlçe", key: "district", width: 13 }];
  const tail: Col[] = [{ header: "Kaynak", key: "source", width: 24 }, { header: "Kanıt", key: "evidence", width: 60 }, { header: "Güven seviyesi", key: "level", width: 22 }, { header: "Son kontrol", key: "checkedAt", width: 20 }, { header: "Sonraki işlem", key: "nextAction", width: 50 }];
  const main = (...m: string[]) => act.filter((r) => m.includes(r.mainState));
  /* 2 · Google Puanı Aktif */
  const ok = sheet(wb, "Google Puanı Aktif", [...base, { header: "Google puanı (5 üzerinden)", key: "rating", width: 12 }, { header: "Değerlendirme sayısı", key: "reviews", width: 12 }, { header: "Eşleşme güveni", key: "confidence", width: 14 }, { header: "Google'daki tür", key: "seenCategory", width: 22 }, { header: "Alt nedenler", key: "subReasons", width: 40 }, ...tail, { header: "Google Maps", key: "mapsUrl", width: 30 }, { header: "Gidenler profili", key: "profileUrl", width: 30 }], main(MAIN.shown));
  ok.getColumn("rating").numFmt = "0.0"; link(ok, "mapsUrl"); link(ok, "profileUrl");
  /* 3 · Onay Bekleyenler */
  const wait = sheet(wb, "Onay Bekleyenler", [...base, { header: "Okunan puan", key: "rating", width: 10 }, { header: "Google'da görünen ad", key: "seenName", width: 30 }, { header: "Google'da görünen adres", key: "seenAddress", width: 40 }, { header: "Gidenler'deki adres", key: "address", width: 36 }, { header: "Google'daki tür", key: "seenCategory", width: 20 }, { header: "Konum farkı (m)", key: "distance", width: 10 }, { header: "Ad benzerliği", key: "nameSim", width: 10 }, { header: "Google Place ID", key: "placeId", width: 30 }, { header: "Alt nedenler", key: "subReasons", width: 40 }, ...tail, { header: "Google Maps", key: "mapsUrl", width: 30 }], main(MAIN.pending));
  link(wait, "mapsUrl");
  /* 4 · Eşleşmesi Olmayanlar (arama adayıyla) */
  sheet(wb, "Eşleşmesi Olmayanlar", [...base, { header: "Adres", key: "address", width: 40 }, { header: "Arama sonucu", key: "cLevel", width: 16 }, { header: "Bulunan Google adı", key: "cName", width: 30 }, { header: "Bulunan Google adresi", key: "cAddress", width: 40 }, { header: "Aday Place ID", key: "cPid", width: 30 }, { header: "Aday kanıtı / ret nedeni", key: "cWhy", width: 60 }, { header: "Sonraki işlem", key: "nextAction", width: 50 }, { header: "Gidenler profili", key: "profileUrl", width: 30 }],
    main(MAIN.notFound).map((r) => { const c = cands[r.slug]; return { ...r, cLevel: c?.level ?? "aranmadı", cName: c?.name ?? "", cAddress: c?.address ?? "", cPid: c?.placeId ?? "", cWhy: c?.why ?? "",
      nextAction: c?.level === "güçlü" ? "Güçlü aday: onay paketinde" : c?.level === "orta" ? "Orta aday: elle doğrulanmalı" : c ? "Doğru kayıt bulunamadı; elle aranmalı ya da kapanmış olabilir" : r.nextAction }; }));
  /* 5 · Yanlış Şube ve Tür Eşleşmeleri */
  const bad = sheet(wb, "Yanlış Şube ve Tür", [...base, { header: "Ana durum", key: "mainState", width: 26 }, { header: "Açıklama", key: "finalReason", width: 60 }, { header: "Gidenler'deki adres", key: "address", width: 36 }, { header: "Google'da görünen ad", key: "seenName", width: 30 }, { header: "Google'da görünen adres", key: "seenAddress", width: 40 }, { header: "Google'daki tür", key: "seenCategory", width: 22 }, { header: "Konum farkı (m)", key: "distance", width: 10 }, { header: "Ad benzerliği", key: "nameSim", width: 10 }, ...tail, { header: "Google Maps", key: "mapsUrl", width: 30 }], main(MAIN.branch, MAIN.type));
  link(bad, "mapsUrl");
  /* 6 · Kapanma İncelemesi */
  const closedRows = main(MAIN.closed).map((r) => {
    const c = closures[r.slug];
    return { ...r, cState: c ? (c.state === "closed_confirmed" ? "Kesin kapalı (closed_confirmed)" : c.state === "reopened" ? "Yeniden açıldı" : "Şüpheli (elle inceleme)") : "Denetlenmedi (yalnız otomatik okuma)",
      cGoogle: c?.google ?? "Kalıcı kapalı (otomatik okuma)", cMatch: c?.match ?? r.confidence, cOfficial: c?.official ?? "", cConf: c?.confidence ?? "", cAt: c?.checkedAt ?? r.attemptAt.slice(0, 10), cNote: c?.note ?? "" };
  });
  sheet(wb, "Kapanma İncelemesi", [...base, { header: "Kapanma durumu", key: "cState", width: 30 }, { header: "Google'ın gösterdiği durum", key: "cGoogle", width: 36 }, { header: "Eşleşme", key: "cMatch", width: 14 }, { header: "Gidenler'deki adres", key: "address", width: 36 }, { header: "İkinci kaynak (resmî site)", key: "cOfficial", width: 50 }, { header: "Güven", key: "cConf", width: 10 }, { header: "Kontrol tarihi", key: "cAt", width: 14 }, { header: "Not", key: "cNote", width: 50 }, { header: "Sonraki işlem", key: "nextAction", width: 50 }, { header: "Google Maps", key: "mapsUrl", width: 30 }], closedRows);
  /* 7 · Değerlendirme Sayısı Eksikleri */
  sheet(wb, "Değerlendirme Sayısı Eksik", [...base, { header: "Google puanı", key: "rating", width: 10 }, { header: "Google görünümü", key: "view", width: 12 }, { header: "Neden", key: "why", width: 60 }, { header: "Son kontrol", key: "checkedAt", width: 20 }],
    act.filter((r) => r.mainState === MAIN.shown && r.reviews == null).map((r) => ({ ...r, why: r.view === "Tam" ? "Tam görünümde sayı okunamadı" : "Google sınırlı görünüm verdi: sayı gösterilmiyor (uydurulmaz); mekân Google sıralamasına girmez" })));
  /* 8 · Güncelleme Geçmişi */
  const hist = sheet(wb, "Güncelleme Geçmişi", [...base, { header: "Son deneme", key: "attemptAt", width: 20 }, { header: "Son başarılı kontrol", key: "checkedAt", width: 20 }, { header: "Güncelleme durumu", key: "status", width: 18 }, { header: "Google görünümü", key: "view", width: 10 }, { header: "Hata / not", key: "error", width: 60 }, { header: "Önceki puan", key: "prevRating", width: 10 }, { header: "Puan", key: "rating", width: 10 }], act.filter((r) => r.placeId).sort((a, b) => (b.attemptAt || "").localeCompare(a.attemptAt || "")));
  tint(hist, "status", FILL);

  /* 9 · Yönetici Özeti — 456 mekânın tamamı ana duruma göre (toplam = aktif mekân) */
  const s = summarize(rowsIn);
  const cnt = (m: string) => act.filter((r) => r.mainState === m).length;
  const shown = cnt(MAIN.shown);
  const subCount = (needle: RegExp) => act.filter((r) => needle.test(r.subReasons)).length;
  const lines: Array<[string, string | number]> = [
    ["Oluşturma (UTC)", meta.generatedAt], ...(meta.run ? [["Çalışma", meta.run] as [string, string]] : []),
    ["— 456 mekân mutabakatı (her mekân tek ana durumda) —", ""],
    ...Object.values(MAIN).map((m) => [m, cnt(m)] as [string, number]),
    ["TOPLAM (ana durumlar)", Object.values(MAIN).reduce((a, m) => a + cnt(m), 0)],
    ["Aktif mekân (kontrol)", s.active],
    ["— Alt nedenler (bir mekânda birden çok olabilir) —", ""],
    ["Eşleşme onay bekliyor (alt neden)", subCount(/eşleşme onay bekliyor/)],
    ["Değerlendirme sayısı yok", subCount(/değerlendirme sayısı yok/)],
    ["Google sınırlı görünüm", subCount(/sınırlı görünüm/)],
    ["Kesin kapalı", subCount(/kesin kapalı/)],
    ["Kapanma şüphesi", subCount(/kapanma şüphesi/)],
    ["Aynı Place ID birden çok mekânda", subCount(/aynı Place ID/)],
    ["— Tamamlanma —", ""],
    ["Google puanı gösterilen", `${shown} / ${s.active} (${pct(shown, s.active)})`],
    ["Eşleşmesiz mekânda arama adayı: güçlü / orta / yok", `${Object.values(cands).filter((c) => c.level === "güçlü").length} / ${Object.values(cands).filter((c) => c.level === "orta").length} / ${Object.values(cands).filter((c) => !["güçlü", "orta"].includes(c.level)).length}`],
    ["Yönetici kararı olan", [...decisions.values()].length],
    ...(meta.site ? [["Sitede gösterilen (veritabanı)", meta.site.shown] as [string, number], ["Sitede gizlenen (veritabanı)", meta.site.hidden] as [string, number]] : []),
    ...(meta.note ? [["Not", meta.note] as [string, string]] : []),
  ];
  const sum = sheet(wb, "Yönetici Özeti", [{ header: "Gösterge", key: "k", width: 58 }, { header: "Değer", key: "v", width: 26 }], lines.map(([k, v]) => ({ k, v })));
  sum.eachRow((row) => { if (String(row.getCell(1).value).startsWith("—") || String(row.getCell(1).value).startsWith("TOPLAM")) row.font = { bold: true }; });

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
