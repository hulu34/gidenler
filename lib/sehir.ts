/* ŞEHİR MODELİ — çok şehirli Gidenler'in tek kaynağı.
   · Kayıtta `city` yoksa İstanbul'dur: mevcut 456+ kaydın kimliği, slug'ı ve URL'si DEĞİŞMEZ.
   · İstanbul dışı yeni kayıtlarda slug'a il eklenir ("<ad>-<ilçe>-<il>"); aynı adlı iki mekân farklı ilde ayrı kimlik alır.
   · URL yapısı düz kalır (/mekan/<slug>/); şehir sayfası /sehir/<il>/. Canonical her zaman www.gidenler.com/mekan/<slug>/.
   · Pilot şehir yalnız NEXT_PUBLIC_SEHIR_PILOT=1 ile derlenen Preview'da yüklenir; Production ortamında bayrak olsa da yüklenmez. */
import S from "@/data/katalog/sehirler.json";

export type SehirDurum = "yayinda" | "pilot" | "plan";
export interface Sehir { id: string; ad: string; plaka: number; durum: SehirDurum; bbox: [number, number, number, number] }
export const SEHIRLER: readonly Sehir[] = S.sehirler as unknown as Sehir[];
export const VARSAYILAN_SEHIR = "istanbul";

export const sehirOf = (id?: string | null): Sehir | null => SEHIRLER.find((s) => s.id === (id ?? VARSAYILAN_SEHIR)) ?? null;
export const sehirAdi = (id?: string | null) => sehirOf(id)?.ad ?? "İstanbul";

/** Pilot şehirler bu derlemede açık mı? Production'da (VERCEL_ENV / NEXT_PUBLIC_VERCEL_ENV = production) her zaman kapalı. */
export function pilotAcik(env?: Record<string, string | undefined>): boolean {
  /* `process.env.NEXT_PUBLIC_SEHIR_PILOT` doğrudan yazılır: derlemede sabitlenir (next.config env), sunucu çalışma anında da
     derlemedeki değer geçerli olur — profil (derlemede üretilen) ile arama API'si (çalışma anı) aynı veriyi görür. */
  const flag = env ? env.NEXT_PUBLIC_SEHIR_PILOT : process.env.NEXT_PUBLIC_SEHIR_PILOT;
  const vEnv = env ? env.VERCEL_ENV : process.env.VERCEL_ENV;
  const pEnv = env ? env.NEXT_PUBLIC_VERCEL_ENV : process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (vEnv === "production" || pEnv === "production") return false;
  return flag === "1";
}
export const gorunur = (s: Sehir | null, env?: Record<string, string | undefined>) => !!s && (s.durum === "yayinda" || (s.durum === "pilot" && pilotAcik(env)));

/** Koordinat şehrin sınır kutusunda mı? (ilçe ataması ayrıca lib/katalog/geo.ts ile, sınır dosyasından) */
export const inCity = (lat: number | undefined, lng: number | undefined, s: Sehir | null) =>
  !!s && typeof lat === "number" && typeof lng === "number" && lat >= s.bbox[0] && lat <= s.bbox[2] && lng >= s.bbox[1] && lng <= s.bbox[3];

