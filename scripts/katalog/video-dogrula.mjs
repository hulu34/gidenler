/* VİDEO DOĞRULAMA — YouTube videosunun gerçekten var olduğunu, gömmeye açık olduğunu ve kanal/yayın tarihini denetler.
   Kaynaklar: YouTube'un resmî oEmbed uç noktası (var mı, gömülebilir mi, kanal) ve izleme sayfasının üst verisi (yayın tarihi,
   playableInEmbed, ücretli tanıtım işareti, açıklamanın başı — şube eşleşmesi için). Video indirilmez, yalnız kimlik saklanır.
   Kullanım: node scripts/katalog/video-dogrula.mjs <cikti.json> <slug> <videoId…> [<slug> <videoId…>]
   Çıktı dosyası varsa üzerine eklenir (aynı slug:id yeniden yazılır). */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
const [outP, ...args] = process.argv.slice(2);
const out = existsSync(outP) ? JSON.parse(readFileSync(outP, "utf8")) : {};
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
let slug = null;
for (const a of args) {
  if (!/^[\w-]{11}$/.test(a)) { slug = a; continue; }
  const url = `https://www.youtube.com/watch?v=${a}`;
  const o = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { headers: { "user-agent": UA } });
  const oj = o.ok ? await o.json() : null;
  const w = await fetch(url, { headers: { "user-agent": UA, "accept-language": "tr,en" } }).then((r) => r.text()).catch(() => "");
  const g = (re) => re.exec(w)?.[1] ?? null;
  const desc = g(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
  const rec = { slug, id: a, oembed: o.status, embeddable: o.ok, title: oj?.title ?? null, channel: oj?.author_name ?? null, channelUrl: oj?.author_url ?? null,
    publishDate: g(/"publishDate":"([^"]+)"/), playableInEmbed: g(/"playableInEmbed":(true|false)/), paidPromotion: /paidContentOverlay|"isPaidPromotion":true/.test(w),
    lengthSec: g(/"lengthSeconds":"(\d+)"/), desc: desc ? JSON.parse(`"${desc}"`).slice(0, 700) : null, checkedAt: new Date().toISOString().slice(0, 10) };
  out[`${slug}:${a}`] = rec;
  console.log(`${slug} ${a} oembed=${o.status} gömme=${rec.playableInEmbed} ${rec.publishDate?.slice(0, 10)} ücretli=${rec.paidPromotion} [${rec.channel}] ${rec.title}`);
}
writeFileSync(outP, JSON.stringify(out, null, 1) + "\n");
