import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/* Paylaşım kartı (WhatsApp, Instagram DM, X, iMessage). Derleme sırasında bir kez üretilir; kendi görseli olmayan her sayfada
   kullanılır. Marka: beyaz zemin, mürekkep siyahı, Instrument Serif; vurgu mavisi yalnız "en son"da (ana sayfa başlığı gibi). */
export const alt = "Gidenler — İstanbul'da en son nerede yemek yedin?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (f: string) => readFile(join(process.cwd(), "node_modules/@fontsource/instrument-serif/files", f));

export default async function OgImage() {
  const [latin, ext, latinI, extI] = await Promise.all([
    font("instrument-serif-latin-400-normal.woff"), font("instrument-serif-latin-ext-400-normal.woff"),
    font("instrument-serif-latin-400-italic.woff"), font("instrument-serif-latin-ext-400-italic.woff"),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", color: "#141310", padding: "64px 76px", fontFamily: "IS, ISX" }}>
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 64, lineHeight: 1 }}>
          gidenler<span style={{ color: "#2b2ac4" }}>.</span>
          <span style={{ marginLeft: 22, fontSize: 40, fontStyle: "italic", color: "#2b2ac4" }}>bilir.</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", fontSize: 112, lineHeight: 1.02, letterSpacing: -2, maxWidth: 1040 }}>
          <span style={{ marginRight: 26 }}>İstanbul&apos;da</span>
          <span style={{ fontStyle: "italic", color: "#2b2ac4", marginRight: 26 }}>en son</span>
          <span>nerede yemek yedin?</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "4px solid #141310", paddingTop: 22, fontSize: 34 }}>
          <span>Gittiğin yeri bul. Deneyimini paylaş.</span>
          <span style={{ fontSize: 30 }}>www.gidenler.com</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "IS", data: latin, style: "normal", weight: 400 }, { name: "ISX", data: ext, style: "normal", weight: 400 },
        { name: "IS", data: latinI, style: "italic", weight: 400 }, { name: "ISX", data: extI, style: "italic", weight: 400 },
      ],
    },
  );
}
