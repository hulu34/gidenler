import ExcelJS from "exceljs";
import { COLUMNS, HEADERS, OK_STATUS, STATUS, summarize, type ColKey, type Row } from "./core";

/* Excel okuma/yazma. Dosya biçimi: "Mekânlar" (veri), "Özet", "Hatalar", "Değişimler", "Açıklama", gizli "_bicim".
   Okuyucu başlıkları ADLA eşler ve biçim sürümünü kontrol eder; başlığı bozulmuş dosya reddedilir. */
export const FORMAT = "gidenler-google-puan/1";
const SHEET = "Mekânlar";
const NUM: ReadonlySet<ColKey> = new Set(["rating", "reviews", "prevRating", "prevReviews"]);

const FILL: Record<string, string> = {
  [STATUS.fresh]: "FFD9F2D9", [STATUS.same]: "FFEAF6EA", [STATUS.waiting]: "FFF2F2F2", [STATUS.isNew]: "FFDDEBFF",
  [STATUS.error]: "FFFDE2C8", [STATUS.blocked]: "FFF8CBCB", [STATUS.branch]: "FFFBD3E9", [STATUS.noMatch]: "FFEDEDED",
  [STATUS.deferred]: "FFFFF2B3", [STATUS.removed]: "FFD0D0D0",
};

export interface Change { at: string; slug: string; name: string; from: number | null; to: number; fromN: number | null; toN: number }
export interface Meta { generatedAt: string; run?: string; note?: string }

export async function writeWorkbook(rows: Row[], meta: Meta, changes: Change[] = []): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gidenler"; wb.created = new Date(meta.generatedAt);
  const ws = wb.addWorksheet(SHEET, { views: [{ state: "frozen", xSplit: 2, ySplit: 1 }] });
  ws.columns = COLUMNS.map(([key, header, width]) => ({ key, header, width }));
  for (const r of rows) ws.addRow(Object.fromEntries(COLUMNS.map(([k]) => [k, r[k] ?? null])));
  const head = ws.getRow(1); head.font = { bold: true, color: { argb: "FFFFFFFF" } }; head.height = 30;
  head.alignment = { vertical: "middle", wrapText: true };
  head.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } }; });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: COLUMNS.length } };
  const statusCol = COLUMNS.findIndex((c) => c[0] === "status") + 1;
  const ratingCol = COLUMNS.findIndex((c) => c[0] === "rating") + 1;
  ws.eachRow((row, i) => {
    if (i === 1) return;
    const st = String(row.getCell(statusCol).value ?? "");
    if (FILL[st]) row.getCell(statusCol).fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL[st] } };
    row.getCell(ratingCol).numFmt = "0.0";
    for (const k of ["mapsUrl", "profileUrl"] as const) {
      const c = row.getCell(COLUMNS.findIndex((x) => x[0] === k) + 1); const v = String(c.value ?? "");
      if (v.startsWith("https://")) c.value = { text: v, hyperlink: v };
    }
  });

  const s = summarize(rows);
  const sum = wb.addWorksheet("Özet");
  sum.columns = [{ header: "Gösterge", key: "k", width: 44 }, { header: "Değer", key: "v", width: 18 }];
  const line = (k: string, v: string | number) => sum.addRow({ k, v });
  line("Oluşturma (UTC)", meta.generatedAt); if (meta.run) line("Çalışma", meta.run);
  line("Toplam satır", s.total); line("Aktif mekân", s.active); line("Kaldırılmış (işaretli)", s.removed);
  for (const [k, v] of Object.entries(s.byCategory)) line(`Kategori: ${k}`, v);
  line("Google Place ID'si olan", s.withPlaceId);
  for (const [k, v] of Object.entries(s.byConfidence)) line(`Eşleşme güveni: ${k}`, v);
  for (const [k, v] of Object.entries(s.byStatus)) line(`Durum: ${k}`, v);
  line("Google puanı olan", s.withRating); line("Siteye aktarılabilir", s.importable);
  if (meta.note) line("Not", meta.note);
  sum.getRow(1).font = { bold: true };

  const err = wb.addWorksheet("Hatalar", { views: [{ state: "frozen", ySplit: 1 }] });
  err.columns = [{ header: "Gidenler ID", key: "slug", width: 34 }, { header: "Mekân adı", key: "name", width: 30 }, { header: "Durum", key: "status", width: 18 }, { header: "Hata açıklaması", key: "error", width: 60 }, { header: "Son deneme", key: "attemptAt", width: 20 }];
  for (const r of rows) if (r.record === "Aktif" && !OK_STATUS.has(r.status) && r.status !== STATUS.waiting && r.status !== STATUS.isNew) err.addRow(r);
  err.getRow(1).font = { bold: true }; err.autoFilter = { from: "A1", to: "E1" };

  const ch = wb.addWorksheet("Değişimler", { views: [{ state: "frozen", ySplit: 1 }] });
  ch.columns = [{ header: "Tarih", key: "at", width: 20 }, { header: "Gidenler ID", key: "slug", width: 34 }, { header: "Mekân adı", key: "name", width: 30 }, { header: "Önceki puan", key: "from", width: 12 }, { header: "Yeni puan", key: "to", width: 12 }, { header: "Önceki sayı", key: "fromN", width: 12 }, { header: "Yeni sayı", key: "toN", width: 12 }];
  for (const c of changes) ch.addRow(c);
  ch.getRow(1).font = { bold: true };

  const info = wb.addWorksheet("Açıklama");
  info.columns = [{ header: "Başlık", key: "k", width: 30 }, { header: "Açıklama", key: "v", width: 110 }];
  for (const [k, v] of [
    ["Puan", "Google puanı 5 üzerindendir ve Gidenler puanı (10 üzerinden) değildir. İki puan hiçbir hesapta karışmaz."],
    ["Place ID", "Yalnız Gidenler'in mevcut doğrulama kayıtlarından alınır (onaylı > otomatik > onay bekliyor). Eşleşme yoksa boştur."],
    ["Siteye aktarım", "Yalnız 'Onaylı' veya 'Otomatik' eşleşmeli, durumu 'Güncel/Değişmedi' olan ve şube kontrolünü geçen satırlar siteye aktarılır."],
    ["Başarısız deneme", "Puan silinmez veya sıfırlanmaz; önceki doğrulanmış değer ve son kontrol tarihi korunur, satır hata olarak işaretlenir."],
    ["Kaynak", "Geçici kaynak: Google Maps'in herkese açık sayfası. Google'ın hizmet şartları otomatik okumayı ve verinin saklanmasını kısıtlar; bu kaynak yatırım sonrasında değiştirilecek."],
    ["Elle düzenleme", "Dosya elle düzenlenebilir; aktarımda başlıklar, Gidenler ID'leri ve değer aralıkları yeniden doğrulanır. Bozuk dosya çalışan site verisini değiştirmez."],
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
  if (fmt !== FORMAT) errors.push(`Biçim tanınmadı (${String(fmt)})`);
  const ws = wb.getWorksheet(SHEET);
  if (!ws) return { rows: [], changes: [], format: fmt ? String(fmt) : null, errors: [...errors, `"${SHEET}" sayfası yok`] };
  const head = (ws.getRow(1).values as ExcelJS.CellValue[]).slice(1).map(cellText);
  const idx = new Map(head.map((h, i) => [h, i + 1]));
  const missing = HEADERS.filter((h) => !idx.has(h));
  if (missing.length) return { rows: [], changes: [], format: String(fmt), errors: [...errors, `Eksik başlık: ${missing.join(", ")}`] };
  const rows: Row[] = [];
  ws.eachRow((row, i) => {
    if (i === 1) return;
    const r: Record<string, unknown> = {};
    for (const [k, h] of COLUMNS) {
      const raw = cellText(row.getCell(idx.get(h)!).value);
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
    if (v[1]) changes.push({ at: v[0], slug: v[1], name: v[2], from: num(v[3]), to: Number(v[4]), fromN: num(v[5]), toN: Number(v[6]) });
  });
  return { rows, changes, format: String(fmt), errors };
}
