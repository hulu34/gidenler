/** Dar acil engel: işletmeyle ilgisiz/kumar içeriğine yönlenen eski alan adı.
 * Kayıt kapatılmaz; ham kaynak/DB değiştirilmez. Alt alanlar ve sondaki DNS noktası dahildir.
 */
export function blockedVenueHost(value?: string | null): boolean {
  if (!value) return false;
  try {
    const u = new URL(value.trim().startsWith('//') ? `https:${value.trim()}` : /^https?:/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    const host = u.hostname.toLowerCase().replace(/\.$/, '');
    return ['nezihkebap.com', 'takanik.com.tr', 'gelik.com.tr', 'kucukev.com'].some(blocked => host === blocked || host.endsWith(`.${blocked}`));
  } catch { return false; }
}
export const safeVenueWebsite = (value?: string | null): string | undefined => value && !blockedVenueHost(value) ? value : undefined;
/** Rezervasyon açıklaması URL yerine serbest metin de olabilir. */
export function mentionsBlockedVenueHost(value: string): boolean {
  return /(?:^|[^a-z\d.-])(?:[a-z\d-]+\.)*(?:nezihkebap\.com|takanik\.com\.tr|gelik\.com\.tr|kucukev\.com)(?=$|[^a-z\d.-]|\.(?=$|[\s/:?#]))/i.test(value);
}
