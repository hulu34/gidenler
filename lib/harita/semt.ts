/* SEMT HARİTASI — saf mantık (React'siz; testte doğrudan çalışır).
   · Sınırlar OpenStreetMap idari sınırlarından (ODbL), scripts/harita-sinirlar.mjs ile önceden sadeleştirilir.
   · Mekânın ilçesi katalogdaki `district` alanıdır; mahallesi koordinat varsa mahalle poligonundan, yoksa katalogdaki
     `neighborhood` adından bulunur. İkisi de yoksa mekân yalnız ilçe listesinde görünür (uydurma konum yok).
   · Bölge rengi bölgede en çok bulunan tür grubudur; genel "Restoran" kaydı baskın tür sayılmaz. */

export type Ring = number[]; // düz [x0, y0, x1, y1, …], tamsayı düzlem
export interface Shape { outer: Ring[]; inner: Ring[]; lbl?: [number, number] }
export interface Mahalle extends Shape { ad: string; osm: string }
export interface Ilce extends Shape { ad: string; slug: string; yaka: Yaka; osm: string }
export type Yaka = "avrupa" | "anadolu";
export interface Proj { lng0: number; lat0: number; k: number; cos: number }

export const YAKA_AD: Record<Yaka, string> = { avrupa: "Avrupa Yakası", anadolu: "Anadolu Yakası" };

export const project = (p: Proj, lat: number, lng: number): [number, number] =>
  [(lng - p.lng0) * p.cos * p.k, (p.lat0 - lat) * p.k];

const TR: Record<string, string> = { ç: "c", ğ: "g", ı: "i", i̇: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
/** "Kâğıthane" → "kagithane"; "Caddebostan Mahallesi" → "caddebostan" (mahalle eki atılır). */
export const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+(mahallesi|mah\.?)$/u, "")
  .replace(/[çğıöşüâîû]|i̇/gu, (c) => TR[c] ?? c).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------- tür grupları ---------- */
export interface TurGrubu { key: string; ad: string; kisa: string; kinds: string[] }
/** Sıra hem çip sırası (eşitlikte) hem baskın tür eşitlik çözümüdür. "diger" baskın sayılmaz. */
export const TUR_GRUPLARI: TurGrubu[] = [
  { key: "kebap", ad: "Kebap ve pide", kisa: "Kebap", kinds: ["Kebapçı / Ocakbaşı", "Dönerci", "Izgara", "Pideci"] },
  { key: "ev", ad: "Türk mutfağı", kisa: "Türk mutfağı", kinds: ["Türk mutfağı", "Lokanta", "Geleneksel mutfak", "Mantıcı", "Hatay mutfağı", "Antep mutfağı", "Karadeniz mutfağı"] },
  { key: "deniz", ad: "Deniz ürünleri", kisa: "Deniz ürünleri", kinds: ["Deniz ürünleri", "Balık restoranı"] },
  { key: "kahvalti", ad: "Kahvaltı", kisa: "Kahvaltı", kinds: ["Kahvaltı", "Kahvaltıcı"] },
  { key: "kahve", ad: "Kahve ve tatlı", kisa: "Kahve", kinds: ["Kahveci", "Kafe", "Fırın", "Tatlıcı", "Pastane"] },
  { key: "burger", ad: "Burger", kisa: "Burger", kinds: ["Burger"] },
  { key: "pizza", ad: "Pizza ve İtalyan", kisa: "Pizza", kinds: ["Pizza", "İtalyan"] },
  { key: "dunya", ad: "Dünya mutfağı", kisa: "Dünya mutfağı", kinds: ["Dünya mutfağı", "Sushi / Japon", "Asya mutfağı", "Asya etkili mutfak", "Uluslararası mutfak", "Rus mutfağı", "Akdeniz mutfağı", "Fransız / Akdeniz", "Avrupa bölge mutfağı", "Füzyon"] },
  { key: "modern", ad: "Modern mutfak", kisa: "Modern", kinds: ["Modern mutfak", "Çağdaş mutfak", "Şef restoranı", "Mevsimsel mutfak", "Yaratıcı mutfak", "Vegan"] },
  { key: "meyhane", ad: "Meyhane ve bar", kisa: "Meyhane", kinds: ["Meyhane", "Bar", "Pub"] },
  { key: "steak", ad: "Steakhouse", kisa: "Steakhouse", kinds: ["Steakhouse"] },
  { key: "sokak", ad: "Sokak lezzeti", kisa: "Sokak lezzeti", kinds: ["Sokak lezzeti", "Tavuk"] },
  { key: "diger", ad: "Diğer restoranlar", kisa: "Restoran", kinds: [] },
];
const KIND_TO_GROUP = new Map(TUR_GRUPLARI.flatMap((g) => g.kinds.map((k) => [k, g.key] as const)));
export const GRUP = new Map(TUR_GRUPLARI.map((g) => [g.key, g]));
export const grupOf = (kind: string | undefined) => (kind && KIND_TO_GROUP.get(kind)) || "diger";
const ORDER = new Map(TUR_GRUPLARI.map((g, i) => [g.key, i]));

/** Grup sayımları, büyükten küçüğe (eşitlikte grup sırası). */
export function grupSay(kinds: (string | undefined)[]): { key: string; n: number }[] {
  const c = new Map<string, number>();
  for (const k of kinds) { const g = grupOf(k); c.set(g, (c.get(g) ?? 0) + 1); }
  return [...c].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n || ORDER.get(a.key)! - ORDER.get(b.key)!);
}
/** Bölgenin baskın türü: "diger" dışındaki en kalabalık grup. Hiç yoksa ve bölgede kayıt varsa "diger", boşsa null. */
export function baskin(kinds: (string | undefined)[]): string | null {
  if (!kinds.length) return null;
  return grupSay(kinds).find((g) => g.key !== "diger")?.key ?? "diger";
}

/* ---------- geometri ---------- */
function inRing(x: number, y: number, r: Ring) {
  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export const inShape = (x: number, y: number, s: Shape) => s.outer.some((r) => inRing(x, y, r)) && !s.inner.some((r) => inRing(x, y, r));

export interface Box { x: number; y: number; w: number; h: number }
export function bbox(shapes: Shape[]): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of shapes) for (const r of s.outer) for (let i = 0; i < r.length; i += 2) {
    if (r[i] < x0) x0 = r[i]; if (r[i] > x1) x1 = r[i]; if (r[i + 1] < y0) y0 = r[i + 1]; if (r[i + 1] > y1) y1 = r[i + 1];
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
/** Kutuyu en-boy oranına (w/h) genişletip kenar payı ekler. */
export function fit(b: Box, aspect: number, pad = 0.06): Box {
  let { x, y, w, h } = b; const px = w * pad, py = h * pad; x -= px; y -= py; w += 2 * px; h += 2 * py;
  if (w / h < aspect) { const nw = h * aspect; x -= (nw - w) / 2; w = nw; } else { const nh = w / aspect; y -= (nh - h) / 2; h = nh; }
  return { x, y, w, h };
}
const ringD = (r: Ring) => { let d = `M${r[0]} ${r[1]}`; for (let i = 2; i < r.length; i += 2) d += `L${r[i]} ${r[i + 1]}`; return d + "Z"; };
export const pathD = (s: Shape) => s.outer.map(ringD).join("") + s.inner.map(ringD).join("");
/** Etiket noktası (üretimde hesaplanır; yoksa en büyük halkanın kutu merkezi). */
export function labelAt(s: Shape): [number, number] {
  if (s.lbl) return s.lbl;
  const b = bbox([{ outer: [s.outer.reduce((a, r) => (r.length > a.length ? r : a), s.outer[0])], inner: [] }]);
  return [b.x + b.w / 2, b.y + b.h / 2];
}

/* ---------- mekân → mahalle ---------- */
export interface Yer { slug: string; district?: string; neighborhood?: string; address?: string; lat?: number; lng?: number }
export type MahalleKaynak = "konum" | "adres" | "yakin";
/** Kıyıda (sadeleştirilmiş sınırın hemen dışında) kalan nokta için en yakın mahalleye izin verilen en büyük uzaklık (~400 m). */
export const YAKIN_ESIK = 15;
function ringDist(x: number, y: number, r: Ring) {
  let d = Infinity;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const ax = r[j], ay = r[j + 1], dx = r[i] - ax, dy = r[i + 1] - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return d;
}
/** Adres metninde virgülle ayrılmış bir parça tam olarak mahalle adıysa onu döndürür (parantez içi atılır;
    sağdan sola, son parça ilçe olduğu için atlanır). "Dilhayat Sokak No:28, Etiler, Beşiktaş" → "Etiler". */
export function adresMahalle(address: string | undefined, byName: Map<string, string>): string | undefined {
  if (!address) return undefined;
  const parts = address.split(",").map((p) => p.replace(/\(.*?\)/g, "").trim()).filter(Boolean);
  for (let i = parts.length - 2; i >= 0; i--) { const hit = byName.get(norm(parts[i])); if (hit) return hit; }
  return undefined;
}
/** İlçe mahallelerine atama: önce koordinat (poligon), sonra katalogdaki mahalle adı ya da adres metni, son olarak kıyı payı
    (en yakın mahalle YAKIN_ESIK içinde). Bulunamayan atanmaz. */
export function mahalleAta(proj: Proj, yerler: Yer[], mahalleler: Mahalle[]): Map<string, { ad: string; kaynak: MahalleKaynak }> {
  const out = new Map<string, { ad: string; kaynak: MahalleKaynak }>();
  const byName = new Map(mahalleler.map((m) => [norm(m.ad), m.ad]));
  const boxes = mahalleler.map((m) => bbox([m]));
  for (const v of yerler) {
    if (typeof v.lat === "number" && typeof v.lng === "number") {
      const [x, y] = project(proj, v.lat, v.lng);
      const i = mahalleler.findIndex((m, j) => { const b = boxes[j]; return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h && inShape(x, y, m); });
      if (i >= 0) { out.set(v.slug, { ad: mahalleler[i].ad, kaynak: "konum" }); continue; }
    }
    const n = (v.neighborhood ? byName.get(norm(v.neighborhood)) : undefined) ?? adresMahalle(v.address, byName);
    if (n) { out.set(v.slug, { ad: n, kaynak: "adres" }); continue; }
    if (typeof v.lat === "number" && typeof v.lng === "number") {
      const [x, y] = project(proj, v.lat, v.lng);
      let best = -1, bd = YAKIN_ESIK;
      mahalleler.forEach((m, j) => { const b = boxes[j]; if (x < b.x - bd || x > b.x + b.w + bd || y < b.y - bd || y > b.y + b.h + bd) return; for (const r of m.outer) { const d = ringDist(x, y, r); if (d <= bd) { bd = d; best = j; } } });
      if (best >= 0) out.set(v.slug, { ad: mahalleler[best].ad, kaynak: "yakin" });
    }
  }
  return out;
}

/* ---------- sıralama ---------- */
export interface Puanli { name: string; g?: { rating: number; count: number | null } | null }
/** Google puanı olanlar önce (puan, sonra değerlendirme sayısı); 30'dan az değerlendirmeli puan sona yakın; sonra ad. */
export function sirala<T extends Puanli>(xs: T[]): T[] {
  const w = (x: T) => (x.g ? ((x.g.count ?? 0) >= 30 ? 2 : 1) : 0);
  return [...xs].sort((a, b) => w(b) - w(a) || (b.g?.rating ?? 0) - (a.g?.rating ?? 0) || (b.g?.count ?? 0) - (a.g?.count ?? 0) || a.name.localeCompare(b.name, "tr"));
}
