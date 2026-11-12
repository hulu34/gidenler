/* ZİNCİR ŞUBE DOĞRULAMASI — çok şubeli markalar otomatik reddedilmez; resmî şube listesiyle şube bazında doğrulanır.
   · Kanıt: markanın resmî sitesindeki şube sayfasında (ya da OSM'deki şubeye özel resmî sayfada) BU şubenin sokağı ile
     ilçesi/mahallesi AYNI BÖLÜMDE (±400 karakter) geçmeli. Liste sayfasında başka şubenin satırı bu şubeye kanıt sayılmaz.
   · Her şube ayrı kimlik: slug'a mahalle (yoksa sokak) eklenir; aynı markanın şubeleri birbirine karışmaz.
   · Kapsam: restoran paketi için global fast food ve çiğ köfte büfesi zincirleri ayrı kuyruğa gider (sahip kararı). */
import { fold } from "./aday";

/** Restoran paketinin kapsamı dışında tutulan zincirler (marka adı, fold). Neden kayda yazılır; kayıtlar silinmez, kuyrukta durur. */
export const KAPSAM_DISI_ZINCIR: Record<string, string> = Object.fromEntries([
  ...["burger king", "mcdonald s", "domino s", "popeyes", "little caesars", "subway", "kfc", "arby s", "papa john s", "sbarro", "carl s jr", "shake shack", "pizza hut", "krispy kreme", "cinnabon", "waffle house", "tavuk dunyasi", "wagamama", "yo sushi", "olive garden"].map((b) => [b, "global/hızlı servis zinciri — restoran paketi kapsamı dışı (sahip kararı)"]),
  ...["komagene", "cigkoftem", "oses", "can u can"].map((b) => [b, "çiğ köfte büfesi zinciri — restoran paketi kapsamı dışı (sahip kararı)"]),
  ...["simit sarayi", "istanbul halk ekmek", "ikea", "totalenergies", "greenpeace", "karafirin"].map((b) => [b, "yeme-içme restoranı değil"]),
]);

/** Kapsam dışı zincir mi: marka etiketi, site alanı ya da adın başı listedeki markayla eşleşirse. */
export function kapsamDisiOf(name: string, brand?: string | null, site?: string | null): string | null {
  const keys = [brand ? fold(brand) : "", site ? fold(site.replace(/^www\./, "").split(".")[0]) : "", fold(name)];
  for (const [b, why] of Object.entries(KAPSAM_DISI_ZINCIR)) {
    const bc = b.replace(/\s+/g, "");
    if (keys.some((k) => k && (k === b || k.replace(/\s+/g, "") === bc || k.startsWith(b + " ") || k.replace(/\s+/g, "").startsWith(bc)))) return why;
  }
  return null;
}
const STREET_WORDS = /\b(caddesi|cadde|cad|cd|sokagi|sokak|sk|sok|bulvari|bulvar|blv|yolu|yokusu|meydani|mahallesi|mah|mh|no)\b/g;
export const streetCore = (s?: string) => (s ? fold(s).replace(STREET_WORDS, " ").replace(/\s+/g, " ").trim() : "");

export interface SubeOlcum { sokak: boolean; bolge: boolean; kapi: boolean; telefon: boolean; pencere: string | null; /** resmî listede sokağın hemen ardından yazan kapı no */ listeKapiNo?: string }
/** Metinde sokak geçişlerinin her birinin ±win karakterinde ilçe/mahalle (ve varsa kapı no) aranır; en iyi geçiş döner. */
export function matchBranch(text: string, b: { street?: string; housenumber?: string; district: string; neighbourhood?: string; phone?: string }, win = 160): SubeOlcum {
  const T = " " + fold(text) + " ";
  const st = streetCore(b.street);
  const hood = b.neighbourhood ? streetCore(b.neighbourhood) : "";
  const dist = fold(b.district);
  const no = /\d+/.exec(b.housenumber ?? "")?.[0];
  const pk = (b.phone ?? "").replace(/\D/g, "").slice(-7);
  const digits = text.replace(/\D/g, "");
  const tel = pk.length === 7 && digits.includes(pk);
  let best: SubeOlcum = { sokak: false, bolge: false, kapi: false, telefon: tel, pencere: null };
  /* telefon + bölge: şubenin telefonu listede ve aynı bölümde ilçe/mahalle geçiyorsa şube kimliği güçlüdür (sokak adı farklı yazılsa da) */
  if (tel) {
    const re = new RegExp(pk.split("").join("[\\s.\\-()]*"));
    const mt = re.exec(T);
    if (mt) { const w = T.slice(Math.max(0, mt.index - win), mt.index + win); const bolge = w.includes(" " + dist + " ") || (hood.length >= 4 && w.includes(" " + hood + " ")); if (bolge) best = { sokak: false, bolge: true, kapi: false, telefon: true, pencere: `tel@${mt.index}` }; }
  }
  /* tek kısa sözcüklü sokak adı ("paşa", "okul") çok yerde geçer: en az 5 harf ya da iki sözcük */
  if (st.length < 5 && !st.includes(" ")) return best;
  const telBolge = best.telefon && best.bolge;
  let i = T.indexOf(" " + st + " ");
  while (i >= 0) {
    const w = T.slice(Math.max(0, i - win), i + st.length + win);
    const bolge = w.includes(" " + dist + " ") || (hood.length >= 4 && w.includes(" " + hood + " "));
    const kapi = !!no && new RegExp(`\\b(no|numara)?\\s*${no}\\b`).test(w);
    const after = T.slice(i + st.length, i + st.length + 45);
    const ln = /\b(?:cad|cd|caddesi|sok|sk|sokak|sokagi|bulvari|blv|bulvar)?\s*(?:no|numara)\s*[:.]?\s*([0-9]{1,4}[a-z]?)\b/.exec(after)?.[1];
    const cand = { sokak: true, bolge, kapi, telefon: tel, pencere: `${Math.max(0, i - win)}-${i + st.length + win}`, ...(ln ? { listeKapiNo: ln.toUpperCase() } : {}) };
    const sc = (x: SubeOlcum) => (x.bolge ? 4 : 0) + (x.kapi ? 2 : 0) + (x.listeKapiNo ? 1 : 0);
    if (sc(cand) > sc(best) || (!best.sokak && !telBolge)) best = cand;
    if (best.bolge && best.kapi) break;
    i = T.indexOf(" " + st + " ", i + 1);
  }
  return best;
}
/** Şube kanıtı güçlü mü: sokak + ilçe/mahalle aynı bölümde ve (kapı no ya da telefon) ya da şubeye özel resmî sayfa. */
/** Güçlü: sokak + ilçe/mahalle aynı bölümde ve (kapı no uyuşuyor | telefon | şubeye özel sayfa | listede bu sokağın kapı numarası yazılı). */
export const branchStrong = (m: SubeOlcum, branchPage: boolean) => (m.sokak && m.bolge && (m.kapi || m.telefon || branchPage || !!m.listeKapiNo)) || (m.telefon && m.bolge);
