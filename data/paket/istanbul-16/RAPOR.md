# Paket 16: Overture + resmî site keşfi (ilk 200 aday)

Kontrol: 2026-11-11 · Dal: `paket/istanbul-16-overture` (taban: paket 15 / PR #15) · Kataloğa eklenmedi. Yayını Codex yapar; onay sahibindedir.

**Yayın bağımlılıkları:**
- **PR #14** (koordinatsız profil metni).
- **Sor Gidenler ad eşleşmesi düzeltmesi.** Codex önerisi `docs/katalog/CODEX-KOORDINAT-ONERISI.md` §5'te.

## Yöntem (tekrar kullanılabilir döngü)
1. **`scripts/katalog/overture-cek.py`:** Overture Maps Places 2026-10-21.0, İstanbul kutusu (DuckDB, anonim okuma, ücretsiz).
   - Seçim: restoran ve fast food kategorileri, güven ≥ 0,9, web siteli; 6.418 kayıt.
2. **`scripts/katalog/overture-aday.ts`:** ön süzgeç; 4.769 aday kaldı. Çıkarılanlar:
   - platform ya da sosyal medya sitesi (525);
   - İstanbul dışı (130);
   - kapsam dışı zincir (628);
   - katalogda ya da açık paketlerde (366).
3. **`scripts/katalog/overture-site-olc.mjs`:** resmî site ölçümü. Ad + telefon/sokak/kapı no/ilçe, hangi sayfada bulunduğu ve spam/park işareti. Sayfa içeriği saklanmaz.
   - Site açılan: 1.768.
   - Kimlik eşleşen, spam/park ve kafe/bar olmayan: 775.
4. **`scripts/katalog/paket-overture.mjs`:** öncelik puanıyla 200 aday seçimi ve derin sınıflandırma.
   - Puan ölçütleri: bağımsız işletme, şef/gastronomi tanımı, ikonik tür, az temsil edilen ilçe, kanıt gücü, OSM kaydı.
   - Elle karar: `elle-karar.json`, 16 aday.

**Eksenler ayrı değerlendirildi** (her kayıtta `kalite` alanı):

| Eksen | Kaynak |
|---|---|
| Kimlik | resmî sitede ad + telefon/sokak; zincirde şube düzeyi |
| Faaliyet | resmî sitede güncel iletişim bilgisi; Overture güveni tek başına sayılmadı |
| Adres | kapı numarası OSM kaydından ya da resmî sitede doğrulanmış |
| Tür | resmî sitenin kendi tanımı > OSM cuisine > Overture kategorisi ("restaurant" gibi genel kategori sayılmadı) |
| Koordinat | yalnız sıkı eşleşen OSM restoran kaydından. Overture noktası kayda yazılmadı (`overture-oneri.json`). |

## Tablo 1: Genel durum

| Gösterge | Önceki durum | Yeni durum | Değişim |
|---|---:|---:|---:|
| Production mekân sayısı | 574 | 574 | 0 |
| Yayını bekleyen benzersiz kayıtlar (PR #6–15, #16) | 236 | 313 | +77 |
| Yeni A sınıfı (bekleyen toplam) | 116 | 141 | +25 |
| Yeni A-konumsuz (bekleyen toplam) | 18 | 70 | +52 |
| Toplam yayın adayı (A + B1 + A-konumsuz) | 236 | 313 | +77 |
| Yayın sonrası hedef mekân sayısı | 810 | 887 | +77 |

- B1: 102, değişmedi.
- PR #17'deki 1 kayıt (Menemen) Claude dışı olduğu için bu sayılara katılmadı.
- Yeni durum sütunu yerel benzetim değil; paket dosyalarından sayıldı.

## Tablo 2: Araştırma ve doğrulama sonuçları (200 aday, birbirini dışlayan)

| Sonuç | Adet | Oran |
|---|---:|---:|
| İncelenen aday | 200 | %100 |
| Production'da mevcut | 0 | %0 |
| Açık PR'larda mevcut | 0 | %0 |
| 906 havuzuyla ortak | 6 | %3,0 |
| Yeni A | 25 | %12,5 |
| Yeni A-konumsuz | 52 | %26,0 |
| B: eksik kanıt | 111 | %55,5 |
| C: güvenilir değil / kapsam dışı | 6 | %3,0 |
| Diğer elenenler | 0 | %0 |

**Not:** Production ve açık PR çakışmaları seçimden önce ayrıldı; ön süzgeçte 366 aday. Bu yüzden 200'ün içinde 0 görünüyor. Kesişim yok.

## Tablo 3: Yeni restoranlar (öncelik puanına göre ilk 20; tam liste `paket.json`)

| Restoran | İlçe | Mutfak | Kalite | Konum güveni | Kanıt |
|---|---|---|---|---|---|
| Saraykapı Restoran | Esenyurt | Türk mutfağı | A | OSM restoran kaydı | [saraykapi.com.tr](https://www.saraykapi.com.tr/) |
| Sultan Şark Sofrası | Sultangazi | Türk mutfağı | A | OSM restoran kaydı | [sultansark.com](https://www.sultansark.com/) |
| Necdet Usta Sofrası | Gaziosmanpaşa | Türk mutfağı | A | OSM restoran kaydı | [necdetustasofrasi.com.tr](https://necdetustasofrasi.com.tr/) |
| BalıkOsman Restaurant | Büyükçekmece | Balık restoranı | A-konumsuz | yok (Overture önerisi) | [balikosman.com.tr](https://balikosman.com.tr/) |
| İhtiyar Balıkçı Restaurant | Bakırköy | Balık restoranı | A | OSM restoran kaydı | [ihtiyarbalikci.com](https://ihtiyarbalikci.com/) |
| Sürmene Pide | Bahçelievler | Pideci | A-konumsuz | yok (Overture önerisi) | [surmenepide.com](https://surmenepide.com/) |
| Meyvalı (1959) | Küçükçekmece | Türk mutfağı | A-konumsuz | yok (Overture önerisi) | [meyvali.com.tr](https://www.meyvali.com.tr/) |
| Camlı Köşk Restaurant | Büyükçekmece | Balık restoranı | A-konumsuz | yok (Overture önerisi) | [camlikoskrestaurant.com](https://www.camlikoskrestaurant.com/) |
| Avni Baba | Avcılar | Meyhane | A-konumsuz | yok (Overture önerisi) | [avnibabaninyeri.com](https://www.avnibabaninyeri.com/) |
| Şanlıurfa Gül | Beylikdüzü | Dönerci | A-konumsuz | yok (Overture önerisi) | [şanlıurfagül.com](https://xn--anlurfagl-x9a19cer.com/) |
| Felek Mangalbaşı | Bakırköy | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [felekmangalbasi.com](https://www.felekmangalbasi.com/) |
| Mmy Tantuni | Bahçelievler | Türk mutfağı | A-konumsuz | yok (Overture önerisi) | [mmytantuni.com](https://www.mmytantuni.com/) |
| Beykent Saray Sac Tava | Beylikdüzü | Türk mutfağı | A-konumsuz | yok (Overture önerisi) | [beykentsaraysactava.com](https://www.beykentsaraysactava.com/) |
| Baykuru | Bağcılar | Türk mutfağı | A-konumsuz | yok (Overture önerisi) | [baykuru.com.tr](https://www.baykuru.com.tr/) |
| Porto Balık | Bakırköy | Balık restoranı | A | OSM restoran kaydı | [portobalik.com](https://portobalik.com/) |
| The Food Clan | Bakırköy | Türk mutfağı | A | OSM restoran kaydı | [thefoodclantr.com](https://www.thefoodclantr.com/) |
| Sosta Restaurant Mangalbaşı | Bahçelievler | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi) | [sosta.com.tr](https://www.sosta.com.tr/) |
| Aydınlar İskender | Küçükçekmece | Türk mutfağı | A-konumsuz | yok (Overture önerisi) | [aydinlariskender.com](https://www.aydinlariskender.com/) |
| Köftecibo | Bahçelievler | Türk mutfağı | A-konumsuz | yok (Overture önerisi) | [koftecibo.com.tr](https://koftecibo.com.tr/) |
| Özel Köfte | Bakırköy | Türk mutfağı | A-konumsuz | yok (Overture önerisi) | [oz-elkofte.com](https://www.oz-elkofte.com/) |

**Diğer öne çıkanlar:**
- Pudding Shop (Lale Restaurant)
- Garden 1897
- Kristal Büfe Göztepe (1962)
- Kumkapı Hoş Seda
- Pepo's Galata
- Saki Balık
- Ouzo Roof
- Tarihi Karaköy Pilavcısı
- Perihan Meyhane
- Veranda Pera

**Az temsil edilen 19 ilçeye** 26 yeni kayıt girdi: Esenyurt, Sultangazi, Gaziosmanpaşa, Bağcılar, Güngören, Kağıthane, Büyükçekmece, Bahçelievler, Silivri, Çatalca, Beylikdüzü ve diğerleri.

## Tablo 4: Eksikler ve riskler

| Sorun | Etkilenen kayıt | Önem derecesi | Çözüm / sonraki işlem |
|---|---:|---|---|
| Koordinat doğrulanamadı | 52 | Orta | A-konumsuz (harita noktası yok). Overture noktası `overture-oneri.json`'da tek kaynaklı KO3 adayı; şema kararı Codex'te. |
| Tam adres eksik (kapı no ya da adres resmî kaynakta yok) | 73 | Yüksek (B) | İletişim sayfası derin tarama, schema.org `PostalAddress` okuma (paket 17) |
| Resmî site doğrulanamadı (yalnız http ya da ilçe sitede yok) | 10 | Orta (B) | https düzelirse ya da ilçe kanıtı bulunursa yeniden ölçülür |
| Mutfak türü belirsiz ya da çelişkili | 28 | Orta (B) | Menü sayfası tarama; addan tür üretilmez |
| Tür yalnız Overture kategorisinden (A/A-konumsuz içinde) | 34 | Düşük–orta | Kaynakta "işletmenin platform beyanı" olarak yazılı; resmî site tanımıyla güçlendirilebilir |
| Mükerrer şüphesi | 6 (906) | Düşük | Yeni kayıt açılmadı; 906 kimliği korunarak paket 13 yöntemiyle doğrulanmalı. Ayrıca 1 yanlış OSM eşleşmesi (Kumkapı) ve 1 aynı otel çifti (Wyndham Grand: Perran + Ouzo Roof) incelenip çözüldü. |
| Lisans / kaynak sorunu | 0 | — | Kayıt düzeyinde Overture GERS kimliği, sürüm, kaynak ve lisans; paket açıklamasında Overture + OSM atfı |
| Sor Gidenler ad eşleşmesi ("en yüksek puanlı" → "Yüksel Balık") | 1 test | Yüksek (yayın engeli) | Codex: `lib/sor/engine.ts` QUERY_NOISE'a "yuksek, puan, puanli, puani" (öneri §5; benzetimde sortest 322/322) |

## Tablo 5: Test ve yayın hazırlığı

| Test | Sonuç | Başarılı / Toplam | Açıklama |
|---|---|---|---|
| TypeScript | Geçti | 1/1 | `tsc --noEmit`, paket dalında |
| Katalog | Geçti | 52/52 | katalogtest, benzetim (887 mekân) |
| Mükerrer kontrolü | Geçti | 28/28 | restoranpakettest paket 16; Production, PR #6–15, 906, seyrek, PR #17 Menemen karşılaştırması. Diğer paketler yeniden: 10/10 paket yeşil |
| Arama | Geçti | 49/49 + 77/77 | aramatest; önizleme denetiminde 77 kaydın hepsi ilk 8'de |
| Sor Gidenler | Geçti | 322/322 | Codex önerisi (Sor düzeltmesi) benzetime uygulanınca. Düzeltmesiz: 321/322 (Başarısız). |
| SEO / Sitemap | Geçti | 49/49 + 77/77 | seotest; 77 kayıt sitemap'te; koordinatsızda JSON-LD koordinatı yok |
| Mobil / Masaüstü | Geçti | 4/4 | 375 px ve 1024 px: koordinatlı (OSM haritası var) ve koordinatsız (harita yok, doğru atıf) profil; yatay taşma yok |
| Next build | Geçti | 1/1 | benzetim kopyasında |
| Yerel yayın benzetimi | Geçti | 235/235 | önizleme denetimi 77/77 (OSM) + 158/158 (koordinatsız); Production değildir |
| Gerçek Vercel Preview | Engelli | 0/1 | Neon Preview veritabanı dal sınırı; talimat gereği yeniden denenmedi |

## Tablo 6: GitHub teslim bilgileri
Commit SHA ve PR bağlantısı PR açıklamasında (bir dosya kendi commit SHA'sını içeremez).

## Kümülatif büyüme

| Paket | Yeni A | Yeni A-konumsuz | Yeni B1 | Kümülatif hedef | Yayın durumu |
|---|---:|---:|---:|---:|---|
| Production | — | — | — | 574 | Canlı |
| Paket 7–15 | 116 | 18 | 102 | 810 | Bekliyor (PR #6–15; Codex PR #18 7–14'ü hazırlıyor) |
| Paket 16 | 25 | 52 | 0 | 887 | Hazırlandı (PR) |
| Paket 17 (500 aday) | ~55–65 | ~120–140 | 0 | ~1.070 | Planlanıyor |

## Sonraki 500 aday (paket 17) için en verimli yöntem
**Bu paketin oranları:**
- Seçilen 200'ün %38,5'i A ya da A-konumsuz oldu.
- En büyük kayıp, site açılmaması: 3.001 / 4.769.
- İkinci büyük kayıp, kapı numarasının doğrulanamaması: 73.

**Öneri:**
1. **Kalan 575 uygun aday** (kimliği zaten eşleşen) + **açılmayan 3.001 sitenin yeniden denenmesi.** Düşük eşzamanlılık, http2/http1 ve www/www'suz denemesi; tahmini 800–1.000 yeni uygun aday.
2. **Adres kurtarma:** iletişim sayfasının derin taranması ve sitedeki schema.org `PostalAddress` / `LocalBusiness` okunması. B'deki 73 adres eksiğinin bir kısmı A-konumsuz olabilir.
3. **Tür:** menü sayfasından tanım; Overture kategorisi yalnız yedek kalır.
4. **906 ortakları (6):** paket 13 yöntemiyle, mevcut 906 kimliği korunarak.
