# 30 restoran: kaynaklı içerik envanteri ve 12 profil (13 Kasım 2026)

**Taban ve dal:** Production `feature/investor-v1` @ `2031408276fc5e4a24223a4e45fa70f656ffb604` (793 mekân, Menemen yayında). Dal: `profil/zengin-30`.

**Dokunulmayanlar:**
- Production'a yazılmadı, birleştirme ve deploy yapılmadı.
- PR #38 (Menemen) ve PR #39'daki 14 profil ve 3 adres kapsam dışında.
- Codex'in Sor, Production ve güvenlik dosyalarına dokunulmadı.

## Seçim
- **Havuz:** Production kataloğunda henüz içerik profili olmayan restoranlar. PR #39 ve Menemen hariç tutuldu.
- **Seçim nedenleri yalnız doğrulanabilir kaynaklara dayanıyor:**
  - katalogdaki Michelin 2026 kaydı (16 restoran);
  - işletmenin kendi anlattığı kuruluş yılı ya da geçmişi;
  - ilçenin katalogdaki kayıt sayısı (az temsil edilen 5 ilçe).
- **Editör adayları:** kaynakla doğrulanamayan "ikonik" adaylar envanterde açıkça "editör adayı (kaynakla doğrulanmadı)" diye işaretli.
- Popülerlik sıralaması ya da puan üretilmedi.

## Çıktılar
- **`data/katalog/zengin-30/envanter.json`:** her restoran için aşağıdakileri kaynak ve kontrol tarihiyle tutuyor:
  - seçim nedeni;
  - menü, saat ve rezervasyon durumu;
  - fotoğraf hak durumu;
  - kontrol edilen tüm videolar (kanal, yayın tarihi, oEmbed sonucu, gömme, ücretli tanıtım işareti, profilde olup olmadığı);
  - bulgular.
- **`content/profiles/*.json`:** 12 profil. Mevcut profil şeması (`lib/profile`) ve video alanı (`profile-apply` → `addPlaceVideo`) kullanıldı; yeni bileşen yok.
- **`scripts/katalog/video-dogrula.mjs`:** YouTube oEmbed ve izleme sayfası üst verisiyle video doğrulaması.
- **`scripts/zengin30-profil-test.ts`:** profilleri PGlite'ta uygular. Kontrol ettikleri:
  - şema ve kaynak alan adı;
  - saatin JSON-LD'ye çevrilmesi;
  - menü fiyat tutarlılığı;
  - videonun envanterle eşleşmesi;
  - gidiş-dönüş, geri alma ve tekrar uygulama.

## Kurallar
- Yalnız resmî site ve sitede bağlantısı verilen resmî menü dosyaları kullanıldı. Kontrol tarihi 13.11.2026.
- Fiyat yalnız menüde yazıldığı gibi alındı. Günlük ya da kilo fiyatlı kalemler fiyatsız bırakıldı.
- Menü tarihi varsa `validFrom` olarak yazıldı. Tarihsiz menüde bu alan yok.
- Eski menü güncelmiş gibi gösterilmedi (Develi'nin 2018 PDF'i kullanılmadı).
- **Saat:** yalnız günleri açıkça yazılan saatler `hours` alanına girdi. Gün belirtilmeyen saatler (Mürver, 1924) not olarak yazıldı.
- **Adres:** hiçbir profil adres ya da koordinat değiştirmiyor.
- **Telefon:** yalnız katalogda eksik olan üç kayda eklendi (1924, Kanaat, Selim Usta).
- **Video:**
  - Yalnız oEmbed 200 veren ve gömmeye açık videolar alındı.
  - Ücretli tanıtım işaretli video alınmadı.
  - Şube eşleşmesi kesin olmayan video alınmadı (Park Fora için "Bebek" diyen kısa video).
  - Eski şefi anlatan video alınmadı (Topaz).
  - Videolar indirilmedi; yalnız bağlantı ve kimlik.
  - YouTube'da ücretli tanıtım işaretinin görünmemesi, içerik üreticisiyle işletme arasında ticari ilişki olmadığı anlamına gelmez; envanterdeki alan yalnız işaretin görülüp görülmediğini kaydeder.
  - "İşletmenin kanalı" yalnız resmî siteden bağlantı verilen kanallarda yazılır (Park Fora). Sunset ve Selim Usta videolarında atıf kanal adına daraltıldı (issue #41).
- **Fotoğraf:** eklenmedi. Hiçbir restoran için işletme izni yok. Wikimedia Commons dosya aramasında ilgili lisanslı görsel çıkmadı.
- Google verisi, kullanıcı yorumu, puan ve ziyaret verisi kullanılmadı.

## Sonuç
| | Sayı |
|---|---:|
| Envanterdeki restoran | 30 |
| Geliştirilen profil | 12 |
| Menü eklenen | 7 (6'sı fiyatlı; 320 kalem) |
| Saat (JSON-LD'ye çevrilebilir) | 7 (+2 profilde not olarak) |
| Rezervasyon bilgisi | 9 |
| Kontrol edilen video | 43 (11 restoran; diğer 19'unda video araması yapılmadı) |
| Profile giren video | 16 (9 restoran) |
| Eklenen fotoğraf | 0 |

## Codex'e notlar
- **Uygulama:** profiller DB'ye uygulanmadı. Yayında `profile-apply` yolundan uygulanır; videolar aynı istekte `addPlaceVideo` ile eklenir (oEmbed yeniden doğrulanır).
- **Pelikan Balık (Sancaktepe):** resmî sitedeki adres ve telefonlar katalogdakinden farklı. OSM sokak kontrolü yapılamadı; adres yazılmadı.
- **Hünkar (Şişli):** katalogdaki resmî site 2011 telifli eski bir sayfa ve alakasız bağlantılar gösteriyor. Web alanının gözden geçirilmesi önerilir.
- **Dodo Balık (Tuzla) ve Doğa Cafe (Çatalca):** katalogdaki web adresleri çözümlenmiyor. Faaliyet kanıtı yeniden kontrol edilmeli.
- **Yanyalı Fehmi, Kalpazankaya, Lacivert:** resmî sitelerin TLS sertifikaları geçersiz. Güvenlik uyarısı aşılmadı.
- **Lokanta 1741:** sitede iki farklı saat yazıyor. Profilde rezervasyon sayfası esas alındı; çelişki not olarak var.
