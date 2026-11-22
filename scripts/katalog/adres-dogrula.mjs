/* ADRES DOĞRULAMA (paket 19+): Overture adres metninden çıkarılan "<sokak> No:<kapı>" resmî sitede BİRLİKTE geçiyor mu?
   Sokak adının ayırt edici sözcükleri (Cad./Sok. gibi tür sözcükleri hariç) ve kapı numarası aynı pencerede (sokak adının 60 karakter öncesi – 200 karakter sonrası; "No:47/A Fetih Cd." gibi numara önce de yazılabilir) aranır.
   Kullanım: node scripts/katalog/adres-dogrula.mjs <aday.json> <id-listesi.json> <cikti.json>
   Nazik tarama: alan adı başına sırayla ana sayfa + en çok 6 iletişim/hakkımızda bağlantısı + 2 yaygın yol; aynı anda 6 alan adı.
   Sayfa içeriği saklanmaz; yalnız sonuç (ok, sayfa, aranan adres). */
import { readFileSync, writeFileSync, existsSync } from "node:fs"; import { execFile } from "node:child_process"; import { promisify } from "node:util";
import { ovAdres } from "./ov-adres.mjs";
const ex = promisify(execFile); const [adayP, idsP, out] = process.argv.slice(2);
const A = new Map(JSON.parse(readFileSync(adayP, "utf8")).map((a) => [a.id, a])); const IDS = JSON.parse(readFileSync(idsP, "utf8"));
const prev = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};
const fold = (s) => (s ?? "").toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const ent = { uuml: "ü", Uuml: "Ü", ouml: "ö", Ouml: "Ö", ccedil: "ç", Ccedil: "Ç", nbsp: " ", amp: "&", quot: '"', rsquo: "'", lsquo: "'" };
const dec = (s) => (s ?? "").replace(/&([a-zA-Z]+);/g, (m, n) => ent[n] ?? m).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
const strip = (h) => dec(h.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const TYPE = new Set(["caddesi", "cadde", "cad", "cd", "sokak", "sokagi", "sok", "sk", "bulvari", "bulvar", "blv", "bul", "yolu", "yokusu", "ykş", "yks", "meydani", "asf", "asfalti", "mahallesi", "mah", "mh", "blok", "no"]);
async function get(u) { try { const { stdout } = await ex("curl", ["-sSL", "--http1.1", "-m", "20", "--max-filesize", "4000000", "-A", "Mozilla/5.0 (compatible; GidenlerKatalog/1.0; +https://www.gidenler.com/)", "-H", "Accept-Language: tr,en", "-w", "\n@@%{http_code} %{url_effective}", u], { maxBuffer: 3e7 }); const i = stdout.lastIndexOf("\n@@"); const [c, e] = stdout.slice(i + 3).split(" "); return { status: +c, url: e, html: +c < 400 ? stdout.slice(0, i) : "" }; } catch { return { status: 0, html: "" }; } }
const res = { ...prev }; const todo = IDS.filter((id) => !prev[id] && A.get(id)); let i = 0;
async function worker() { while (i < todo.length) { const id = todo[i++]; const a = A.get(id); const adres = ovAdres(a.adres);
  if (!adres) { res[id] = { ok: false, adres: null, neden: "Overture metninden sokak + kapı no çıkarılamadı" }; continue; }
  const [st, no] = adres.split(" No:"); const core = fold(st).split(" ").filter((w) => w.length >= 3 && !TYPE.has(w) && !/^\d+$/.test(w)); const noD = no.replace(/\D.*$/, "");
  const numCore = fold(st).split(" ").filter((w) => /^\d+$/.test(w)); /* "1490. Sk." gibi numaralı sokak */
  const home = await get(a.site); const pages = [home]; let host; try { host = new URL(home.url).host; } catch {}
  if (home.html && host) { const links = [...new Set([...home.html.matchAll(/href=["']([^"'#]+)["']/gi)].map((x) => { try { return new URL(dec(x[1]), home.url).toString(); } catch { return null; } }).filter((u) => u && new URL(u).host === host && /iletisim|contact|bize-?ulas|ulasim|adres|lokasyon|location|hakkimizda|about|subeler|sube/i.test(u) && !/\.(pdf|jpe?g|png|webp|zip)(\?|$)/i.test(u)))].slice(0, 6);
    for (const p of ["/iletisim", "/contact"]) { const u = new URL(p, home.url).toString(); if (!links.some((l) => l.toLowerCase().includes(p.slice(1)))) links.push(u); }
    for (const u of links) { const p = await get(u); if (p.html && p.url && new URL(p.url).host === host) pages.push(p); } }
  let hit = null;
  for (const p of pages) { if (!p.html) continue; const f = " " + fold(strip(p.html)) + " ";
    if (!(core.length ? core : numCore).length) break;
    const first = (core.length ? core : numCore)[0]; let k = -1;
    while ((k = f.indexOf(" " + first, k + 1)) >= 0) { const w = f.slice(Math.max(0, k - 60), k + 200); if ([...core, ...numCore].every((x) => w.includes(" " + x)) && new RegExp(`(^|\\D)${noD}(\\D|$)`).test(w)) { hit = p.url; break; } }
    if (hit) break; }
  res[id] = { ok: !!hit, adres, sayfa: hit, sayfaSayisi: pages.filter((p) => p.html).length, tarih: "2026-11-12", ...(hit ? {} : { neden: "yazılacak sokak + kapı no resmî sitede birlikte bulunmadı" }) }; } }
await Promise.all(Array.from({ length: 6 }, worker));
writeFileSync(out, JSON.stringify(res, null, 1)); const v = IDS.map((x) => res[x]).filter(Boolean); console.log("denenen", v.length, "doğrulanan", v.filter((x) => x.ok).length, "adres çıkarılamadı", v.filter((x) => !x.adres).length);
