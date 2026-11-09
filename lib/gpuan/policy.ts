/* ──────────────────────────────────────────────────────────────────────────
   GOOGLE PUANI POLİTİKASI (Aşama 0, 2026-11-09) — kesin karar, ortam değişkeniyle açılmaz.
   · Google Maps sayfalarının otomatik okunması (Playwright, gpuan-guncelle / gpuan-arama / gpuan-pilot) DURDURULDU.
   · google_ratings / google_rating_history tablolarındaki eski okumalar sitede GÖSTERİLMEZ ve hiçbir
     sıralamaya, listeye, yedek listeye ya da sayıma GİRMEZ. Tablolar hukuki inceleme bitene kadar silinmez
     (bkz. docs/asama0/google-temizlik-plani.md); yeni satır yazan bütün yollar kapalıdır.
   · Google puanı yeniden gösterilecekse yalnız resmî Google Maps Platform ürünüyle (Places UI Kit / Places API),
     sayfa açılışında ve saklamadan; bu sabit o zaman değil, ayrı bir gösterim katmanı eklenerek değişir.
   · Gidenler puanı (lib/score) bu karardan etkilenmez; zaten Google verisi okumaz.
   ────────────────────────────────────────────────────────────────────────── */
export const STORED_GOOGLE_RATINGS_DISPLAY = false as boolean;
export const GOOGLE_SCRAPING_ENABLED = false as boolean;

/** Otomatik okuma betikleri en başta bunu çağırır: süreç hiçbir ağ isteği yapmadan çıkar. */
export function stopIfScrapingDisabled(name: string) {
  if (GOOGLE_SCRAPING_ENABLED) return;
  console.error(`${name}: Google Maps otomatik okuma kalıcı olarak kapalı (lib/gpuan/policy.ts, Aşama 0). Hiçbir istek yapılmadı.`);
  process.exit(3);
}
