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
export const KIBRIS_PREVIEW_BRANCH = "inceleme/masamoro-preview-kabul-v1";
export const KIBRIS_PREVIEW_CONTRACT = "masamoro-v1";
/** Public build marker alone grants nothing: actual server Preview context is required. */
export function catalogPreviewEnabled(): boolean {
  return typeof window === "undefined" && process.env.VERCEL_ENV === "preview"
    && process.env.VERCEL_GIT_COMMIT_REF === KIBRIS_PREVIEW_BRANCH
    && process.env.NEXT_PUBLIC_KIBRIS_PILOT === "true"
    && process.env.NEXT_PUBLIC_KIBRIS_PREVIEW_CONTRACT === KIBRIS_PREVIEW_CONTRACT
    && /^[a-z0-9-]+\.vercel\.app$/.test(process.env.VERCEL_URL ?? "");
}
/** Only the immutable deployment host; branch aliases/custom domains are not pilot entry points. */
export function catalogPreviewRequestAllowed(host: string | null): boolean {
  return catalogPreviewEnabled() && host === process.env.VERCEL_URL;
}
declare global { interface Window { __GIDENLER_KIBRIS_PREVIEW__?: { enabled: boolean; host: string } } }
/** Local QA or explicit bounded Preview. Production cannot enable the server source. */
export function catalogPilotEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_KIBRIS_PILOT !== "true") return false;
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") return process.env.VERCEL_ENV !== "production";
  if (typeof window !== "undefined") return process.env.NEXT_PUBLIC_KIBRIS_PREVIEW_CONTRACT === KIBRIS_PREVIEW_CONTRACT
    && window.__GIDENLER_KIBRIS_PREVIEW__?.enabled === true
    && window.__GIDENLER_KIBRIS_PREVIEW__.host === window.location.hostname;
  return catalogPreviewEnabled();
}
/** Invalid regional metadata never falls back to Istanbul. */
export const catalogVisible = (r: Scoped) => r.bolge === undefined
  || (validCatalogRegion(r.bolge) && catalogPilotEnabled());
/** Current Google/Excel and Sor contracts are Istanbul-only, even during local pilot QA. */
export const istanbulCatalogScope = (r: Scoped) => r.bolge === undefined;
