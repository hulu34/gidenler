/* GİDENLER SEÇKİSİ — içerik dizini. Her yazı/etkinlik tek JSON dosyasıdır; yeni dosya buraya eklenir
   (scripts/seckisitest.ts klasördeki her dosyanın burada listelendiğini denetler). Doğrulama lib/seckisi'de. */
import pandeli from "./yazilar/pandeli-carsinin-icindeki-mavi-salon.json";
import yeniLokanta from "./yazilar/yeni-lokanta-dokuz-tabak-tek-masa.json";
import serden from "./yazilar/serden-tek-yemegin-adresi.json";
import efes from "./yazilar/efes-duatepede-tas-firin.json";
import balikci from "./yazilar/balikci-sabahattin-menuyu-okumak.json";
import cihangir from "./yazilar/cihangirde-sabahtan-gece-yarisina.json";
import taslak from "./yazilar/taslak-denetim-kaydi.json";

export const RAW_ARTICLES: unknown[] = [pandeli, yeniLokanta, serden, efes, balikci, cihangir, taslak];

/* Yaklaşan deneyimler: yalnız düzenleyicinin doğrulanmış duyurusuyla eklenir (etkinlikler/<id>.json).
   İlk pakette doğrulanmış etkinlik yok. */
export const RAW_EVENTS: unknown[] = [];
