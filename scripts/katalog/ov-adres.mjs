/* Overture adres metninden sokak + kapı no (paket 19+; paket-overture.mjs ve adres-dogrula.mjs ortak kullanır).
   Sokak türü sözcüğü (Cad./Sok./Bulvar/Yolu/Asf....) kapı numarasından HEMEN önce gelmeli; yoksa adres çıkarılmaz. */
export const ovParse = (ovAdr) => {
  for (const seg of ovAdr.split(",").map((x) => x.trim())) {
    const m = seg.match(/^(.*?(?<![\p{L}])(?:Cad(?:desi)?|Cd|Sok(?:ak|ağı)?|Sk|Bulvar(?:ı)?|Blv|Bul|Yolu|Yokuşu|Ykş|Meydanı|Asf(?:altı)?)\.?(?:\s+[A-Za-z0-9]{1,3}\.?\s*Blok\.?)?)\s*(?:No\s*[:.]?\s*)?(\d+[A-Za-z]?(?:\s*\/\s*[0-9A-Za-z]+)?)(?![\p{L}\p{N}])/iu);
    if (m) return [m[0], m[1].trim(), m[2]]; }
  return null; };
/* kayda yazılacak biçim: "<sokak> No:<kapı>" */
export const ovAdres = (ovAdr) => { const m = ovParse((ovAdr ?? "").replace(/\s+/g, " ").trim()); return m && m[1].trim().length >= 4 ? `${m[1].trim().replace(/[,.]$/, "")} No:${m[2].replace(/\s+/g, "")}` : null; };
