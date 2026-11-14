# 2.000 mekân — ikinci gece (15 Kasım 2026)

Yerel dal `katalog/gece-2000-ek`, PR #48 dalının (`60472db`) üstünde. Uzak depoya itilmedi. `data/real` değişmedi; hiçbir kayıt canlıda gösterilmiyor. Google verisi, ücretli servis, sahte puan/yorum yok.

## Sayılar

| Ölçü | Sayı |
|---|---:|
| Production (a225e8c), canlı sitede de doğrulandı | 793 toplam · **758 aktif** · 35 kesin kapalı |
| PR #48'deki adaylar (değişmedi, yeniden araştırılmadı) | 513 |
| Bu gece ek hazırlanan doğrulanmış aday | **83** (p27: 53, p29: 21, p28: 2, p24'e site adresiyle +7) |
| Bu gece tekilleştirmede elenen | 31 mükerrer (p27: 27, p28: 3, p29: 1) + 1 güçlü şüphe (Ken Sushi ↔ Ali Ocakbaşı Kadıköy, aynı bina) |
| Bu gece elle reddedilen | 40 tür/işletme kararı (p27: 13, p29: 27) + 2 bozuk site adresi |
| Bu gece bekletilen (kanıt eksik) | 265 (p27: 220 B + 25 C, p28: 11 B + 6 C, p29: 3 B) |
| Havuz toplamı (PR #48 + bu gece) | **596** (156 A + 440 A-konumsuz; 459 restoran + 137 kafe) |
| 2.000 aktife kalan — yalnız yayımlanmış aktif | **1.242** (2.000 − 758) |
| Adayların hepsi kabul edilirse | 1.389 toplam / 1.354 aktif → kalan 646 |

## Kaynaklar (yalnız PR #48'in dokunmadığı adaylar)

| Paket | Kaynak | Huni |
|---|---|---|
| 27 | Overture ≥0,9 + site restoran havuzunda sitesi açılmış, ad + telefon/sokak eşleşmiş ama paket 16–18'in ilk N seçimine hiç girmemiş adaylar | 482 → 223 sokak + kapı no sitede → tür menü/hakkımızda metninden (35 karar, 13 ret) → 53 |
| 28 | Güven 0,75–0,9 restoran havuzu: 41 incelenmemiş nitelikli + 1.566 açılmamış sitenin yeniden denemesi | 17 site açıldı, 4 nitelikli → 2 (havuz tükendi) |
| 29 (kafe kipi) | Güven 0,75–0,9 kafe/pastane/fırın/tatlıcı (ilk kez) | 2.609 → 1.567 açıldı → 326 nitelikli → 98 sokak + kapı no → 26 elle kabul → 21 |
| 24 (ek) | p24 ve p27'de yalnız adres eksik 91 aday: işletmenin kendi sitesindeki adres satırı (aynı sayfada telefon + ilçe; sayfada tek adres) | 17 adres → 2 bozuk ret → p24'e 7, p27'ye 2 |
| — | Üçüncü deneme: hâlâ açılmayan 2.071 restoran + 1.113 kafe sitesi (40 sn) | 23 açıldı, 5 nitelikli: bu siteler ölü; havuz kapandı |

Kural aynı: kimlik + faaliyet için işletmenin kendi sitesinde ad ve telefon/sokak; adres için sokak + kapı no; tür için sitenin kendi metni (alıntı `tur-karar.json`) ya da OSM. Overture güveni ve kategorisi kanıt sayılmadı. Elle reddedilenler `elleRet` / `elle-karar.json` içinde gerekçesiyle: kahve makinesi kiralama/servis, dondurma makinesi, mimarlık şirketi, şarap aksesuarı dükkânı, pasta malzemesi, çevrim içi sipariş siteleri, dondurma üreticisi, mağaza/showroom, grup portalı blog metni, yanlış tür kalıpları.

Mükerrer kontrolü: Production + PR #48 (paket 15–26) + bu gecenin paketleri birbirine karşı (slug, OSM ref, aynı resmî site alanı + ilçe, telefon, aynı ad + ilçe, 100–150 m içinde benzer ad, aynı bina adresi). Şubeler ayrı kayıt yalnız adresleri farklıysa (ör. Hacıbaşar Bostancı / Kadıköy, Sahan, Tella Kebap Atakent). Paket içinde aynı işletmenin iki Overture kaydı birleşti (Ron Cafe / Ron Nişantaşı).

## İlçe (bu gecenin 83 kaydı)

Kadıköy 15 · Beşiktaş 12 · Şişli 12 · Fatih 7 · Beyoğlu 6 · Ataşehir 4 · Küçükçekmece 4 · Ümraniye, Sarıyer, Başakşehir, Üsküdar, Bakırköy 2'şer · Tuzla, Eyüpsultan, Bağcılar, Büyükçekmece, Silivri, Çatalca, Esenyurt, Arnavutköy, Kartal, Esenler, Gaziosmanpaşa, Bahçelievler, Beykoz 1'er. Seyrek ilçeler hâlâ az temsil ediliyor; resmî sitesi olan işletme kaynağı merkezde yoğun.

## Testler

| Test | Ortam | Sonuç |
|---|---|---|
| `scripts/katalog2000test.ts` (paket 15–29) | yerel dal | Geçti 4.800/4.800 |
| Birleşik aday denetimi p15–29 | yerel dal | Geçti: 596 geçerli, 0 elenen |
| Benzetim 1.389 kayıt: yükleme, katalog 52, arama 49, SEO 51, Seçki 65, Google 103, DB 296, rezervasyon 22, tsc, `next build` (2.827 sayfa) | yerel benzetim | Geçti |
| Sor | yerel benzetim | Başarısız 321/322 — bilinen "yüksek"↔"Yüksel Balık" hatası (Codex) |
| ana sayfa / medya | yerel benzetim | Başarısız 30/31, 164/165 (Production'da aynı) |
| Preview | — | Çalıştırılmadı (dal itilmedi) |
| Production | — | Dokunulmadı |

Yerel `node_modules`, a225e8c'deki Next/sharp/PostCSS güncellemesinden önceki sürümlerde; derleme bu sürümlerle.

## Açık riskler

- İlk yükleme JS: `/` 283 kB (Production) → 366 kB (1.306) → **380 kB (1.389)**; 2.000'de ≈ 480 kB. Katalog istemci paketine giriyor (Codex mimari işi; 2.000 için engel).
- A-konumsuz 440 kayıt: PR #14 ve şema türü önkoşul.
- Sor "Yüksel Balık" hatası büyük katalogda tetikleniyor.
- 137 kafe kaydı: ana sayfa/keşifte gösterim ürün kararı.
- Kaynak tükeniyor: Overture'da sitesi olan havuzlar (≥0,75) bitti; kalan 694/646 için resmî sitesi olmayan işletmelerde kabul edilebilir faaliyet kanıtı türü gerekiyor (sahip kararı).
