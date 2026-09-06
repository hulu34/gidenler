import type { ReactNode } from "react";
import type { Entity } from "@/lib/types";

/**
 * ENTITY GÖRSEL SİSTEMİ
 * Gerçek görsel varsa onu gösterir; yoksa kategoriye duyarlı, nötr, tonal bir "plaka".
 * Kural: baş harf yok, hash'ten renk yok. Tüm plakalar aynı kâğıt/mürekkep paletinde;
 * kategori kompozisyonla ayrışır (sofra, fincan, cephe, perde, koltuk sırası, film karesi…).
 * Kompozisyon varyantı (3) kimlikten türetilir — renk değil, yalnızca yerleşim.
 * Ortak gradient/filtre tanımları <VisualDefs /> ile kök düzende bir kez basılır.
 */

export type VisualFamily =
  | "dining" | "cafe" | "hotel" | "bar" | "place" | "culture" | "show" | "venue"
  | "travel" | "film" | "service" | "professional";

const FAMILY_OF: Record<string, VisualFamily> = {
  "cat.restaurant": "dining", "cat.cafe": "cafe", "cat.hotel": "hotel", "cat.bar": "bar",
  "cat.place": "place", "cat.culture": "culture", "cat.show": "show", "cat.venue": "venue",
  "cat.travel": "travel", "cat.film": "film", "cat.service": "service",
  "cat.physician": "professional", "cat.dentist": "professional", "cat.lawyer": "professional",
};

export function visualFamily(e: Pick<Entity, "categoryId" | "subcategory">): VisualFamily {
  const base = FAMILY_OF[e.categoryId] ?? "place";
  const sub = e.subcategory ?? "";
  if (base === "show" && sub === "Sergi") return "culture";
  if (base === "venue" && sub === "Sinema") return "film";
  if (base === "place" && (sub === "Sahil" || sub === "Park / Koru")) return "travel";
  return base;
}

/** Yalnızca yerleşim varyantı (0..2). Renk üretmez. */
function variantOf(id: string): 0 | 1 | 2 {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 3) as 0 | 1 | 2;
}

/** Sayfa başına bir kez: ışık, vinyet ve tanecik. Renkler tasarım token'larından. */
export function VisualDefs() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <linearGradient id="gv-paper" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="var(--paper)" />
          <stop offset="1" stopColor="var(--sunk)" />
        </linearGradient>
        <radialGradient id="gv-light" cx="0.35" cy="0.25" r="0.75">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gv-vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="var(--ink)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0.16" />
        </radialGradient>
        <linearGradient id="gv-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ink)" stopOpacity="0.02" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0.12" />
        </linearGradient>
        <filter id="gv-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.075  0 0 0 0 0.06  0 0 0 0.09 0" />
        </filter>
        <filter id="gv-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
    </svg>
  );
}

/* ── Sahneler: 400×300 viewBox. Mürekkep = currentColor, dolgular düşük opak. ── */
type Draw = (v: 0 | 1 | 2) => ReactNode;
const S = { stroke: "currentColor", fill: "none", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const F = (o: number) => ({ fill: "currentColor", stroke: "none", opacity: o });

const DRAW: Record<VisualFamily, Draw> = {
  /* Sofra: keten örtü dokusu, tabak gölgesi, çatal-bıçak silüeti */
  dining: (v) => {
    const cx = [200, 178, 222][v];
    return (
      <>
        <rect x={0} y={150} width={400} height={150} fill="url(#gv-ground)" />
        {[170, 200, 230, 260].map((y) => <line key={y} x1={0} y1={y} x2={400} y2={y} {...S} strokeWidth={1} opacity={0.08} />)}
        <ellipse cx={cx + 8} cy={176} rx={98} ry={62} {...F(0.1)} filter="url(#gv-soft)" />
        <ellipse cx={cx} cy={166} rx={92} ry={58} fill="#fff" opacity={0.85} />
        <ellipse cx={cx} cy={166} rx={92} ry={58} {...S} opacity={0.45} />
        <ellipse cx={cx} cy={166} rx={66} ry={41} {...S} opacity={0.22} />
        <ellipse cx={cx - 6} cy={160} rx={30} ry={17} {...F(0.16)} />
        <ellipse cx={cx + 18} cy={172} rx={16} ry={9} {...F(0.1)} />
        <path d={`M${cx - 136} 100 v40 M${cx - 126} 100 v40 M${cx - 116} 100 v40 M${cx - 136} 140 q10 14 20 0 M${cx - 126} 148 v96`} {...S} opacity={0.55} />
        <path d={`M${cx + 122} 100 q24 30 4 80 v64`} {...S} opacity={0.55} />
        <path d={`M${cx + 122} 100 q24 30 4 80 h-6 q14 -46 -4 -80 z`} {...F(0.18)} />
      </>
    );
  },
  /* Kafe: fincan, tabak, buhar, tezgâh ışığı */
  cafe: (v) => {
    const dx = [0, -24, 26][v];
    return (
      <>
        <rect x={0} y={214} width={400} height={86} fill="url(#gv-ground)" />
        <ellipse cx={196 + dx} cy={222} rx={112} ry={16} {...F(0.12)} filter="url(#gv-soft)" />
        <ellipse cx={196 + dx} cy={216} rx={104} ry={13} fill="#fff" opacity={0.85} />
        <ellipse cx={196 + dx} cy={216} rx={104} ry={13} {...S} opacity={0.4} />
        <path d={`M${122 + dx} 126 h148 v56 a74 44 0 0 1 -148 0 z`} fill="#fff" opacity={0.9} />
        <path d={`M${122 + dx} 126 h148 v56 a74 44 0 0 1 -148 0 z`} {...S} opacity={0.5} />
        <ellipse cx={196 + dx} cy={126} rx={74} ry={12} {...F(0.22)} />
        <ellipse cx={196 + dx} cy={126} rx={74} ry={12} {...S} opacity={0.35} />
        <path d={`M${270 + dx} 138 h22 a26 26 0 0 1 0 52 h-26`} {...S} opacity={0.5} />
        <path d={`M${166 + dx} 104 q-12 -14 0 -30 q12 -14 0 -30`} {...S} opacity={0.3} />
        <path d={`M${196 + dx} 108 q-12 -14 0 -30 q12 -14 0 -30`} {...S} opacity={0.22} />
        <path d={`M${226 + dx} 104 q-12 -14 0 -30 q12 -14 0 -30`} {...S} opacity={0.3} />
      </>
    );
  },
  /* Otel: cephe, ışıklı pencereler, tente, giriş */
  hotel: (v) => {
    const w = [208, 240, 184][v];
    const x = 200 - w / 2;
    const cols = Math.round(w / 40);
    const cw = (w - 28) / cols;
    const win: ReactNode[] = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < cols; c++) {
      const lit = (r + c * 2 + v) % 5 === 0;
      win.push(<rect key={`${r}-${c}`} x={x + 14 + c * cw + 5} y={66 + r * 44} width={cw - 10} height={28} fill={lit ? "#fff" : "currentColor"} opacity={lit ? 0.9 : 0.14} />);
    }
    return (
      <>
        <rect x={0} y={250} width={400} height={50} fill="url(#gv-ground)" />
        <rect x={x - 40} y={80} width={40} height={170} {...F(0.06)} />
        <rect x={x + w} y={110} width={46} height={140} {...F(0.06)} />
        <rect x={x} y={48} width={w} height={202} {...F(0.09)} />
        <rect x={x} y={48} width={w} height={202} {...S} opacity={0.45} />
        <path d={`M${x - 14} 48 h${w + 28}`} {...S} opacity={0.5} />
        {win}
        <path d={`M${200 - 40} 232 h80 l6 -14 h-92 z`} {...F(0.28)} />
        <rect x={200 - 22} y={214} width={44} height={36} fill="#fff" opacity={0.9} />
        <rect x={200 - 22} y={214} width={44} height={36} {...S} opacity={0.4} />
      </>
    );
  },
  /* Bar: arka bar rafı, şişeler, kadeh, tezgâh */
  bar: (v) => {
    const dx = [0, -18, 20][v];
    return (
      <>
        <rect x={0} y={0} width={400} height={300} {...F(0.05)} />
        <path d="M40 70 h320 M40 128 h320" {...S} opacity={0.3} />
        {[70, 112, 154, 250, 292, 334].map((bx, i) => <rect key={bx} x={bx + dx / 2} y={i % 2 ? 84 : 78} width={20} height={44} rx={3} {...F(0.16 + (i % 3) * 0.05)} />)}
        <rect x={0} y={236} width={400} height={64} fill="url(#gv-ground)" />
        <path d={`M${152 + dx} 150 h96 l-48 60 z`} fill="#fff" opacity={0.85} />
        <path d={`M${152 + dx} 150 h96 l-48 60 z`} {...S} opacity={0.5} />
        <path d={`M${164 + dx} 166 h72 l-36 44 z`} {...F(0.12)} />
        <path d={`M${200 + dx} 210 v26 M${176 + dx} 236 h48`} {...S} opacity={0.5} />
      </>
    );
  },
  /* Şehir & mekân: siluet, kubbe, kule, deniz */
  place: (v) => {
    const dx = [0, -30, 30][v];
    return (
      <>
        <rect x={0} y={0} width={400} height={300} fill="url(#gv-light)" />
        <path d={`M0 214 v-60 h${44 + dx} v-40 h30 v40 h26 v-70 h22 v-30 h10 v30 h22 v70 h28 v-60 a34 34 0 0 1 68 0 v60 h30 v-48 h32 v48 h${90 - dx} v14 z`} {...F(0.16)} />
        <path d={`M${186 + dx} 156 v-34 M${180 + dx} 128 l6 -12 l6 12`} {...S} opacity={0.45} />
        <rect x={0} y={214} width={400} height={86} fill="url(#gv-ground)" />
        <path d="M0 236 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" {...S} strokeWidth={1.5} opacity={0.25} />
        <path d="M0 262 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" {...S} strokeWidth={1.5} opacity={0.18} />
      </>
    );
  },
  /* Müze & galeri: duvar, çerçeve, spot ışığı */
  culture: (v) => {
    const dx = [0, -26, 26][v];
    return (
      <>
        <rect x={0} y={0} width={400} height={300} fill="url(#gv-light)" />
        <path d={`M${200 + dx} 0 l-120 230 h240 z`} fill="#fff" opacity={0.5} filter="url(#gv-soft)" />
        <rect x={0} y={236} width={400} height={64} fill="url(#gv-ground)" />
        <rect x={124 + dx} y={70} width={152} height={132} {...F(0.14)} />
        <rect x={120 + dx} y={64} width={152} height={132} fill="#fff" opacity={0.95} />
        <rect x={120 + dx} y={64} width={152} height={132} {...S} opacity={0.5} />
        <rect x={134 + dx} y={78} width={124} height={104} {...F(0.08)} />
        <path d={`M${144 + dx} 172 l32 -40 l24 26 l22 -52 l32 66 z`} {...F(0.24)} />
        <circle cx={166 + dx} cy={104} r={10} {...F(0.2)} />
        <rect x={180 + dx} y={214} width={32} height={6} {...F(0.2)} />
      </>
    );
  },
  /* Sahne: perde, spot, sahne zemini */
  show: (v) => {
    const dx = [0, -14, 14][v];
    return (
      <>
        <rect x={0} y={0} width={400} height={300} {...F(0.06)} />
        <path d={`M200 40 l-110 190 h220 z`} fill="#fff" opacity={0.55} filter="url(#gv-soft)" />
        <rect x={0} y={228} width={400} height={72} fill="url(#gv-ground)" />
        <path d="M0 0 h400 v40 h-400 z" {...F(0.2)} />
        <path d={`M0 40 q30 100 ${86 + dx} 130 q-20 40 -30 130 h-56 z`} {...F(0.18)} />
        <path d={`M400 40 q-30 100 ${-86 - dx} 130 q20 40 30 130 h56 z`} {...F(0.18)} />
        <path d={`M20 60 q26 70 ${60 + dx} 100 M380 60 q-26 70 ${-60 - dx} 100`} {...S} opacity={0.2} />
        <circle cx={200} cy={40} r={10} {...F(0.3)} />
        <ellipse cx={200} cy={232} rx={70} ry={8} fill="#fff" opacity={0.7} />
      </>
    );
  },
  /* Salon: koltuk sıraları, ekran/sahne ışığı */
  venue: (v) => {
    const dy = [0, 10, -10][v];
    const rows: ReactNode[] = [];
    for (let r = 0; r < 4; r++) {
      const y = 126 + r * 44 + dy;
      const n = 6 + r;
      const w = 34 - r * 2;
      const gap = (400 - 60) / n;
      for (let i = 0; i < n; i++) rows.push(<rect key={`${r}-${i}`} x={30 + i * gap + (gap - w) / 2} y={y} width={w} height={22} rx={5} {...F(0.16 + r * 0.09)} />);
    }
    return (
      <>
        <rect x={0} y={0} width={400} height={300} {...F(0.05)} />
        <rect x={70} y={44} width={260} height={50} fill="#fff" opacity={0.85} />
        <rect x={70} y={44} width={260} height={50} {...S} opacity={0.3} />
        <path d="M70 94 l-50 206 h360 l-50 -206 z" fill="#fff" opacity={0.25} filter="url(#gv-soft)" />
        {rows}
      </>
    );
  },
  /* Gezi: ufuk, güneş, tepeler, deniz */
  travel: (v) => {
    const sx = [250, 140, 300][v];
    return (
      <>
        <rect x={0} y={0} width={400} height={300} fill="url(#gv-light)" />
        <circle cx={sx} cy={104} r={36} fill="#fff" opacity={0.95} />
        <circle cx={sx} cy={104} r={36} {...S} opacity={0.35} />
        <path d="M0 196 q60 -60 130 -30 t120 -46 t150 40 v50 h-400 z" {...F(0.12)} />
        <path d="M0 210 q80 -40 160 -14 t240 -20 v40 h-400 z" {...F(0.16)} />
        <rect x={0} y={214} width={400} height={86} fill="url(#gv-ground)" />
        <path d="M0 238 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" {...S} strokeWidth={1.5} opacity={0.22} />
        <path d="M0 264 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" {...S} strokeWidth={1.5} opacity={0.16} />
      </>
    );
  },
  /* Film: kare, perforasyon, projeksiyon ışığı */
  film: (v) => {
    const dx = [0, -16, 16][v];
    const holes: ReactNode[] = [];
    for (let i = 0; i < 8; i++) holes.push(<rect key={i} x={40 + i * 44 + dx} y={58} width={22} height={14} rx={2} fill="#fff" opacity={0.9} />, <rect key={`b${i}`} x={40 + i * 44 + dx} y={228} width={22} height={14} rx={2} fill="#fff" opacity={0.9} />);
    return (
      <>
        <rect x={0} y={0} width={400} height={300} {...F(0.08)} />
        <rect x={-20} y={44} width={440} height={212} {...F(0.2)} />
        {holes}
        <rect x={56 + dx} y={86} width={288} height={128} fill="#fff" opacity={0.92} />
        <rect x={56 + dx} y={86} width={288} height={128} fill="url(#gv-light)" />
        <path d={`M${56 + dx} 214 l60 -54 l44 30 l52 -64 l70 62 l62 -40 v66 z`} {...F(0.22)} />
        <circle cx={128 + dx} cy={120} r={12} {...F(0.16)} />
      </>
    );
  },
  /* Hizmet: vitrin, tente, kapı */
  service: (v) => {
    const dx = [0, -20, 20][v];
    return (
      <>
        <rect x={0} y={0} width={400} height={300} fill="url(#gv-light)" />
        <rect x={0} y={250} width={400} height={50} fill="url(#gv-ground)" />
        <rect x={90 + dx} y={126} width={220} height={124} fill="#fff" opacity={0.7} />
        <rect x={90 + dx} y={126} width={220} height={124} {...S} opacity={0.4} />
        <path d={`M${76 + dx} 126 l22 -52 h204 l22 52`} {...F(0.16)} />
        <path d={`M${76 + dx} 126 q22 30 44 0 q22 30 44 0 q22 30 44 0 q22 30 44 0 q22 30 44 0 q22 30 44 0`} {...F(0.22)} />
        <rect x={104 + dx} y={144} width={64} height={70} {...F(0.08)} />
        <rect x={232 + dx} y={144} width={64} height={70} {...F(0.08)} />
        <rect x={178 + dx} y={160} width={44} height={90} {...F(0.2)} />
        <circle cx={214 + dx} cy={206} r={3} fill="#fff" />
      </>
    );
  },
  professional: () => (
    <>
      <rect x={0} y={0} width={400} height={300} fill="url(#gv-light)" />
      <rect x={124} y={68} width={152} height={176} {...F(0.08)} />
      <rect x={120} y={62} width={152} height={176} fill="#fff" opacity={0.9} />
      <rect x={120} y={62} width={152} height={176} {...S} opacity={0.35} />
      <path d="M146 100 h100 M146 126 h100 M146 152 h64 M146 178 h84" {...S} opacity={0.3} />
      <circle cx={240} cy={206} r={12} {...F(0.16)} />
    </>
  ),
};

const RATIO: Record<string, string> = { thumb: "aspect-square", card: "aspect-[4/3]", hero: "aspect-[16/10]", banner: "aspect-[3/1]" };
const VIEW: Record<string, string> = { thumb: "60 40 280 220", card: "0 0 400 300", hero: "0 0 400 300", banner: "0 40 400 220" };

export function EntityVisual({ entity, variant = "card", className = "", priority = false }: {
  entity: Pick<Entity, "id" | "name" | "categoryId" | "subcategory" | "image">;
  variant?: "thumb" | "card" | "hero" | "banner";
  className?: string;
  priority?: boolean;
}) {
  const fam = visualFamily(entity);
  const v = variantOf(entity.id);
  if (entity.image?.src) {
    return (
      <span className={`relative block overflow-hidden bg-sunk ${RATIO[variant]} ${className}`} data-visual="photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={entity.image.src} alt={entity.image.alt ?? entity.name} loading={priority ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover" />
        {entity.image.credit && <span className="absolute bottom-1 right-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/80 mix-blend-difference">{entity.image.credit}</span>}
      </span>
    );
  }
  return (
    <span className={`relative block overflow-hidden bg-sunk text-ink ${RATIO[variant]} ${className}`} data-visual={fam} aria-hidden>
      <svg viewBox={VIEW[variant]} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <rect x={-20} y={-20} width={440} height={340} fill="url(#gv-paper)" />
        {DRAW[fam](v)}
        <rect x={-20} y={-20} width={440} height={340} fill="url(#gv-vignette)" />
        {variant !== "thumb" && <rect x={-20} y={-20} width={440} height={340} filter="url(#gv-grain)" />}
      </svg>
    </span>
  );
}
