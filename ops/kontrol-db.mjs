const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
for (const h of ["gidenler-git-feature-investor-v1-hulu34.vercel.app", "gidenler-c54v05xgg-hulu34.vercel.app", "gidenler-git-gorsel-restoran-profil-v1-hulu34.vercel.app"]) {
  const r = await (await fetch(`https://${h}/api/admin/google-puan/?rapor=gunluk`, { headers: H })).json().catch(() => ({}));
  const k = await (await fetch(`https://${h}/api/admin/google-puan/?rapor=kimlik`, { headers: H })).json().catch(() => ({}));
  const d = await (await fetch(`https://${h}/api/admin/db/`, { headers: H })).json().catch(() => ({}));
  console.log(h.slice(9, 40), JSON.stringify({ env: r.env, shown: r.site?.shown, kimlikMekan: Object.keys(k.ids ?? {}).length, lastImport: r.lastImport?.at, db: d.env, places: d.places ?? d.counts?.places ?? null, dbName: d.database ?? d.branch ?? null }));
}
