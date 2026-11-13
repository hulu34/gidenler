# Profil 39–40 birleşik inceleme adayı

Production tabanı: `2031408276fc5e4a24223a4e45fa70f656ffb604`.
Uygulama kaynağı: `d9ad0b3af77ef540529b5a6b92e9e19ef6014a65` (Claude PR #42, Issue #41).
Bu kayıt uygulama, katalog, otomasyon veya yapılandırma değiştirmez. Birleşik inceleme dalının Vercel tarafından başka bir geliştirme dalıyla karıştırılmasını önler.

## Bağımsız bulut kabulü

[Run 43402232603](https://github.com/hulu34/gidenler/actions/runs/43402232603): 26 profil, 411 menü ürünü ve 16 video; uygula, tekrar uygula, asıl işlemden geri al, çift geri al ve yeniden uygula zinciri geçti. PostgreSQL17 üzerinde gerçek HTTP uygulaması kullanıldı; Vercel kabulü bu testle yapılmış sayılmaz.

İki eşzamanlılık deneyi geçti: başka mekâna commit edilmiş video bağlantısı korundu; eski geri alma ile çakışan yeni profil yazımı kısmi değişiklik yapmadan 409 ile reddedildi. Üç adres için yalnız address/neighborhood alanlarında uygulama, işlemsiz tekrar ve hedefli geri alma doğrulandı.

793 kimlik, 767 hedef dışı mekân, 46 korunan sentetik veri grubu ve Menemen değişmedi. Chromium 375/390/1440 ve WebKit390 kontrolleri geçti. Menemen: 6 fotoğraf, 18 WebP, 45 arşiv ürünü ve tek sponsorlu video korundu.

Eski üç kırmızı paket saklanmadı: ana sayfa 30/31, medya 164/165, İstanbul7 14/18; aynı başarısızlıklar exact Production tabanında da mevcut. Gerçek video oynatımı, gerçek Google girişi ve gerçek e-posta kabulü bu içerik paketinin testleri olarak raporlanmaz.

## Gerçek Preview ve yayın sınırı

Yalnız kullanıcı tarafından açıkça onaylanan mevcut Neon test dalı yeniden kullanılır: `br-spring-cherry-bavhyz5y`, `preview/inceleme/profil-39-40-birlesik-20261113`. Hesap/deneyim korunur; 457 kayıt yalnız eksik mevcut katalog kimlikleri eklenerek 793'e tamamlanır. Dal silme, Production bağlantısı taşıma, yeni ücretli kaynak veya güvenlik gevşetmesi yoktur.

Gerçek Vercel/Neon kabulü ayrıca tamamlanmalıdır. Orijinal PR #39/#40, PR #37 ve Production bu inceleme dalına yapılan işlemle yayımlanmaz. Production merge, deploy veya DB yazması için kesin aday SHA'sına özel yeni kullanıcı onayı gerekir.

Geri dönüş: uygulama sürümü `2031408276fc5e4a24223a4e45fa70f656ffb604`; profil verisi her uygulamanın auditId kaydıyla hedefli geri alınır. Daha yeni değişiklik varsa geri alma zorlanmaz. Ortak videonun genel kaydı silinmez; yalnız uygulamanın eklediği mekân bağlantısı kaldırılır. Menü sürümleri ve denetim kayıtları geçmiş olarak korunur. Üç adres için koşullu eski değerler ayrı saklanır. Yeni restoran eklenmez; 334 araştırma kaydı bu pakete uygulanmaz.
