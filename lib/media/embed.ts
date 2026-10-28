/* ──────────────────────────────────────────────────────────────────────────
   VİDEO BAĞLANTISI → RESMÎ GÖMÜLÜ OYNATICI
   · Yalnız platformun resmî gömme adresleri; video Gidenler'de barındırılmaz, indirilmez, kopyalanmaz.
   · Saklanan: platform + kimlik (media_items.storage_class = "id_only"). Kapak görseli yalnız YouTube'da
     (i.ytimg.com, YouTube'un kendi küçük resmi); Instagram/TikTok kapakları süreli olduğu için saklanmaz.
   · Oynatıcı yalnız kullanıcı tıklayınca yüklenir (o ana kadar üçüncü taraf isteği/çerezi yok).
   ────────────────────────────────────────────────────────────────────────── */

export type VideoPlatform = "youtube" | "instagram" | "tiktok";
export interface ParsedVideo { platform: VideoPlatform; id: string; url: string; vertical: boolean }

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Kullanıcının yapıştırdığı bağlantıdan platform ve kimlik; tanınmazsa null. */
export function parseVideoUrl(raw: string): ParsedVideo | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live" ? parts[1] : u.searchParams.get("v");
    if (id && YT_ID.test(id)) return { platform: "youtube", id, url: parts[0] === "shorts" ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`, vertical: parts[0] === "shorts" };
    return null;
  }
  if (host === "youtu.be") {
    const id = parts[0];
    return id && YT_ID.test(id) ? { platform: "youtube", id, url: `https://www.youtube.com/watch?v=${id}`, vertical: false } : null;
  }
  if (host === "instagram.com") {
    /* /reel/<kod>/, /reels/<kod>/, /p/<kod>/, /<kullanıcı>/reel/<kod>/ */
    const i = parts.findIndex((p) => p === "reel" || p === "reels" || p === "p");
    const code = i >= 0 ? parts[i + 1] : undefined;
    if (code && /^[A-Za-z0-9_-]{5,40}$/.test(code)) {
      const kind = parts[i] === "p" ? "p" : "reel";
      return { platform: "instagram", id: code, url: `https://www.instagram.com/${kind}/${code}/`, vertical: kind === "reel" };
    }
    return null;
  }
  if (host === "tiktok.com") {
    /* /@kullanıcı/video/<sayı> — kısa vm.tiktok.com bağlantıları önce oEmbed ile çözülür (bkz. store) */
    const i = parts.indexOf("video");
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (id && /^\d{8,25}$/.test(id)) return { platform: "tiktok", id, url: `https://www.tiktok.com/${parts[0]?.startsWith("@") ? `${parts[0]}/` : ""}video/${id}`, vertical: true };
    return null;
  }
  return null;
}

/** Resmî gömme adresi (yalnız tıklanınca iframe'e verilir). */
export function embedUrl(platform: VideoPlatform, id: string) {
  switch (platform) {
    /* youtube-nocookie: oynatılana kadar çerez yok; playsinline: iOS'ta tam ekrana zorlamaz */
    case "youtube": return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
    /* Instagram'ın resmî gömme sayfası (betiksiz) */
    case "instagram": return `https://www.instagram.com/reel/${id}/embed/`;
    /* TikTok Embed Player v1 (resmî) */
    case "tiktok": return `https://www.tiktok.com/player/v1/${id}?autoplay=1&rel=0&description=1&music_info=1`;
  }
}

/** Kapak görseli: yalnız YouTube (kalıcı, YouTube'un kendi adresi). Diğerlerinde marka kartı çizilir. */
export function thumbUrl(platform: VideoPlatform, id: string) {
  return platform === "youtube" ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export const PLATFORM_LABEL: Record<VideoPlatform, string> = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok" };
