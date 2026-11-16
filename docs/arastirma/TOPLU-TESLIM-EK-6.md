# Toplu teslim eki 6 — Hamdi Eminönü kapı no, Az Çok Thai kategori (16 Kasım 2026)

Ek: `data/arastirma/toplu-teslim/ek-6-hamdi-azcok-karar.json` · Test: `npm run test:toplu-teslim-ek6`
Ortak giriş: `data/arastirma/toplu-teslim/guncel-durum.json` (`ekler.ek6` bağlantısı, iki kaydın `engel` alanı ve 2 yeni günlük satırı)
Temel: #69 `750f4cdeb7ed57c378bd9d5f0d00c7e3e4b73456` · Canlı: Production `2b437577f4a02197482fb90e46b5f75a3f0b96df` (değişmedi)

Bu bir araştırma ve kanıt teslimidir; kabul, Preview, veritabanı ya da Production izni değildir. #65'teki iki "TAMAMLANDI" iddiası koşullu kaldı; ek-3 dosyası değiştirilmedi.

**Önkoşul kontrolü:**
- Dal başları beklendiği gibi: #69 `750f4cd`, Production `2b43757`, #64 `40239d6`.
- Pilot'un birleşik havuzu (`codex/restoran-birlesik-876-kabul-20261116`) GitHub'da yok; kopyalanmaya çalışılmadı.
- Ortak araştırma dosyalarına başka aktif yazım yok.

## Hamdi Restaurant — Eminönü (Fatih): **BEKLIYOR**

| Kaynak | Şube adı | Ham adres | Kapı | Telefon | Yayın / güncelleme | Erişim |
|---|---|---|---|---|---|---|
| [hamdi.com.tr](https://hamdi.com.tr/) (resmî) | HAMDİ RESTAURANT - EMİNÖNÜ | Tahmis Cad. Kalçın Sokak No:11 Eminönü - İstanbul | 11 | 212 528 03 90 · 533 658 80 11 | sayfada tarih yok | 2026-11-16 |
| [Gault&Millau 2026](https://www.gault-millau.com.tr/hamdi-restaurant/) | Hamdi Restaurant (Eminönü) | Rüstem Paşa Mah. Tahmis Cad., Kalçın Sok. No:11, 34116 Fatih | 11 | 212 528 09 30 | yayın 2025-12-23 | 2026-11-16 |
| [Time Out Istanbul](https://www.timeout.com/istanbul/restaurants/hamdi) | Hamdi Restaurant (Fatih) | Tahmis Caddesi Kalçın Sokak 17 İstanbul | 17 | 212 528 03 90 | oluşturma 2011-04-22, yayın 2024-04-09, güncelleme 2024-04-10 | 2026-11-16 |
| [Falstaff](https://www.falstaff.com/en/restaurants/hamdi-restaurant-istanbul) (dizin, puan yok) | Hamdi Restaurant | Tahmis Caddesi, Kalcin Sokak 17, 34010 Istanbul | 17 | 212 528 03 90 | adres tarihi yok; sayfa düzeyi güncelleme 2026-10-21 | 2026-11-16 |
| Codex'in andığı "2025 rehberi" | — | — | 17 (yalnız Codex gerekçesi) | — | URL yerel kayıtlarda yok | açılmadı |

**Tarih ölçümü:**
- **Time Out:** son güncellemesi 2024-04-10, G&M sayfasından yaklaşık 20 ay eski. Daha eski olması No:17'nin geçersiz olduğunu kanıtlamaz.
- **Falstaff:** "eski" denemez. Sayfa düzeyindeki güncelleme (2026-10-21) G&M'den yeni. Eski kayıt işaretleri var: taşınma kimliği, eski alan adı `hamdirestorant.com.tr`, eski posta kodu 34010. Ama adres alanının tarihi ölçülemiyor.

**Hipotezler:**
- Eski numara: kanıtlanmadı.
- İkinci giriş: kanıtlanmadı.
- Yazım hatası: kanıtlanmadı. İki bağımsız kaynak aynı 17 değerini veriyor.
- Başka şube: desteklenmiyor. Dört kaynak da aynı sokağı veriyor. Time Out ve Falstaff'ın telefonu resmî Eminönü sabit hattıyla aynı. Şişli şubesi (19 Mayıs Cad. No:2, 212 375 00 16) ayrı kayıt olarak duruyor ve değiştirilmedi.

**Sonuç:** aynı Eminönü işletmesi; kapı numarası çelişkisi açık. Resmî site ve G&M'nin No:11'de aynı olması çelişkiyi kendiliğinden kapatmaz. Telefon alanı boş kalır. 528 03 90 ile 528 09 30 birbirine dönüştürülmedi.

**Kapanabilecek yol:**
- Tarihli bir bağımsız kaynağın No:11 vermesi, ya da bir kaynağın numara değişikliğini açıkça yazması.
- ÖNERİ (standart değişikliği, varsayılmadı): "güncel resmî kaynak ile daha yeni tarihli bağımsız rehber aynı kapıyı veriyorsa, daha eski ya da tarihsiz dizin kaydı çelişki sayılmaz" kuralı. Bu karar Harun ve Codex'in.

## Az Çok Thai — Beyoğlu, No:12/A: **RESTORAN_ONERISI**

| Kaynak | Alıntı | Kanıtladığı | Erişim |
|---|---|---|---|
| [azcokthai.com](https://azcokthai.com/) (EN) | "stylish café setting where we look forward to serving you lunch and dinner" · "Chic Café Ambiance" | öğle ve akşam yemeği servisi; "café" ortam niteleyicisi | 2026-11-16 (#65 kopyası) |
| [azcokthai.com/tr](https://azcokthai.com/tr/homepage-turkce/) | "kafe ortamında öğle ve akşam yemeği hizmeti" · "Az Çok Thai restoranımıza sizi bekliyoruz" | işletmecinin öz tanımı: restoran | 2026-11-16 |
| [azcokthai.com/food](https://azcokthai.com/food/) | "light lunch or a full-blown dinner" · yönetici şef · başlıkta "Thai Restaurant" | ana yemek servisi | 2026-11-16 |

**Değerlendirme:**
- İşletmeci kendini "restoranımız" diye tanımlıyor ve ana hizmeti öğle ile akşam yemeği.
- "Kafe" kelimesi her iki dilde de yalnız ortamı niteliyor.
- Kahve ya da pastane hizmetini gösteren bir ifade yok.
- Sitenin yapısal verisinde Restaurant ya da Cafe türü yok; karar şemaya dayanmadı.
- Menü PDF'i açılmadı, çünkü karar için gerekmedi. Menü ya da yemek eşleşmesi oluşturulmadı.

**Sayım etkisi yok:**
- Ortak kayıtta kategori "belirsiz" kalıyor; öneri `kategoriOnerisi` alanında.
- Codex teyidine kadar restoran KPI'sına, 716 aktif restorana ya da 114 kafeye eklenmedi.
- Codex'in #62'deki erişim sorunu kendi hattında açık.

## Ortak güncel kayıttaki etki

| Sayım | #69 | Ek 6 sonrası |
|---|---:|---:|
| Kanıt bekliyor (restoran / kafe / belirsiz) | 709 (537 / 151 / 21) | 709 (537 / 151 / 21) |
| Kabul adayı | 1 | 1 |
| Engel: kanıtı tamam, karar bekliyor | 3 | 2 (Az Çok Thai, Şahan Ataşehir) |
| Engel: adres / şube çelişkisi | 23 | 24 (+ Hamdi) |

**Sayı katmanları ayrı:**
- Bu araştırmada kabul edilen: 0.
- Kod adayı: 0.
- Preview'a uygulanan: 0.
- Canlı: 876 toplam / 841 aktif (716 restoran, 114 kafe, 11 bar) / 35 kapalı.

## Test

| Test | Ortam | Sonuç |
|---|---|---|
| `test:toplu-teslim-ek6`: eski ekler, kabul raporları, data/real ve eski test betikleri değişmedi; kaynak satırları tam; 11/17 ayrı korundu; çelişki açıkken BEKLIYOR; telefon ham ve dönüştürülmemiş; Şişli karışmadı; kategori öz tanıma dayanıyor; otomatik kabul yok; ortak girişteki engel kaynakla aynı; sayımlar ve canlı taban yeniden doğrulandı | yerel | Geçti 49/49 (bozma denemesinde 3 kontrol düştü) |
| `test:guncel-durum` | yerel | Geçti 27/27. İki kontrol ek-6 alanlarını ve yeni günlük satırlarını tanıyacak biçimde daraltıldı; #68 satırları yine aynen doğrulanıyor |
| Ek 2, 3, 4, 5 ve engel planı testleri | yerel | Geçti (25, 27, 23, 19, 18) |
| `tsc --noEmit` | yerel | Geçti |
| Preview, mobil/masaüstü, uçtan uca | — | Çalıştırılmadı (Pilot'un son birleşik sürümündeki tek Preview kabulüne bırakıldı) |
