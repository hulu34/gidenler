# 879 tabanında beş restoranlık birleşik aday

Production `f4ebf2fe6304f1d83a959493cbca3668b65d5fe4`; doğrulanan Git tree `af780e09dfb0f891fa2854a6de67d81644b3eec2`. Araştırma PR70 sabit başı üzerinden883 satır güncel879 katalogla karşılaştırıldı. Eski araştırma sayımları canlı toplam değildir; ad/ilçe eşitliği yalnız inceleme adayıdır.

Kod adayı: Il Cortile, Dafni Ateşbaşı, Parlé, Sushi Barba İstinyePark İstanbul, Akbabalı Meyhane. Hedef884 toplam/849aktif/724aktif restoran. Kafe114/bar11/kapalı35 aynı. Beş kayıt A-konumsuz, wave24. Kimlik ve faaliyet kaynakları ile adres tercihleri `birlesik-879-kabul.json` içinde.

Eski879 kaydın bütün alanları, kullanıcılar/deneyimler, Menemen ve medya izinleri, Sor güvenliği, Google06.00/08.30, Excel ve şifreli yedek korunur. Menü/puan/fiyat/fotoğraf/telefon/saat/konum eklenmez; OSM ve Google kaynağı uydurulmaz. Maderia bekler. Chalet geçici kapanış bilgisi nedeniyle; Pizza Emirgan güncel işletmeci kaynağı bu tur alınamadığı için kapsam dışında. Diğer araştırma dalları birleştirilmez.

`test:birlesik879` güncel884sayımını, eski879alan korumasını, beş ekleme/tekrar0, yanlış tabanda ret ve kullanıcı ilişkili hedefli geri almayı sınar. Eski `test:birlesik876` tarihî879altkümesini denetler; yeni kesin sayım kapısı bunun yerine güncel pakette çalışır.

Preview oluşturulmadı, DB yazımı yapılmadı. Son kesin SHA için ayrı izole Preview izni istenir; gerçek dağıtılmış kabul geçmeden Production önerilmez. READY/buildsmoke gerçek Preview kabulü değildir. Sonrasında ayrıca açık Production onayı gerekir.

Geri dönüş: kod `f4ebf2fe6304f1d83a959493cbca3668b65d5fe4`; veri yalnız beş yeni slug ve kullanıcı ilişkileri kontrolüyle geri alınabilir. İlişki oluştuysa silme durur, kullanıcı verisi korunur. Toplu DB reseti yok.

Sor testinin yardımcı indeks kontrolü bu yerel ortamda tsx IPC iznine takıldı (ilk321/322). Aynı kontrol kaldırılmadan Node --import tsx başlatıcısına taşındı; test beklentileri veya Sor motoru değiştirilmedi. İlk başarısız log ayrı korunur.
