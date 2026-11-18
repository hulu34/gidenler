# Acil dış bağlantı engeli: Nezih ve Takanık

Temel: bcaef512ca8a5feac20b07c36a006bfd97d19750. Uzak feature/investor-v1 bu SHA olarak salt okunur doğrulandı. Koordinatörün browser kontrolü production Ready raporladı; bu çalışma yeni deployment gerçekleştirmedi.

Kategori düzeltmesi 7cb4 bu dala dahil değildir. Ayrı temiz checkout'ta hazırlandı.

## Kapsam
Kullanıcı/koordinatör canlı bağlantıların kumar/bahis içeriklerine gittiğini doğruladı. Yalnız `nezihkebap.com` ve `takanik.com.tr` (www/alt alanlar dahil) bastırılır. Alternatif site uydurulmaz. Restoranlar, telefon, diğer iletişim, puanlar ve menü içeriği korunur.

- İki kaydın website değeri mevcut `duzeltmeler.json` katmanında null yapıldı; ham kanıt ve DB değiştirilmedi.
- Nezih: nezih-kebap-yuvalama-sariyer; Takanık: takanik-balik-park-sariyer.
- Runtime kontrolü DB/profil değeri geri gelse bile hızlı Web, bilgi tablosu, rezervasyon bağlantısı, profil Web ve kaynak/menü bağlantısını engeller.
- Alan adı içeren serbest rezervasyon yönlendirmesi gizlenir; bağımsız telefon bağlantısı korunur.
- URL hostu parse edilir; benzer ama farklı alan adları engellenmez.
- Üretilmiş istemci kataloğunda yalnız bu iki website değişti; toplam884 korunur, PR72 beşlisi aynıdır.

## Kontroller
- scripts/nezih-link-safety-test.tsx: iki host, www/alt alan, büyük harf, DNS son noktası, şemasız port, DB/profil reinjection ve beş görünüm render testi; telefon ve iyi/benzer alan adı koruması geçti.
- client-catalog --check ve sor-index --check geçti.
- TypeScript noEmit kontrolü geçti.
- Son iki-host değişikliğiyle production build geçti.

## Uygulama sınırı
Yerel commit dışında işlem yok: push/PR/merge/DB/production/deploy yapılmadı. Yayın için kullanıcıya bu commit'in tam SHA'sı sunulmalı; daha yeni production varsa önce fark değerlendirilmelidir. Sadece frontend bastırması için genel seed veya DB yazısı gerekmez.
