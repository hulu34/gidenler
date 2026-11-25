/* GİDENLER SEÇKİSİ — içerik dizini. Her yazı/etkinlik tek JSON dosyasıdır; yeni dosya buraya eklenir
   (scripts/seckisitest.ts klasördeki her dosyanın burada listelendiğini denetler). Doğrulama lib/seckisi'de. */
import pandeli from "./yazilar/pandeli-carsinin-ustundeki-mavi-salon.json";
import japonErdal from "./yazilar/japon-erdal-dort-pide-bir-efsane.json";
import yeniLokanta from "./yazilar/yeni-lokanta-dokuz-tabakta-anadolu.json";
import serden from "./yazilar/serden-mese-atesinin-karsisinda.json";
import efes from "./yazilar/efes-duatepede-tas-firin.json";
import balikci from "./yazilar/balikci-sabahattin-sultanahmetin-arkasinda.json";
import cihangir from "./yazilar/cihangirde-sabahtan-gece-yarisina.json";
import taslak from "./yazilar/taslak-denetim-kaydi.json";
/* Semt rehberi pilotu (14.11.2026): kontrol bekliyor — Production'da görünmez, yalnız Preview/yerel geliştirmede. */
import kadikoy from "./yazilar/kadikoyde-nerede-ne-yenir.json";
import beyogluRota from "./yazilar/beyoglu-gastronomi-rotasi-karakoyden-cihangire.json";
import yarimada from "./yazilar/tarihi-yarimadanin-koklu-sofralari.json";

export const RAW_ARTICLES: unknown[] = [pandeli, japonErdal, yeniLokanta, serden, efes, balikci, cihangir, taslak, kadikoy, beyogluRota, yarimada];

/* Yaklaşan deneyimler: yalnız düzenleyicinin doğrulanmış duyurusuyla eklenir (etkinlikler/<id>.json).
   İlk pakette doğrulanmış etkinlik yok. */
export const RAW_EVENTS: unknown[] = [];
