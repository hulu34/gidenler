/** Yalnız Preview: sunuculu kaynak ağacını değiştirmeden GitHub Pages çıktısı üretir. */
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = "/gidenler";
const target = join(root, "preview-pages");
if (process.env.GITHUB_ACTIONS && !process.env.GITHUB_REF?.startsWith("refs/heads/preview/")) {
  throw new Error("Pages önizlemesi yalnız preview/ dalından yayımlanabilir.");
}
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const stage = await mkdtemp(join(tmpdir(), "gidenler-pages-preview-"));
const ignored = new Set([".git", ".next", ".vercel", ".openai", "node_modules", "out", "preview-pages", "tmp", "output", ".DS_Store"]);
const replace = async (path, before, after) => {
  const file = join(stage, path);
  const text = await readFile(file, "utf8");
  if (!text.includes(before)) throw new Error(`Preview uyarlama noktası bulunamadı: ${path}`);
  await writeFile(file, text.replace(before, after));
};
try {
  await cp(root, stage, {
    recursive: true,
    filter: (path) => {
      const rel = relative(root, path);
      return !ignored.has(rel.split(/[\\/]/)[0]) && !basename(path).startsWith(".env");
    },
  });
  await symlink(join(root, "node_modules"), join(stage, "node_modules"), "dir");

  // API .ts dosyaları mevcut export yapılandırmasında zaten rota olarak derlenmez;
  // testlerin tür denetimi için kaynakta kalır. Sunucu sayfaları yalnız kopyadan çıkarılır.
  for (const path of ["app/yonetim", "app/isletme", "app/[username]", "app/pasaport", "app/liste"]) {
    await rm(join(stage, path), { recursive: true, force: true });
  }
  // Tam kaynak tür denetimi workflow'da ayrıca çalışır. Statik kopyada, çıkarılan
  // sunucu sayfalarını doğrudan içe aktaran test betikleri uygulama derlemesine girmez.
  const tsconfig = JSON.parse(await readFile(join(stage, "tsconfig.json"), "utf8"));
  tsconfig.exclude = [...(tsconfig.exclude ?? []), "scripts"];
  await writeFile(join(stage, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));
  await replace("app/opengraph-image.tsx", "export const contentType", 'export const dynamic = "force-static";\nexport const contentType');
  await replace("app/mekan/[slug]/fotograflar/page.tsx", 'import Link from "next/link";', 'import Link from "next/link";\nimport { realVenueRecords } from "@/data/real";');
  await replace("app/mekan/[slug]/fotograflar/page.tsx", "export function generateStaticParams() { return []; }", "export function generateStaticParams() { return realVenueRecords.map(({ slug }) => ({ slug })); }");
  await replace("app/mekan/[slug]/fotograflar/page.tsx", "export const dynamicParams = true;", "export const dynamicParams = false;");
  await replace("app/layout.tsx", "...(DEMO_VISIBLE ? { robots:", "...(true ? { robots:");
  await replace("app/layout.tsx", "{!DEMO_VISIBLE && <AccountSync />}", "{/* Pages önizlemesinde hesap eşitlemesi yok. */}");
  await replace("app/layout.tsx", '<Header showSeckisi={seckiNavVisible()} />', `<Header showSeckisi={seckiNavVisible()} />
        <div role="note" className="border-b border-line bg-sheet px-5 py-2 text-center text-[12px] text-ink-2">
          Toplantı önizlemesi · Hesap, deneyim gönderimi ve rezervasyon işlemleri bu sürümde kullanılamaz.
        </div>`);

  // Anahtarlar ve veri bağlantıları statik derlemeye aktarılmaz.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(?:DATABASE|POSTGRES|PG|NEON|AUTH|BETTER_AUTH|GOOGLE|UPSTASH|REDIS|KV_|AI_|OPENAI|ANTHROPIC|GEMINI|MISTRAL|R2_|S3_|AWS_)/.test(key)));
  Object.assign(env, { NEXT_OUTPUT: "export", NEXT_BASE_PATH: base, NEXT_PUBLIC_SHOW_DEMO: "false", VERCEL_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" });
  const build = spawnSync("npm", ["run", "build"], { cwd: stage, env, stdio: "inherit" });
  if (build.status !== 0) throw new Error(`Pages derlemesi başarısız (${build.status}). Kopya: ${stage}`);

  const output = join(stage, "out");
  const visit = async (dir) => {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, item.name);
      if (item.isDirectory()) { await visit(path); continue; }
      if (!/\.(?:html|txt|js|css|json)$/.test(item.name)) continue;
      const text = await readFile(path, "utf8");
      // HTML, RSC ve istemci dosyaları birlikte uyarlanır; hidratasyonda yollar değişmez.
      const fixed = text.replace(/(?<![\w/.-])\/(media\/|seckisi\/gorsel\/)/g, `${base}/$1`);
      if (fixed !== text) await writeFile(path, fixed);
    }
  };
  await visit(output);
  await writeFile(join(output, ".nojekyll"), "");
  await writeFile(join(output, "robots.txt"), "User-agent: *\nDisallow: /\n");
  await writeFile(join(output, "preview.json"), JSON.stringify({ purpose: "secki-pages-preview", sourceCommit, basePath: base, readOnly: true }, null, 2));

  const secki = await readFile(join(output, "seckisi/index.html"), "utf8");
  const picks = ["japon-erdal-beyoglu", "menemen-besiktas", "neolokal-beyoglu", "nicole-beyoglu", "mikla-turkey-fusion-beyoglu", "yeni-lokanta-beyoglu"];
  for (const slug of picks) {
    if (!secki.includes(`${base}/mekan/${slug}/`) || !existsSync(join(output, `mekan/${slug}/index.html`))) throw new Error(`Seçki profil bağlantısı eksik: ${slug}`);
  }
  for (const photo of ["japon-erdal-dis-cephe-1246.jpg", "japon-erdal-cift-yumurtali-1206.jpg"]) {
    if (!secki.includes(`${base}/media/foto/${photo}`) || !existsSync(join(output, `media/foto/${photo}`))) throw new Error(`Kapak dosyası/yolu eksik: ${photo}`);
  }
  if (!secki.includes('name="robots" content="noindex') || existsSync(join(output, "api")) || existsSync(join(output, "yonetim"))) throw new Error("Statik Preview izolasyonu doğrulanamadı.");

  if (existsSync(target)) {
    const previous = JSON.parse(await readFile(join(target, "preview.json"), "utf8"));
    if (previous.purpose !== "secki-pages-preview") throw new Error("Mevcut çıktı bu betiğe ait değil; üzerine yazılmadı.");
    await rename(target, join(stage, "previous-output"));
  }
  await mkdir(dirname(target), { recursive: true });
  await cp(output, target, { recursive: true });
  console.log(`Pages Preview hazır: ${target} · kaynak ${sourceCommit} · 6 profil ve 2 kapak doğrulandı`);
  await rm(stage, { recursive: true, force: true });
} catch (error) {
  console.error(`Geçici derleme kopyası korundu: ${stage}`);
  throw error;
}
