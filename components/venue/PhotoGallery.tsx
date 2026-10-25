"use client";

import { useState } from "react";
import type { VenuePhoto } from "@/lib/types";

const CATS: Array<{ key: VenuePhoto["category"] | "all"; label: string }> = [
  { key: "all", label: "Tümü" }, { key: "yemek", label: "Yemek" }, { key: "ic", label: "İç mekân" },
  { key: "dis", label: "Dış cephe" }, { key: "menu", label: "Menü" }, { key: "icecek", label: "İçecek" },
];

/* Tabelog'un kategorili fotoğraf sekmeleri. Her görselde sahip + lisans; büyük hâli kaynağında açılır. */
export function PhotoGallery({ photos, name }: { photos: VenuePhoto[]; name: string }) {
  const [cat, setCat] = useState<(typeof CATS)[number]["key"]>("all");
  const present = CATS.filter((c) => c.key === "all" || photos.some((p) => p.category === c.key));
  const shown = cat === "all" ? photos : photos.filter((p) => p.category === cat);

  if (!photos.length) {
    return (
      <div className="flex flex-col items-start gap-2 border border-dashed border-line-2 p-5">
        <span className="text-[15px] font-bold">Henüz izinli fotoğraf yok</span>
        <p className="max-w-[52ch] text-[13px] leading-relaxed text-ink-2">
          {name} için fotoğraflar işletme ya da gidenler tarafından eklenince burada, sahibinin adıyla görünecek. O zamana kadar 360° sokak görünümüne ve işletmenin Instagram hesabına bakabilirsin.
        </p>
        <p className="text-[11.5px] text-ink-3">Başka sitelerden kopyalanmış görsel kullanmıyoruz.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {present.length > 2 && (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Fotoğraf türü">
          {present.map((c) => (
            <button key={c.key} role="tab" aria-selected={cat === c.key} onClick={() => setCat(c.key)}
              className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${cat === c.key ? "border-ink bg-ink text-paper" : "border-line-2 text-ink-2 hover:border-ink"}`}>
              {c.label} <span className="tnum opacity-60">{c.key === "all" ? photos.length : photos.filter((p) => p.category === c.key).length}</span>
            </button>
          ))}
        </div>
      )}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {shown.map((p, i) => (
          <li key={p.src} className={`group relative overflow-hidden bg-sheet ${shown.length === 1 ? "col-span-2 sm:col-span-3" : i === 0 && shown.length > 2 ? "col-span-2 row-span-2" : ""}`}>
            <a href={p.sourceUrl ?? p.src} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            </a>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-4 text-[10.5px] text-white">
              {p.credit}{p.license ? ` · ${p.license}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
