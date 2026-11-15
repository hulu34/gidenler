# 833 kayıt sonrası restoran paketi

**9 restoranlık sabit kapsam. Production yayını yok; gerçek Preview kabulü bekleniyor.**

Taban `feature/investor-v1` @ `b83883bff72c9e8609cce24fb75feaf6b48748aa`. Araştırma PR 48 `ac9aee9`, PR 50 `77bc434`; Claude'un araştırma dalları değiştirilmedi.

| Durum | Toplam | Aktif | Aktif restoran | Aktif kafe | Aktif bar | Kapalı |
|---|---:|---:|---:|---:|---:|---:|
| Güncel canlı taban | 833 | 798 | 673 | 114 | 11 | 35 |
| Bu paket yayımlanırsa | 842 | 807 | 682 | 114 | 11 | 35 |
| Bu çalışma sırasında Production'a eklenen | 0 | 0 | 0 | 0 | 0 | 0 |

## Kabul kapsamı ve kaynaklar

Lokanta Yoğurt, Izaka Terrace, Lokanta Göktürk, Nappo Pizza Kanyon, Shang Palace, Arnavutköy Balıkçısı Beşiktaş, Backyard Bistro, Zübeyir Ocakbaşı Taksim ve Araf İstanbul.

Kayıtlar `data/paket/toplu-833-kabul/kayitlar.json`, satır bazında kanıt/kararlar `docs/katalog/toplu-833-kabul.json` içinde. İşletmeci kimliği ve faaliyeti, bağımsız şube/adres kaynağıyla karşılaştırıldı. Telefon, fiyat, ödül, fotoğraf ve menü aktarılmadı; hepsi A-konumsuz, uydurma harita noktası yok. Saha ziyareti veya telefon teyidi iddiası yok.

- Lokanta Yoğurt'un işletmecisi Hilton, No:20'deki restoranı Fami kafeden ayrı listeliyor.
- Izaka'nın resmî iletişim kaydı ile rehber No:8/Gümüşsuyu eşleşiyor. Bazı rehber istekleri 403/zaman aşımı verdi; arama dizininde okunabilen adres bilgisi ve güncel işletmeci bilgisi kullanıldı. HTTP 200 kabulü varmış gibi gösterilmedi.
- Lokanta Göktürk'ün güncel kendi sitesi No:16 D:E gösterir. İkinci rehber adresi 24.01.2025 tarihlidir; güncel faaliyet kanıtı değil, adres eşleştirmesidir.
- Nappo'nun Kanyon kiracı sayfası 1. kat ve No:185'i doğrular. Şişli ilçesi İşGYO'nun 31.12.2025 tarihli Kanyon raporuyla teyit edildi; ilçe tahmin edilmedi.
- Shang Palace işletmecinin B 1 katındaki Çin restoranı; mevcut Ist Too aynı otelde farklı konsepttir. Time Out'un 2013 tarihli kaydı yalnız adres çapraz kontrolüdür, güncel faaliyet iddiası değildir. Güncel faaliyet otelin kendi sayfasından doğrulandı. Eski araştırma kaydı daha önce 833 kataloğunda yayımlanmamıştı; gerçekten eklendiğinde artış bir olur.
- Arnavutköy Balıkçısı'nın No:4/Beşiktaş şubesi, mevcut No:125/Sarıyer şubesinden işletmecinin kendi listesinde ayrılıyor.
- Backyard'ın geçerli çıplak alan adı No:4, rezervasyon ve saatleri gösteriyor; www sertifika uyuşmazlığı için güvenlik gevşetilmedi.
- Zübeyir'in kendi Taksim şube sayfası Bekar Sokak No:28 ve rehber kimliğiyle eşleşiyor.
- Araf'ın çalışan Türkçe sitesi ve iletişim numarası Michelin kimliğiyle eşleşiyor. Ayrıntılı adres Michelin kaydından doğrulandı; yıldız/ödül alanı eklenmedi.

## Havuz uzlaştırması ve bekleyenler

1.333 kaynak satırı güncel 833 kayda karşı yeniden karşılaştırıldı. Bunlar 1.286 normalleştirilmiş ad/ilçe grubu ve 47 havuzlar arası örtüşme içerir; gerçek işletme tekilliğinin nihai sayımı değildir. Önceki paketlerin 8+17+15 yayımlanmış kayıtları tekrar eklenmedi. Bu paketin 9 farklı kaydı mevcut 833 içinde yok; benzer ad ve aynı bina tek başına mükerrer sayılmadı.

PR 48'in 596 satırından 16'sı artık canlıda; 1 yeni aday Araf, 442 restoran ek incelemede, 137 kafe/pastane bu restoran paketinin dışında. Diğer havuzlarla örtüşmeler toplanarak yeni kayıt sayısına eklenmez. Kıbrıs ve kafe politikası ayrı kaldı. Tam satır sınıflandırması yerel kabul raporuyla teslim edilir.

Yeni somut bekletme nedenleri:

- Adana Ocakbaşı: bulunan resmî site Nişantaşı Süleyman Nazif No:1; aday Kurtuluş Baysungur No:2. Aynı şube varsayılmadı.
- Catch: Allpoints Caddebostan kimliğini doğrular; aramada bulunan ve işletmeci üzerinden bağı doğrulanmayan menü portalı Bağdat No:354, rehber/Time Out Funda Çıkmazı 2/6 A gösterir. Portalın resmîliği veya şube devamlılığı teyit edilmedi.
- Hamdi Eminönü: resmî site Kalçın No:11, bağımsız kaynaklar No:17; kapı farkı çözülmedi. Şişli şubesinin de ikinci güncel işletmeci teyidi tamamlanmadı.
- Toro: verilen Six Senses restoran adresi genel koleksiyona yönleniyor. Bu, kapanış hükmü değildir; faaliyet/işletmeci teyidi eksik.
- Brasserie Noir: bulunan kaynak patisserie konsepti; restoran devamlılığı/tür ayrımı açık.
- Hodan: Beyoğlu ve Şişli adresleri ayrıştırılamadı.

Zayıf kayıtlar diğer dokuzun kabulünü engellemeden ayrı tutuldu. Yalnız Google puanı/harita görünürlüğü faaliyet kanıtı sayılmadı.

## Teknik kabul ve koruma

Yalnız 9 kayıt eklenir; mevcut 833 tüm alanlarıyla korunur. Sor ve istemci kataloğu son veri durumundan üretilir. Sor/güvenlik uygulama kodu, şema, OAuth, Menemen, Google 06.00/08.30, Excel ve şifreli yedek değişmez.

`test:toplu833` kesin 842/807 sayımı ile gerçek PostgreSQL uyumlu izole PGlite üzerinde ekleme, tekrar/no-op, yanlış taban, kullanıcı ilişkili geri almanın reddi ve hedefli geri dönüşte eski içerik korumasını sınar. Önceki PR 53 testi tarihsel alt küme kontrolüne dönüştürülür; bu paket için kesin sayım ayrı tutulur.

Tamamlanan PR 53'ün kendi geliştirme dalı yeni PR için ilerletilir; b83883b onaylı commit'i değişmez. Böylece aynı korumalı Preview ortamı ve ayrı Neon dalı yeniden kullanılabilir. Yeni kaynak/ücret açılması, DB silinmesi, bağlantı veya anahtar taşınması gerekmez. Mevcut Preview 833 kaydı koruyarak 842'ye genişletilecek; Production'a dokunulmaz. Eski Preview'ın yeniden güncel kabul ortamı olduğu raporda açık tutulur.

READY veya yerel derleme gerçek dağıtılmış kabul değildir. Son SHA üzerinde ayrı DB kimliği doğrulandıktan sonra yalnız 9 ekleme/tekrar, masaüstü/mobil profiller, arama–doğru deneyim formu hedefi, Menemen 45/6/1 ve üç Sor/bağlam sorgusu sınanacak. Kurallı yanıt gerçek AI sayılmayacak; geçici test işi bitince devre dışı bırakılacak.

Kabul tamamlandıktan sonra kesin SHA için doğrudan Production onayı gerekir. Kod geri dönüşü b83883b; hedefli veri geri alımında yeni kullanıcı ilişkileri korunmalı, bütün DB eski kopyayla değiştirilmemelidir.
