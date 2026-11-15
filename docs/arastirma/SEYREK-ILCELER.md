# Seyrek ilçeler — ilk araştırma turu (15 Kasım 2026)

Dal: `arastirma/gm2026-kanitli-aday` (PR #50) · Taban: Production `174a1c9` (801 kayıt / **766 aktif**) · Veri: `data/arastirma/seyrek/adaylar.json`

**Yalnız araştırma verisi.** Kataloğa eklenmedi, veritabanına yazılmadı. Google verisi, sipariş platformu puanı ya da yorumu yok. Instagram otomatik okunmadı ve kanıt sayılmadı.

## Hedef ilçeler

Kapsama, yayımlanmış aktif mekânların yüz bin kişiye oranıyla ölçüldü; PR #48 ve PR #50 eklense bile en düşük kalan ilçeler seçildi:

| İlçe | Nüfus 2025 | Production aktif | /100 bin |
|---|---:|---:|---:|
| Esenler | 419.878 | 0 | 0,0 |
| Bağcılar | 707.635 | 2 | 0,3 |
| Sultangazi | 529.306 | 2 | 0,4 |
| Gaziosmanpaşa | 478.395 | 2 | 0,4 |
| Güngören | 251.242 | 1 | 0,4 |
| Kağıthane | 446.420 | 2 | 0,4 |
| Sultanbeyli | 378.908 | 2 | 0,5 |
| Esenyurt | 1.003.905 | 6 | 0,6 |
| Küçükçekmece | 785.270 | 6 | 0,8 |
| Çekmeköy | 315.959 | 3 | 0,9 |
| Bahçelievler | 539.035 | 6 | 1,1 |
| Avcılar | 440.663 | 8 | 1,8 |

Ayrıca kapsaması düşük komşu ilçeler de tarandı: Zeytinburnu, Büyükçekmece, Başakşehir, Silivri, Kartal, Bayrampaşa, Eyüpsultan.

## Kaynak taraması

| Kaynak | Ne yapıldı | Sonuç |
|---|---|---|
| yemek.com | Site haritasından son 12 ayda güncellenmiş 133 mekân listesi + 2 eski ilçe yazısı | 832 İstanbul kaydı; hedef ilçelerde **70** benzersiz mekân (49 yeni, 21 zaten katalogda ya da dallarda) |
| İBB Kent Lokantası (resmî) | `tesislerimiz.ibb.istanbul/kentlokantalari`: 22 şube, adresli | 17'si zaten Production'da; yeni yalnız Çırpıcı, Silivri, Ataşehir; Sarıgazi ve Çekmeköy eski paket incelemesinde |
| İşletmelerin resmî siteleri | 14 aday için site kontrolü | 3'ünde ad ve aynı kapı no; 2'sinde ad var, kapı no yok; çoğu açılmadı |
| Migros Yemek (sipariş platformu) | 5 aday adla arandı | Hiçbiri bulunamadı (aynı adlı başka şubeler) — verimsiz |
| Bağımsız haber | Kent Lokantası açılış haberleri | Çırpıcı için Evrensel 23.10.2026 |

## Sonuç

| Durum | Sayı |
|---|---:|
| **Codex teknik kabulüne hazır** (yemek.com 2026 + resmî sitede aynı kapı no) | **3** |
| İnceleme (ikinci kaynak ya da kapı no eksik) | 48 |
| Bekleyen eski kayda yeni kanıt (Kent Lokantası Sarıgazi, Çekmeköy) | 2 |
| Zaten katalogda ya da açık dallarda | 21 |

**Hazır 3 aday** (hepsi A-konumsuz):
- **Riva's Club** (Çekmeköy) — Taşlı Armut Sokak No:7, Sırapınar; kahvaltı. Kaynaklar: yemek.com Çekmeköy kahvaltı rehberi (12.11.2026) + resmî site.
- **House of Fellas** (Çekmeköy) — Çavuşbaşı Caddesi No:109, Merkez; kahvaltı. Kaynaklar: yemek.com (12.11.2026) + resmî site.
- **Arjantin Burger Handmade** (Avcılar) — Plaj Yolu Sokak No:15/A, Ambarlı; burger. Kaynaklar: yemek.com (30.09.2026) + resmî site.

**İncelemedeki 48 kayıt:**
- **Tek kaynaklı (34):** Yalnız yemek.com'un 2026 tarihli listesinde, ikinci bağımsız kaynak yok. Örnekler:
  - KONER Etli Ekmek (Sultangazi), Konak İşkembe (Bağcılar), Şırdancı Dayı (Küçükçekmece);
  - Gurme Mardin, Yayla Kokoreççisi, Ciğerci Usta, Kalpakchi (Bahçelievler);
  - Sare Tantuni, Pita Cafe (Avcılar), Şırdancı Mehmet ve Güney Adana (Zeytinburnu).
- **Yalnız kapı no eksik (3):**
  - Meşhur Balkan Tulumba (Eyüpsultan, resmî site © 2026);
  - Rumeli Tulumbacısı (Bayrampaşa);
  - Fasuli Garden Çekmeköy.
- **Kaynak 12 aydan eski (9):** Bahçelievler (2025-01) ve Bağcılar–Güngören (2023) yazıları.
- **Kent Lokantası (2):** Çırpıcı, iki bağımsız kaynaklı ama kapı no yok ("Çırpıcı Şehir Parkı girişi"); Silivri, yalnız İBB sayfası.

## Ana bulgu: sorun yapısal

- **Esenler'de hiçbir kaynakta tek bir aday çıkmadı.** Gaziosmanpaşa ve Kağıthane'de de yeni aday yok; Sultangazi, Bağcılar ve Küçükçekmece'de birer tane var.
- **Editoryal medya bu ilçeleri neredeyse hiç yazmıyor.** Gault&Millau, Michelin ve OGGUSTO hiç yazmıyor; yemek.com'un 832 İstanbul kaydının yalnız ~%6'sı bu ilçelerde.
- **Tek kalıcı kaynak belediye lokantaları.** Mevcut Kent Lokantası şubeleri zaten Production'da.
- **Yerel işletmelerin çoğunun resmî sitesi yok.** Dijital varlıkları Instagram ve sipariş platformlarında. İki bağımsız kaynak kuralıyla bu ilçelerde doğrulanabilir aday sayısı düşük kalıyor.

## 2.000 hedefi (değişmedi)

| Katman | Aktif | 2.000'e kalan |
|---|---:|---:|
| **Production (yayımlanmış)** | **766** | **1.234** |
| + PR #50 G&M hazır 50 aday + 7 eski kayıt + seyrek 3 aday (yalnız araştırma) | 826 | 1.174 |

## Sahip kararı gereken konular

Seyrek ilçeleri açmak için:

1. **Sipariş platformu + tarihli editoryal yeterli mi?** yemek.com 2026 kaydı ile Yemeksepeti/Migros/Getir sayfası iki kaynak sayılabilir mi? Kuralınız buna izin veriyor. Ama platform sayfalarını adla bulmak manuel iş; otomatik arama verimsiz çıktı.
2. **İnsan doğrulaması:** 34 tek kaynaklı aday için Instagram hesabının son paylaşım tarihine ya da telefonla doğrulamaya bir kişinin bakması mümkün mü? Bu ajan Instagram'ı okuyamıyor.
3. **Yerel kaynaklar:** İlçe belediyelerinin esnaf rehberleri ve yerel gazeteler (ör. Esenler, Bağcılar, Gaziosmanpaşa yerel haber siteleri) bir sonraki turun kaynağı olabilir. Bunlar tek tek, düşük verimle taranır.

Test: `scripts/arastirmagm2026test.ts` 864/864 (yerel; seyrek dosyası da dahil). Preview ve Production'da test edilmedi.
