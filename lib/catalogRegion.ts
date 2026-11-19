/** Same regional identifiers as YorumS lib/bolge.ts; no importer or legal/currency assumptions. */
export interface MekanBolgesi {
  alan: "kibris";
  bolge: string;
  /** Always explicit here, including divided Lefkoşa. Never inferred from a name or phone. */
  kesim: "kuzey" | "guney";
  adresTuru?: "sokak" | "yer-tarifi" | "yok";
}
const REGIONS: Readonly<Record<string, { tr: string; kesim: "kuzey" | "guney" | "bolunmus" }>> = {
  lefkosa: { tr: "Lefkoşa", kesim: "bolunmus" }, girne: { tr: "Girne", kesim: "kuzey" },
  gazimagusa: { tr: "Gazimağusa", kesim: "kuzey" }, guzelyurt: { tr: "Güzelyurt", kesim: "kuzey" },
  iskele: { tr: "İskele", kesim: "kuzey" }, lefke: { tr: "Lefke", kesim: "kuzey" },
  limasol: { tr: "Limasol", kesim: "guney" }, larnaka: { tr: "Larnaka", kesim: "guney" },
  baf: { tr: "Baf", kesim: "guney" }, "aya-napa": { tr: "Aya Napa", kesim: "guney" },
};
export function validCatalogRegion(value: unknown): value is MekanBolgesi {
  if (!value || typeof value !== "object") return false;
  const b = value as Partial<MekanBolgesi>;
  if (Object.keys(b).some((key) => !["alan", "bolge", "kesim", "adresTuru"].includes(key))) return false;
  const known = b.bolge && Object.hasOwn(REGIONS, b.bolge) ? REGIONS[b.bolge] : null;
  return b.alan === "kibris" && !!known && (b.kesim === "kuzey" || b.kesim === "guney")
    && (known.kesim === "bolunmus" || known.kesim === b.kesim)
    && (b.adresTuru === undefined || ["sokak", "yer-tarifi", "yok"].includes(b.adresTuru));
}
export const regionCity = (b: MekanBolgesi) => REGIONS[b.bolge].tr;
export const regionLabel = (b: MekanBolgesi) => `${regionCity(b)} (${b.kesim === "guney" ? "güney" : "kuzey"}) · Kıbrıs`;
type Scoped = { bolge?: unknown };
/** Local QA only. A Next production build (including Preview) cannot enable this pilot. */
export function catalogPilotEnabled(): boolean {
  return (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")
    && process.env.VERCEL_ENV !== "production" && process.env.NEXT_PUBLIC_KIBRIS_PILOT === "true";
}
/** Invalid regional metadata never falls back to Istanbul. */
export const catalogVisible = (r: Scoped) => r.bolge === undefined
  || (validCatalogRegion(r.bolge) && catalogPilotEnabled());
/** Current Google/Excel and Sor contracts are Istanbul-only, even during local pilot QA. */
export const istanbulCatalogScope = (r: Scoped) => r.bolge === undefined;
