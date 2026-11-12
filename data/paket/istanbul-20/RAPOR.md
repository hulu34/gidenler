# Paket 20: 906 havuzuyla ortak kayıtlar (32 aday)

Kontrol: 2026-11-12 · Dal: `paket/istanbul-20-906-ortak` (taban: paket 19) · Kataloğa eklenmedi. Yayını Codex yapar; onay sahibindedir.

**Kapsam:** Paket 16–18'de 906 dalındaki bir kayıtla ortak bulunan 32 Overture adayı. Bunlara yeni kayıt açılmadı.

**Yöntem (paket 13 ilkesi):**
- 906 kimliği korunur: slug, OSM kaydı ve ilçe 906'dakiyle aynıdır.
- Kanıt bugünkü A kurallarıyla baştan toplandı:
  - resmî site (ad + telefon ya da sokak);
  - güncel OSM öğesi restoran;
  - kapı numaralı adres, sitede doğrulanmış ya da OSM'den;
  - kaynaklı tür.
- 906 eşleşmesi doğrulanmayan aday (ilçe ya da OSM/telefon uyuşmazlığı) kimlik devralmaz. Kastamonu Pastırmacısı (Başakşehir) ile 906'daki Moni Restoran Cafe (Kadıköy) yalnız telefonla eşleşmişti; ayrı tutuldu ve B'de.
- Test: her kaydın slug, OSM kaydı ve ilçesi 906 kaydıyla aynı (`V906` denetimi).

**Sonuç:** 32 adaydan 19'u A (906 kimliğiyle), 13'ü B (adres ya da tür eksik).

**Öne çıkanlar:**
- Asitane (Kariye)
- Babel Ocakbaşı Nevizade
- Firuzende
- Chacha Balık
- Meat & Meet (Kasap Dursun, 1978)
- Şenol Kolcuoğlu
- Patlıcan Cafe & Ev Yemekleri
- Mylos Balık

**Başarı göstergeleri:**
- İncelenen adaylardan doğrulananlar: 19/32 (%59,4)
- Restoran başına doğrulanmış veri alanı: %100,0 (5 eksen: kimlik, faaliyet, adres, tür, koordinat; A = 5/5, A-konumsuz = 4/5)
- Az temsil edilen ilçelere (katalogda < 25 mekân) kazandırılan: 6

**Tablo 1 — Genel durum**

| Gösterge | Önceki durum | Yeni durum | Değişim |
|---|---:|---:|---:|
| Production mekân sayısı | 792 | 792 | 0 |
| Yayını bekleyen benzersiz kayıtlar | 244 | 263 | +19 |
| Yeni A sınıfı (bekleyen toplam) | 69 | 88 | +19 |
| Yeni A-konumsuz (bekleyen toplam) | 175 | 175 | +0 |
| Toplam yayın adayı (A + B1 + A-konumsuz) | 244 | 263 | +19 |
| Yayın sonrası hedef mekân sayısı | 1036 | 1055 | +19 |

**Tablo 2 — Araştırma ve doğrulama sonuçları (32 aday, birbirini dışlayan)**

| Sonuç | Adet | Oran |
|---|---:|---:|
| İncelenen aday | 32 | %100 |
| Production'da mevcut | 0 | %0,0 |
| Açık PR'larda mevcut | 0 | %0,0 |
| 906 havuzuyla ortak | 0 | %0,0 |
| Yeni A | 19 | %59,4 |
| Yeni A-konumsuz | 0 | %0,0 |
| B — eksik kanıt | 13 | %40,6 |
| C — güvenilir değil / kapsam dışı | 0 | %0,0 |
| Diğer elenenler | 0 | %0,0 |

**Tablo 3 — Yeni restoranlar (öncelik sırasına göre ilk 19; tam liste paket.json)**

| Restoran | İlçe | Mutfak | Kalite | Konum güveni | Kanıt |
|---|---|---|---|---|---|
| Kalbur Et Kebap | Ümraniye | Türk mutfağı | A | OSM restoran kaydı | [kalburet.com](https://www.kalburet.com/) |
| Tadı Bafra | Maltepe | Pideci | A | OSM restoran kaydı | [tadibafra.com](http://www.tadibafra.com/) |
| Chacha Balık | Üsküdar | Balık restoranı | A | OSM restoran kaydı | [chachabalik.com.tr](https://www.chachabalik.com.tr/) |
| Karina Balık Restaurant | Pendik | Balık restoranı | A | OSM restoran kaydı | [karinabalik.com.tr](https://karinabalik.com.tr/) |
| Şenol Kolcuoğlu Restaurant | Maltepe | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [senolkolcuoglu.com](https://senolkolcuoglu.com/) |
| Lezafet | Kartal | Steakhouse | A | OSM restoran kaydı | [lezafet.com.tr](https://www.lezafet.com.tr/) |
| Filizler Köftecisi Tuzla | Tuzla | Köfteci | A | OSM restoran kaydı | [filizler.com](https://filizler.com/) |
| Kasap Dursun Meat and Meet | Şişli | Steakhouse | A | OSM restoran kaydı | [meatandmeet.com.tr](https://www.meatandmeet.com.tr/) |
| Babel Ocakbaşı Nevizade | Beyoğlu | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [babelocakbasi.com](https://www.babelocakbasi.com/) |
| Asitane Restaurant | Fatih | Türk mutfağı | A | OSM restoran kaydı | [asitanerestaurant.com](https://www.asitanerestaurant.com/) |
| Firuzende Galata | Beyoğlu | Türk mutfağı | A | OSM restoran kaydı | [firuzende.com](https://firuzende.com/) |
| Mylos Ayvalik Cunda Mutfagi | Kadıköy | Balık restoranı | A | OSM restoran kaydı | [mylosbalik.com](https://mylosbalik.com/) |
| Ora's Steak and Burgers | Üsküdar | Burger | A | OSM restoran kaydı | [orasteakburgers.com](https://www.orasteakburgers.com/) |
| Özgün Kokoreç | Pendik | Kokoreççi | A | OSM restoran kaydı | [ozgunkokorec.com](https://www.ozgunkokorec.com/) |
| Burger&Sausage 200gram | Ümraniye | Burger | A | OSM restoran kaydı | [200gramburger.com](https://www.200gramburger.com/) |
| Murat Kebap Kadıköy Kebapçı | Kadıköy | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [muratkebap.dijital.menu](https://muratkebap.dijital.menu/) |
| Valibey Kebap | Kadıköy | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [valibeykebap.com](http://www.valibeykebap.com/) |
| Patlican Cafe Ev Yemekleri | Kadıköy | Lokanta | A | OSM restoran kaydı | [patlicancafe.com](https://www.patlicancafe.com/) |
| Vegan Masa (Kadıköy) | Kadıköy | Türk mutfağı | A | OSM restoran kaydı | [veganmasa.com](https://www.veganmasa.com/) |

**Tablo 4 — Eksikler ve riskler**

| Sorun | Etkilenen kayıt | Önem derecesi | Çözüm / sonraki işlem |
|---|---:|---|---|
| Koordinat doğrulanamadı | 0 | Orta | A-konumsuz; Overture noktası yalnız öneri dosyasında, şema kararı Codex'te |
| Tam adres eksik | 7 | Yüksek (B) | iletişim sayfası derin tarama, schema.org PostalAddress |
| Resmî site doğrulanamadı | 0 | Orta (B) | https / ilçe kanıtı bulunursa yeniden ölçüm |
| Mutfak türü belirsiz | 7 | Orta (B) | menü sayfası; Overture kategorisi tek başına kabul edilmez |
| Mükerrer şüphesi | 0 | Düşük | yeni kayıt açılmadı; 906 kimliği korunur |
| Sor ad eşleşmesi ("yüksek" → Yüksel Balık) | 1 test | Yüksek (yayın engeli) | Codex: QUERY_NOISE'a sıralama sözcükleri (CODEX-SOR-ONERISI.md); PR #22'de de yok |
| Lisans / kaynak sorunu | 0 | — | kayıt düzeyinde Overture GERS, sürüm, kaynak, lisans; OSM atfı |

**Tablo 5 — Test ve yayın hazırlığı**

| Test | Sonuç | Başarılı / Toplam | Açıklama |
|---|---|---|---|
| TypeScript | Geçti | 1/1 | tsc --noEmit, paket 19 dalında |
| Katalog | Geçti | 52/52 | katalogtest; benzetim (Production + paket 7–21) |
| Mükerrer kontrolü | Geçti | 24/24 | 906 kimlik denetimi dahil (slug, OSM kaydı, ilçe 906 ile aynı); diğer paketlerle çakışma yok |
| Arama | Geçti | 49/49 | aramatest + önizlemede her kayıt kendi adıyla ilk 8'de |
| Sor Gidenler | Başarısız | 321/322 | "Yüksel Balık" ad eşleşmesi (paket 16 kaydı); Codex önerisiyle 322/322 (docs/katalog/CODEX-SOR-ONERISI.md) |
| SEO / Sitemap | Geçti | 49/49 | seotest; önizlemede hepsi sitemap'te |
| Mobil / Masaüstü | Geçti | 4/4 | 375 px: Sait (koordinatsız), Asitane (OSM); 1024 px: Pepo's Galata (OSM), Sait; yatay taşma yok, koordinatsız profilde harita noktası iddiası yok; paket 21 aynı iki profil türünü kullanır (önizleme denetiminde profil + arama + form) |
| Next build | Geçti | 1/1 | benzetim kopyası (Production + paket 7–21) |
| Yerel yayın benzetimi | Geçti | 59/59 | önizleme denetimi (profil, arama, form, sitemap); Production değildir |
| Gerçek Vercel Preview | Engelli | 0/1 | Neon Preview veritabanı dal sınırı (PR #22'de de 10/10 dolu); yeniden denenmedi |

**Tablo 6 — GitHub teslim bilgileri**

| Alan | Değer |
|---|---|
| Production dalı / SHA | feature/investor-v1 @ 721b1a1 (PR #18 birleşti; dalda 792 kayıt; bu çalışmada dokunulmadı) |
| Geliştirme dalı | paket/istanbul-20-906-ortak |
| Paket numarası | 20 |
| PR bağlantısı / Commit SHA | PR açıklamasında (dosya kendi commit SHA'sını içeremez) |
| Yeni benzersiz kayıt sayısı | 19 |
| Preview bağlantısı / engel | Engelli: Neon dal sınırı |
| Production durumu | Dokunulmadı |
| Yayına engel olan konu | PR #14 + Codex Sor düzeltmesi |

**Kümülatif büyüme**

| Paket | Yeni A | Yeni A-konumsuz | Yeni B1 | Kümülatif hedef | Yayın durumu |
|---|---:|---:|---:|---:|---|
| Production (feature/investor-v1 @ 721b1a1; paket 7–14 dahil) | — | — | — | 792 | Canlı (PR #18 birleşti) |
| Paket 15 (PR #15) | 0 | 18 | 0 | 810 | Bekliyor (PR #14 düzeltmesine bağlı) |
| Paket 16 (PR #19) | 16 | 45 | 0 | 871 | Hazır |
| Paket 17 (PR #20) | 28 | 52 | 0 | 951 | Hazır |
| Paket 18 (PR #21) | 14 | 18 | 0 | 983 | Hazır |
| Paket 19 (PR #23) | 11 | 42 | 0 | 1036 | Hazır |
| Paket 20 (PR #24) | 19 | 0 | 0 | 1055 | Hazır |
| Paket 21 (yeni PR) | 4 | 44 | 0 | 1103 | Hazır |

