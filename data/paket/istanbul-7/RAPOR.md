# İstanbul restoran paketi 7 (dalga 7) — 2026-11-11

Paket yalnız restoranlardan oluşur. Kafe ve barlar ayrı havuzda sayılır, pakete girmez.

**Kayıtlar `venues.json`'a eklenmedi.** `kayitlar.json` yayın paketi hazırlanırken güncel Production koduna eklenir. Bu adım Codex'in ve sahibin onayına bağlıdır.

## Sayılar

| Kalem | Sayı |
|---|---:|
| Restoran adayı (havuz; OSM 2026-11-10) | 6723 |
| **A — yayına hazır, doğrulanmış restoran** | **23** |
| B — kanıt var, alan eksik (`inceleme.json`) | 369 |
| ↳ B1 — güçlü kanıt + kaynaklı tür, yalnız kapı numarası yok (`b1-yalniz-kapi-no-eksik.json`) | 102 |
| C — yayımlanmaz | 4214 |
| Ret (`ret.json`) | 2117 |
| Kafe / bar / tatlı-fırın havuzu (pakete girmez) | 3789 / 402 / 148 |

## A kayıtları

**İlçeler:** Sancaktepe 4, Beyoğlu 2, Fatih 2, Kadıköy 2, Pendik 2, Şişli 2, Arnavutköy 1, Avcılar 1, Beşiktaş 1, Çatalca 1, Küçükçekmece 1, Sarıyer 1, Sultanbeyli 1, Sultangazi 1, Ümraniye 1.
- Daha önce kataloğu zayıf olan ilçelere ilk restoranlar girdi: Sultangazi, Sultanbeyli, Sancaktepe, Arnavutköy, Avcılar, Küçükçekmece, Çatalca.

**Türler:** Türk mutfağı 16, Sushi / Japon 3, Pizza 2, Burger 2.

**Kanıt türleri** (bir kayıtta birden çok olabilir):
- İBB Açık Veri resmî işletmeci listesi: Kent Lokantaları, Sosyal Tesisler; İBB Açık Veri Lisansı.
- OSM'de son düzenleme yerinde anket uygulamasıyla (StreetComplete, Every Door; 2025+).
- OSM yerinde kontrol tarihi (≥ 2025-01).
- Resmî site ölçümü.
- Markanın resmî şube sayfası.

**Zincir şubeleri:** 14 şube resmî listeyle doğrulandı ve her biri ayrı kimlik aldı.
- İBB Kent Lokantaları ve Sosyal Tesisleri: İBB listesi.
- Burger Yiyelim: 2 şube, resmî şube sayfası.

## Zincir yaklaşımı (yeniden değerlendirildi)
- **Marka etiketli restoranlar artık otomatik reddedilmiyor.** Markanın resmî şube sayfası aranıyor:
  - OSM'deki site ya da elle doğrulanmış kök adres: `data/katalog/zincir-siteleri.json`.
  - O şubenin sokağı ile ilçesi/mahallesi aynı bölümde (±160 karakter) geçmeli; ayrıca kapı numarası ya da telefon eşleşmeli.
  - Ana sayfayla ortak metin (alt bilgi, genel merkez adresi) kanıt sayılmıyor.
- **Kanıtsız zincir şubeleri C'de kalıyor:** etiketli 94, şüpheli 478.
  - Nedenler: şube sayfası JavaScript ile yükleniyor, OSM'de sokak yok ya da site otomatik isteği engelliyor (Köfteci Yusuf: Cloudflare 403; atlatılmadı).
- **Kapsam dışı (sahip kararı):** global hızlı servis ve çiğ köfte büfesi zincirleri, 510 kayıt. En çok: burger king 115, mcdonald s 87, domino s 60, komagene 58, popeyes 31, tavuk dunyasi 27, little caesars 25, subway 20.

## Mükerrer kontrolü
- Karşılaştırılan kaynaklar: Production + PR #4 (573 + 1), 906 dalı, seyrek paketi.
  - Kurallar: aynı OSM kaydı, aynı ad 150 m, yazım farkı, aynı bina adresi, telefon, site alanı.
  - Slug, OSM kaydı, aynı ad ve aynı bina çakışması: 0.
- Paket içinde aynı binaya düşen kayıtlar C'ye alındı.

## B1 kararı (sahip)
- 102 restoranın faaliyeti güçlü kanıtlı ve türü kaynaktan geliyor. Yalnız kapı numarası yok: OSM'de bina adresi bulunmuyor, Google kullanılmıyor.
- "Sokak + mahalle" düzeyindeki adresle yayın kabul edilirse bu kayıtlar ayrı bir B1 paketi olarak hazırlanabilir. Kabul edilmezse kuyrukta kalırlar.
