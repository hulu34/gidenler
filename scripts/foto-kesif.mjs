/* FOTOĞRAF KEŞFİ — resmî sitelerden aday bulur, puanlar; görsel SAKLAMAZ (bellekte ölçülür, atılır), yayımlamaz.
   node scripts/foto-kesif.mjs <liste.json> <çıktı.json> [durum.json]
   Liste: [{slug,name,district,website,instagram}]. Çıktı: adaylar + mekân özeti. Durum: site parmak izi; değişmeyen site yeniden taranmaz.
   robots.txt'e uyar, alan adı başına bekler, yeniden dener, zaman aşımı ve adet sınırı vardır. Google ve Instagram taranmaz.
   Yüz, filigran ve gerçek/AI ayrımı otomatik YAPILMAZ: bunlar editör kontrolüdür. Hak durumu her adayda "bilinmiyor" başlar. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const UA = "GidenlerFotoKesif/1.0 (+https://www.gidenler.com/kurallar/)";
const DELAY = 1000, PAGES = 6, IMAGES = 14, MIN_W = 600;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const fold = (s) => (s ?? "").toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

async function get(url, { binary = false, tries = 2 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, accept: binary ? "image/*" : "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * (i + 1)); if (i + 1 < tries) continue; }
      if (!r.ok) return { status: r.status };
      if (binary) { const b = Buffer.from(await r.arrayBuffer()); return { status: r.status, body: b, url: r.url, type: r.headers.get("content-type") ?? "" }; }
      return { status: r.status, body: await r.text(), url: r.url, type: r.headers.get("content-type") ?? "" };
    } catch (e) { if (i + 1 >= tries) return { status: 0, error: e.name }; await sleep(1500); }
  }
  return { status: 0 };
}

/** Basit robots.txt: "*" ve kendi adımız için Disallow öneki. */
export function robotsAllows(txt, path) {
  let on = false, rules = [];
  for (const raw of (txt ?? "").split(/\r?\n/)) {
    const l = raw.replace(/#.*/, "").trim(); const m = l.match(/^(user-agent|disallow|allow):\s*(.*)$/i); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") on = v === "*" || /gidenler/i.test(v);
    else if (on && v) rules.push({ allow: k === "allow", p: v });
  }
  const best = rules.filter((r) => path.startsWith(r.p.replace(/\*.*$/, ""))).sort((a, b) => b.p.length - a.p.length)[0];
  return !best || best.allow;
}

const NAV = /(galeri|gallery|fotograf|photo|hakkimizda|hakkinda|about|menu|menü|basin|press|medya|media|subeler|sube|iletisim|contact)/i;
export const pageLinks = (html, base) => { const out = new Set(); const host = new URL(base).host; for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)) { try { const u = new URL(m[1], base); if (u.host === host && NAV.test(decodeURIComponent(u.pathname))) out.add(u.href); } catch { /* yok */ } } return [...out]; };
export function imageUrls(html, base) {
  const out = new Map();
  const add = (src, alt = "") => { try { const u = new URL(src.trim(), base); if (!/^https?:$/.test(u.protocol) || /\.svg|\.gif|data:/i.test(u.href)) return; if (!out.has(u.href)) out.set(u.href, alt); } catch { /* yok */ } };
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)/gi)) add(m[1], "og");
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const t = m[0], alt = t.match(/alt=["']([^"']*)/i)?.[1] ?? "";
    const set = t.match(/(?:data-)?srcset=["']([^"']+)/i)?.[1];
    const best = set?.split(",").map((s) => s.trim().split(/\s+/)).sort((a, b) => parseInt(b[1] ?? 0) - parseInt(a[1] ?? 0))[0]?.[0];
    const src = best ?? t.match(/(?:data-src|data-lazy-src|src)=["']([^"']+)/i)?.[1];
    if (src) add(src, alt);
  }
  for (const m of html.matchAll(/background(?:-image)?:\s*url\(["']?([^"')]+\.(?:jpe?g|png|webp))/gi)) add(m[1]);
  return [...out].map(([url, alt]) => ({ url, alt }));
}
const WORDS = { yemek: /yemek|food|dish|pide|kebap|kebab|meze|balik|fish|tabak|pizza|lahmacun|tatli|dessert|menu|sushi|burger|kofte|et\b|steak|breakfast|kahvalti|coffee|kahve/, ic: /ic mekan|interior|salon|masa|indoor|atmosfer|ambiance|restoran ici/, dis: /dis cephe|exterior|facade|giris|entrance|tabela|bahce|teras|terrace|storefront/ };
const BAD = /logo|icon|ikon|favicon|sprite|banner[-_]?ad|placeholder|avatar|flag|bayrak|payment|odeme|visa|mastercard|qr|whatsapp|instagram|facebook|tripadvisor|badge|sertifika|harita|map\b|arrow|bg[-_]|pattern|loading|yukleniyor/;
export const guessKind = (t) => { const f = fold(t); for (const [k, re] of Object.entries(WORDS)) if (re.test(f)) return k; return "belirsiz"; };

export async function measure(buf) {
  const img = sharp(buf, { failOn: "none" }); const m = await img.metadata(); const st = await img.stats();
  const small = await sharp(buf, { failOn: "none" }).resize(9, 8, { fit: "fill" }).grayscale().raw().toBuffer();
  let bits = ""; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += small[y * 9 + x] < small[y * 9 + x + 1] ? "1" : "0";
  return { w: m.width ?? 0, h: m.height ?? 0, alpha: !!m.hasAlpha, sharp: +(st.sharpness ?? 0).toFixed(2), entropy: +(st.entropy ?? 0).toFixed(2), hash: BigInt("0b" + bits).toString(16).padStart(16, "0"), bright: Math.round(st.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3) };
}
/** 0–100. Yüz, filigran ölçülmez. */
export function score(m, kind) {
  let s = 0;
  s += m.w >= 1600 ? 35 : m.w >= 1200 ? 30 : m.w >= 900 ? 20 : 10;
  const r = m.w / Math.max(1, m.h); s += r >= 1.2 && r <= 2 ? 20 : r >= 0.9 && r < 1.2 ? 10 : 2;
  s += Math.min(20, m.entropy * 3); s += m.sharp >= 2 ? 15 : m.sharp >= 1 ? 8 : 0;
  s += m.bright >= 40 && m.bright <= 215 ? 5 : 0; s += kind !== "belirsiz" ? 5 : 0;
  return Math.round(s);
}

export async function scanVenue(v, seen = {}) {
  const res = { slug: v.slug, name: v.name, website: v.website ?? null, instagram: v.instagram ?? null, instagramDogrulandi: false, durum: "site_yok", sayfa: 0, adaylar: [], not: [] };
  if (!v.website || /instagram|facebook|yemeksepeti|getir|trendyol/.test(v.website)) return res;
  const root = await get(v.website);
  if (!root.body) { res.durum = root.error ? `erisilemedi_${root.error}` : `http_${root.status}`; return res; }
  const base = root.url; const origin = new URL(base).origin;
  const robots = (await get(`${origin}/robots.txt`, { tries: 1 })).body ?? "";
  if (!robotsAllows(robots, new URL(base).pathname)) { res.durum = "robots_engeli"; return res; }
  const fp = createHash("sha1").update(root.body).digest("hex");
  res.parmakIzi = fp;
  if (seen[v.slug] === fp) { res.durum = "degismedi"; return res; }
  const text = fold(root.body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " "));
  const toks = fold(v.name).split(" ").filter((t) => t.length > 2 && !/^(restaurant|restoran|lokanta|lokantasi|cafe|kafe|bistro|by)$/.test(t));
  const titleHost = fold((root.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") + " " + new URL(base).host);
  res.adUyumu = toks.length ? toks.filter((t) => titleHost.includes(t) || text.includes(t)).length / toks.length : 0;
  if (/casino|1win|pinco|bahis|slot oyun|mostbet/i.test(text)) { res.durum = "site_supheli"; res.not.push("Sayfada kumar içeriği"); return res; }
  /* Instagram: yalnız resmî sitenin verdiği bağlantı. Instagram'a istek atılmaz. */
  const igs = [...root.body.matchAll(/instagram\.com\/([A-Za-z0-9_.]{2,30})/g)].map((m) => m[1].toLowerCase()).filter((h) => !/^(p|reel|explore|accounts|share)$/.test(h));
  if (igs.length) { res.instagram = igs[0]; res.instagramDogrulandi = true; }
  const pages = [base, ...pageLinks(root.body, base)].slice(0, PAGES); const pool = new Map(); let branch = text.includes(fold(v.district ?? "-"));
  for (const [i, p] of pages.entries()) {
    if (!robotsAllows(robots, new URL(p).pathname)) continue;
    const pg = i === 0 ? root : (await sleep(DELAY), await get(p));
    if (!pg.body || !/html/.test(pg.type)) continue;
    res.sayfa++; if (fold(pg.body.replace(/<[^>]+>/g, " ")).includes(fold(v.district ?? "-"))) branch = true;
    for (const im of imageUrls(pg.body, pg.url)) if (!pool.has(im.url)) pool.set(im.url, { ...im, sayfa: pg.url });
  }
  res.subeKaniti = branch;
  const list = [...pool.values()].filter((x) => !BAD.test(fold(x.url + " " + x.alt))).slice(0, IMAGES * 2);
  const hashes = new Set();
  for (const im of list) {
    if (res.adaylar.length >= IMAGES) break;
    await sleep(300); const g = await get(im.url, { binary: true, tries: 1 });
    if (!g.body || !/image/.test(g.type) || g.body.length < 15000) continue;
    let m; try { m = await measure(g.body); } catch { continue; }
    if (m.w < MIN_W || m.w / Math.max(1, m.h) > 3.2 || m.w / Math.max(1, m.h) < 0.45) continue;
    if (hashes.has(m.hash)) continue; hashes.add(m.hash);
    const tur = guessKind(`${im.url} ${im.alt} ${im.sayfa}`);
    res.adaylar.push({ url: im.url, sayfa: im.sayfa, alt: im.alt.slice(0, 160), tur, ...m, puan: score(m, tur), kaynakTuru: "resmi_site", hak: "bilinmiyor", kontrol: new Date().toISOString().slice(0, 10) });
  }
  res.adaylar.sort((a, b) => b.puan - a.puan); res.durum = res.adaylar.length ? "aday_var" : "aday_yok";
  return res;
}

/** Siteler arası kopya: aynı görsel iki ayrı işletmede → şablon ya da stok kuşkusu; puan düşer, editör görür. */
export function markCopies(result) {
  const by = new Map(); for (const r of result) for (const a of r.adaylar) by.set(a.hash, [...(by.get(a.hash) ?? []), r.slug]);
  for (const r of result) for (const a of r.adaylar) if (new Set(by.get(a.hash)).size > 1) { a.kopya = true; a.puan = Math.max(0, a.puan - 40); }
  return result;
}

if (process.argv[1]?.endsWith("foto-kesif.mjs")) {
  const [, , inp, out, st] = process.argv;
  const list = JSON.parse(readFileSync(inp, "utf8")); const seen = st && existsSync(st) ? JSON.parse(readFileSync(st, "utf8")) : {};
  const result = [];
  for (const v of list) { const r = await scanVenue(v, seen); result.push(r); if (r.parmakIzi) seen[v.slug] = r.parmakIzi; console.log(`${v.slug} · ${r.durum} · ${r.adaylar.length}`); }
  markCopies(result);
  writeFileSync(out, JSON.stringify(result, null, 1)); if (st) writeFileSync(st, JSON.stringify(seen));
}
