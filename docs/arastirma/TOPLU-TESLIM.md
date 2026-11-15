# Toplu teslim manifesti — PR #48 + PR #50 (15 Kasım 2026)

Dal: `arastirma/toplu-teslim-manifesti` · Taban: Production `7924559` (PR #55 birleşti; iş #54 `259a530` üstünde başladı) · Manifest: `data/arastirma/toplu-teslim/manifest.json` · Test: `scripts/arastirmatopluteslimtest.ts`

**Yalnız araştırma teslimi.**
- Kataloğa eklenmedi, veritabanına yazılmadı, canlıda sayılmaz.
- Gerçek Preview ve yayın Codex kabul hattında. Production için Harun'un kesin SHA onayı gerekir.
- Kaynaklar yeniden taranmadı. Manifest, araştırma dosyalarından ağ erişimi olmadan türetildi:
  - PR #48 `ac9aee9`: `data/katalog/gece-2000/birlesik-aday.json` ve `data/paket/istanbul-15…29/paket.json`;
  - PR #50 `77bc434`: `data/arastirma/gm2026/adaylar.json` ve `data/arastirma/seyrek/adaylar.json`.
- PR #48, #50, #55 ve #52 dalları değişmedi. #55, bu iş sürerken Codex/Pilot tarafından Production'a birleştirildi.

## Canlı taban

| Production | Toplam | Aktif | Aktif restoran | Kafe | Bar | Kapalı |
|---|---:|---:|---:|---:|---:|---:|
| #54 `259a530` (verilen taban) | 842 | 807 | 682 | 114 | 11 | 35 |
| #55 `7924559` (güncel Production dalı) | **848** | **813** | 688 | 114 | 11 | 35 |

- `259a530` sayıları Codex'in #55 özetiyle aynı.
- `7924559`, #55'in 6 restoranını ekliyor.
- Test, sayıları `data/real` dosyalarından yeniden hesaplıyor.
- Canlı dağıtımın doğrulaması Codex ve Pilot'ta.

## Sonuç

| | Kayıt |
|---|---:|
| Kaynak satırı (#48: 596, #50 G&M: 244, #50 seyrek: 74) | 914 |
| Benzersiz kayıt (tekilleştirme sonrası) | **883** |
| Yayımlanmış (Production `7924559`'da; #55'in 6 adayı dahil) | 125 |
| #55 bekletmesi (yayımlanmadı) | 7 |
| **Uygun paket** | **15** (restoran 14, kafe 1) |
| Sorunlu (gerekçeli ayrı liste) | 736 |

### Uygun paket (15)

Hepsi yayımlanmamış ve #55'in dışında. Hiçbirinde Codex'in önceki bekletmesi yok. Her birinde resmî site ya da sipariş platformu, son 12 ayda tarihli bir bağımsız kaynakla birlikte var. Adres kapı numaralı; kaynaklar arasında sokak ya da kapı no çelişkisi yok.

| Kayıt | İlçe | Tür | Adres | Kaynak kayıtları | Bağımsız kaynak |
|---|---|---|---|---|---|
| Galeyan Restaurant | Fatih | restoran | Ticarethane Sk No:13/B | #48 + G&M | G&M 2026 (23.12.2025) |
| Mira | Beşiktaş | restoran | Bebek Arnavutköy Cd No:70 | #48 + G&M | G&M 2026 |
| Nato Lokantası | Beyoğlu | restoran | Karanlık Fırın Sokak No:4 | #48 + G&M | G&M 2026 |
| Uskumru | Beykoz | restoran | Körfez Cd No:55 | #48 + G&M | G&M 2026 |
| Cecconi's | Beyoğlu | restoran | Meşrutiyet Cd No:56 | #48 + G&M | G&M 2026 |
| CokCok Thai | Beyoğlu | restoran | Meşrutiyet Cd No:51/A | #48 + G&M | G&M 2026 |
| Banyan Restaurant | Beşiktaş | restoran | Salhane Sk No:3 | #48 + G&M | G&M 2026 |
| Da Mario | Beşiktaş | restoran | Dilhayat Sokak No:7 | #48 + G&M | G&M 2026 |
| Yüksel Balık Tarabya | Sarıyer | restoran | Haydar Aliyev Cd No:208 | #48 + G&M | G&M 2026 |
| Büyük Erzurum Sofrası | Kartal | restoran | Kumlar Cad. No:26/2 | #48 + seyrek | yemek.com (16.10.2026) |
| Cağistan Erzurum Cağ Kebabı | Eyüpsultan | restoran | Eyüp Sultan Blv No:81 | #48 + seyrek | yemek.com (27.10.2026) |
| Arjantin Burger Handmade | Avcılar | restoran | Plaj Yolu Sokak No:15/A | seyrek | yemek.com (30.09.2026) + resmî site |
| Alaçatı Gurme-i ALA | Başakşehir | restoran | Doğa Parkı Caddesi NG Blok No:13-15 | seyrek | yemek.com (10.11.2026) + Migros Yemek |
| Meşhur Yayla Kokoreçcisi | Bahçelievler | restoran | Mahmut Ardıç Sokak No:18 | seyrek | yemek.com (30.09.2026) + Migros Yemek |
| Pita Cafe Boşnak Böreği | Avcılar | **kafe** | Reşitpaşa Caddesi No:14 | seyrek | yemek.com (12.10.2026) + Migros Yemek |

- **#48 + G&M kayıtları (11):** PR #48'deki resmî site satırı ile PR #50'deki G&M 2026 rehber satırı tek kayıtta birleşti. İkisi ayrı satırken tek kaynaklıydı; birleşince iki kaynağa ulaştı.
- **Sipariş platformlu 3 kayıt:** `kanitPolitikasi` alanında sahibin 15.11.2026 kararı yazılı (tarihli editoryal + sipariş platformu iki kaynak sayılır).
- **Pita Cafe:** Kafe yayın politikası Codex'te açık (PR #51: `KARAR_GEREKLI`), bu yüzden ayrı listede.

### Sorunlu (736) — ilk sorun koduna göre

| Kod | Kayıt | Anlamı |
|---|---:|---|
| `bagimsiz-kaynak-yok` | 565 | Yalnız resmî site + harita verisi (Overture/OSM). Son 12 ayda tarihli bağımsız kaynak yok; harita kaydı faaliyet kanıtı sayılmadı |
| `baska-kayitla-eslesmis` | 52 | PR #50 "katalogda/dalda var" ya da "mükerrer" dedi, ama eşleşen kayıt bu kaynaklarda ya da aynı ilçede Production'da bulunamadı. Varsa aynı adlı Production kaydı gerekçede yazılı |
| `eksik-faaliyet` | 46 | Güncel faaliyet kanıtı eksik (PR #50 inceleme) |
| `codex-onceki-bekletme` | 22 | Codex'in önceki kararı `BEKLIYOR`, `KARAR_GEREKLI` ya da bekletme; gerekçesi kayıtta |
| `eksik-adres` | 14 | Kapı numaralı adres eksik |
| `kapsam-disi` | 12 | Restoran/kafe kapsamı dışında |
| `tek-kaynak` | 8 | Yalnız markanın resmî şube kaynağı |
| `eski-kayit-kaniti` | 7 | Yeni mekân değil; mevcut Production paket/ret kaydına ek kanıt |
| `adres-celiskisi` | 4 | Kaynaklarda farklı kapı no ya da sokak: Il Cortile, Dafni Ateşbaşı, Akali Mall of İstanbul, Sahan |
| `eksik-kimlik` | 3 | Kimlik çelişkisi |
| `ret-onerisi` | 2 | Araştırmanın ret önerisi |
| `eksik-kapanis-isareti` | 1 | Kapanış işareti |

Sorunlu kayıtların türleri: 537 restoran, 150 kafe, 49 belirsiz (kaynakta kategori yok). Bir kayıtta birden çok sorun varsa hepsi `sorunlar` alanında.

### Yayımlanmış (125) ve #55 bekletmeleri (7)

- **Yayımlanmış kayıtlar:** `yayin.slug` alanı Production slug'ını gösteriyor. Bunlar yeni kayıt olarak sayılmaz.
- **#55 kayıtları:** Dal `7924559` değiştirilmedi.
  - **6 aday:** Villa Bosphorus ve 5 White Burger şubesi. #55 birleştiği için yayımlananlar arasında; `pr55` alanında "#55 adayı" işareti duruyor.
  - **7 bekletme:** Sankai, Beymen Brasserie, Taste by Aliée ve 4 White Burger şubesi (Galataport, Finanskent, Marmara Park, Pendik). `teslim: pr55` altında, gerekçeleriyle.
  - Bu 13 kayıt pakete alınmadı.

## Kayıt alanları

Her kayıtta şu alanlar var:
- **`anahtar`:** Tekilleştirme anahtarı; katlanmış ad + ilçe. PR #50'nin "eşleşen" bağları aynı ilçedeki PR #48 kaydına bağlanır.
- **`kategori`:** restoran, kafe ya da bar (ayrı); ayrıca `categoryId` ve `kind`.
- **`subeAdres`:** Adres, şube ve kapı no; her kaynak kaydının adresi ayrı (`kaynakAdresleri`).
- **`kaynaklar`:** Kaynak türü, URL, yayın tarihi (`yayin`) ve erişim tarihi (`erisim`).
- **`faaliyetKaniti`:** Kaynak kaydı başına metin ve tarih.
- **`kaynakKayitlari`:** PR, kaynak id ve özgün durum.
- **`yayin`:** Production durumu ve slug.
- **`pr55`**, **`codexOncekiKarar`**.
- **`teslim`**, **`sorunlar`** (kod + gerekçe), **`celiski`**.

## Codex için

- **Uygun paket (15):** Örneklem kontrolü yeterli.
- **Sorunlu liste:** Yalnız eksik, eski ya da çelişkili kanıt yeniden kontrol edilmeli. En büyük grup (565) bağımsız kaynağı olmayan PR #48 kayıtları; yeni bağımsız kaynak bulunmadıkça paket olamazlar.
- **Kapsam dışı:**
  - Kıbrıs (#52 `29b9c9b`): 6 teslim ayrı; 4 koşullu ve 14 bekleyen hariç; LPM posta kodu çelişkisi ve bölge/telefon/saat eksikleri açık.
  - feature/bin-mekan (906) havuzu.
- **Yapılmayanlar:** Yeni araştırma, ücretli kaynak, işletmelere mesaj ve yayın yok.
