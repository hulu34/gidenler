# Paket 16: Overture + resmî site keşfi (200 aday, kalite turu sonrası)

Kontrol: 2026-11-11 · Dal: `paket/istanbul-16-overture` · Kataloğa eklenmedi. Yayını Codex yapar; onay sahibindedir.

**Kalite düzeltmesi (2026-11-12):** Overture adres metninden yazılan sokak + kapı no resmî sitede birlikte yeniden arandı (`scripts/katalog/adres-dogrula.mjs`). Bulunamayan 7 kayıt (3 A + 4 A-konumsuz) B'ye indi; ayrıntı `paket.json` → `kaliteDuzeltmesi` ve `inceleme.json`.

**Kalite turu:**
- Türü yalnız Overture kategorisinden gelen 34 kayıt, resmî sitenin başlık, açıklama ve menüsüyle yeniden doğrulandı (`tur-karar.json`).
  - 24'ü kanıtlandı; 13'ünde tür düzeltildi.
  - 10'u B'ye indi; Pudding Shop dahil, çünkü sitede tür tanımı yok.
- Overture kategorisi artık tek başına tür kanıtı sayılmıyor.
- Adres kurtarma: schema.org PostalAddress ya da iletişim bloğunda "No <kapı>". Bu pakette 1 kayıt (Ayvaz Döner İskender) A-konumsuz oldu.

**Yöntem:** Tekrar kullanılabilir döngü:
`overture-cek.py` → `overture-aday.ts` → `overture-site-olc.mjs` → `paket-overture.mjs` (+ `elle-karar.json`, `tur-karar.json`, adres kurtarma) → `paket-rapor.mjs`

Eksenler ayrı değerlendirilir (kimlik, faaliyet, adres, tür, koordinat):
- Koordinat yalnız sıkı eşleşen OSM restoran kaydından alınır. OSM'si olmayanlar A-konumsuz olur.
- Overture güveni tek başına kanıt sayılmaz.
- Google verisi yok.
- Her kayıtta Overture GERS kimliği, sürüm, kaynak ve lisans var.

**Başarı göstergeleri:**
- İncelenen adaylardan doğrulananlar: 61/200 (%30,5)
- Restoran başına doğrulanmış veri alanı: %85,2 (5 eksen: kimlik, faaliyet, adres, tür, koordinat; A = 5/5, A-konumsuz = 4/5)
- Az temsil edilen ilçelere (katalogda < 25 mekân) kazandırılan: 39

**Tablo 1 — Genel durum**

| Gösterge | Önceki durum | Yeni durum | Değişim |
|---|---:|---:|---:|
| Production mekân sayısı | 574 | 574 | 0 |
| Yayını bekleyen benzersiz kayıtlar | 236 | 297 | +61 |
| Yeni A sınıfı (bekleyen toplam) | 116 | 132 | +16 |
| Yeni A-konumsuz (bekleyen toplam) | 18 | 63 | +45 |
| Toplam yayın adayı (A + B1 + A-konumsuz) | 236 | 297 | +61 |
| Yayın sonrası hedef mekân sayısı | 810 | 871 | +61 |

**Tablo 2 — Araştırma ve doğrulama sonuçları (200 aday, birbirini dışlayan)**

| Sonuç | Adet | Oran |
|---|---:|---:|
| İncelenen aday | 200 | %100 |
| Production'da mevcut | 0 | %0,0 |
| Açık PR'larda mevcut | 0 | %0,0 |
| 906 havuzuyla ortak | 6 | %3,0 |
| Yeni A | 16 | %8,0 |
| Yeni A-konumsuz | 45 | %22,5 |
| B — eksik kanıt | 127 | %63,5 |
| C — güvenilir değil / kapsam dışı | 6 | %3,0 |
| Diğer elenenler | 0 | %0,0 |

**Tablo 3 — Yeni restoranlar (öncelik sırasına göre ilk 20; tam liste paket.json)**

| Restoran | İlçe | Mutfak | Kalite | Konum güveni | Kanıt |
|---|---|---|---|---|---|
| Saraykapı Restoran | Esenyurt | Türk mutfağı | A | OSM restoran kaydı | [saraykapi.com.tr](https://www.saraykapi.com.tr/) |
| Sultan Şark Sofrası | Sultangazi | Türk mutfağı | A | OSM restoran kaydı | [sultansark.com](https://www.sultansark.com/) |
| Necdet Usta Sofrası | Gaziosmanpaşa | Türk mutfağı | A | OSM restoran kaydı | [necdetustasofrasi.com.tr](https://necdetustasofrasi.com.tr/) |
| BalıkOsman Restaurant | Büyükçekmece | Balık restoranı | A-konumsuz | yok (Overture önerisi ayrı) | [balikosman.com.tr](https://balikosman.com.tr/) |
| İhtiyar Balıkçı Restaurant | Bakırköy | Balık restoranı | A | OSM restoran kaydı | [ihtiyarbalikci.com](https://ihtiyarbalikci.com/) |
| Meyvalı | Küçükçekmece | Türk mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [meyvali.com.tr](https://www.meyvali.com.tr/) |
| Camlı Köşk Restaurant | Büyükçekmece | Balık restoranı | A-konumsuz | yok (Overture önerisi ayrı) | [camlikoskrestaurant.com](https://www.camlikoskrestaurant.com/) |
| Avni Baba | Avcılar | Meyhane | A-konumsuz | yok (Overture önerisi ayrı) | [avnibabaninyeri.com](https://www.avnibabaninyeri.com/) |
| Şanlıurfa Gül | Beylikdüzü | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [xn--anlurfagl-x9a19cer.com](https://xn--anlurfagl-x9a19cer.com/) |
| Felek Mangalbaşı | Bakırköy | Kebapçı / Ocakbaşı | A | OSM restoran kaydı | [felekmangalbasi.com](https://www.felekmangalbasi.com/) |
| Mmy Tantuni | Bahçelievler | Tantuni | A-konumsuz | yok (Overture önerisi ayrı) | [mmytantuni.com](https://www.mmytantuni.com/) |
| Beykent Saray Sac Tava | Beylikdüzü | Türk mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [beykentsaraysactava.com](https://www.beykentsaraysactava.com/) |
| Baykuru | Bağcılar | Türk mutfağı | A-konumsuz | yok (Overture önerisi ayrı) | [baykuru.com.tr](https://www.baykuru.com.tr/) |
| Sosta Restaurant Mangalbaşı | Bahçelievler | Kebapçı / Ocakbaşı | A-konumsuz | yok (Overture önerisi ayrı) | [sosta.com.tr](https://www.sosta.com.tr/) |
| Aydınlar İskender | Küçükçekmece | Dönerci | A-konumsuz | yok (Overture önerisi ayrı) | [aydinlariskender.com](https://www.aydinlariskender.com/online-ordering) |
| Köftecibo | Bahçelievler | Köfteci | A-konumsuz | yok (Overture önerisi ayrı) | [koftecibo.com.tr](https://koftecibo.com.tr/) |
| Ayvaz Döner İskender | Bahçelievler | Dönerci | A-konumsuz | yok (Overture önerisi ayrı) | [ayvazdoner.com](https://ayvazdoner.com/) |
| Özel Köfte | Bakırköy | Köfteci | A-konumsuz | yok (Overture önerisi ayrı) | [oz-elkofte.com](https://www.oz-elkofte.com/) |
| Bakirkoy Koftecisi | Bakırköy | Köfteci | A-konumsuz | yok (Overture önerisi ayrı) | [bakirkoykoftecisi.com](https://bakirkoykoftecisi.com/) |
| Anam Mantı | Bakırköy | Mantıcı | A-konumsuz | yok (Overture önerisi ayrı) | [anammanti.com.tr](https://anammanti.com.tr/) |

**Tablo 4 — Eksikler ve riskler**

| Sorun | Etkilenen kayıt | Önem derecesi | Çözüm / sonraki işlem |
|---|---:|---|---|
| Koordinat doğrulanamadı | 45 | Orta | A-konumsuz; Overture noktası yalnız öneri dosyasında, şema kararı Codex'te |
| Tam adres eksik | 68 | Yüksek (B) | iletişim sayfası derin tarama, schema.org PostalAddress |
| Resmî site doğrulanamadı | 4 | Orta (B) | https / ilçe kanıtı bulunursa yeniden ölçüm |
| Mutfak türü belirsiz | 92 | Orta (B) | menü sayfası; Overture kategorisi tek başına kabul edilmez |
| Mükerrer şüphesi | 6 | Düşük | yeni kayıt açılmadı; 906 kimliği korunur |
| Sor ad eşleşmesi ("yüksek" → Yüksel Balık) | 1 test | Yüksek (yayın engeli) | Codex: QUERY_NOISE'a sıralama sözcükleri (CODEX-SOR-ONERISI.md); PR #22'de de yok |
| Lisans / kaynak sorunu | 0 | — | kayıt düzeyinde Overture GERS, sürüm, kaynak, lisans; OSM atfı |

**Tablo 5 — Test ve yayın hazırlığı**

| Test | Sonuç | Başarılı / Toplam | Açıklama |
|---|---|---|---|
| TypeScript | Geçti | 1/1 | tsc --noEmit, paket 19 dalında |
| Katalog | Geçti | 52/52 | katalogtest; benzetim (Production + paket 7–20) |
| Mükerrer kontrolü | Geçti | 28/28 | restoranpakettest (paket 20 dalının ucunda): Production, PR #6–15 paketleri, paket 16–20'nin diğerleri, 906, seyrek, PR #17 Menemen |
| Arama | Geçti | 49/49 | aramatest + önizlemede her kayıt kendi adıyla ilk 8'de |
| Sor Gidenler | Başarısız | 321/322 | "Yüksel Balık" ad eşleşmesi (paket 16 kaydı); Codex önerisiyle 322/322 (docs/katalog/CODEX-SOR-ONERISI.md) |
| SEO / Sitemap | Geçti | 49/49 | seotest; önizlemede hepsi sitemap'te |
| Mobil / Masaüstü | Geçti | 4/4 | 375 px: Sait (koordinatsız), Asitane (OSM); 1024 px: Pepo's Galata (OSM), Sait; yatay taşma yok, koordinatsız profilde harita noktası iddiası yok |
| Next build | Geçti | 1/1 | benzetim kopyası (Production + paket 7–20) |
| Yerel yayın benzetimi | Geçti | 50/50 + 137/137 | önizleme denetimi (profil, arama, form, sitemap); Production değildir |
| Gerçek Vercel Preview | Engelli | 0/1 | Neon Preview veritabanı dal sınırı (PR #22'de de 10/10 dolu); yeniden denenmedi |

**Tablo 6 — GitHub teslim bilgileri**

| Alan | Değer |
|---|---|
| Production dalı / SHA | feature/investor-v1 @ b95d284 (574 mekân, değişmedi) |
| Geliştirme dalı | paket/istanbul-16-overture |
| Paket numarası | 16 |
| PR bağlantısı / Commit SHA | PR açıklamasında (dosya kendi commit SHA'sını içeremez) |
| Yeni benzersiz kayıt sayısı | 61 |
| Preview bağlantısı / engel | Engelli: Neon dal sınırı |
| Production durumu | Dokunulmadı |
| Yayına engel olan konu | PR #14 + Codex Sor düzeltmesi |

**Kümülatif büyüme**

| Paket | Yeni A | Yeni A-konumsuz | Yeni B1 | Kümülatif hedef | Yayın durumu |
|---|---:|---:|---:|---:|---|
| Production (gerçek) | — | — | — | 574 | Canlı |
| Paket 7–15 (PR #6–15; 7–14 PR #22 birleşik adayında) | 116 | 18 | 102 | 810 | Bekliyor |
| Paket 16 (PR #19) | 16 | 45 | 0 | 871 | Hazır |
| Paket 17 (PR #20) | 28 | 52 | 0 | 951 | Hazır |
| Paket 18 (PR #21) | 14 | 18 | 0 | 983 | Hazır |
| Paket 19 (yeni PR) | 11 | 39 | 0 | 1033 | Hazır |
| Paket 20 (yeni PR) | 19 | 0 | 0 | 1052 | Hazır |

