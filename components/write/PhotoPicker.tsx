"use client";

import { useEffect, useRef, useState } from "react";

/* DENEYİM FORMU · FOTOĞRAF — seçim, önizleme, kaldırma, hak onayı; deneyim kaydedildikten sonra tek tek yükleme.
   Her dosyanın sonucu ayrı yazılır: başarısız olan başarılı gösterilmez, yeniden denenebilir.
   Vercel istek gövdesi sınırı nedeniyle büyük dosya tarayıcıda küçültülür; sunucu dosyayı yine baştan denetler. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const MAX_SIDE = 2400, TARGET_BYTES = 3.6 * 1024 * 1024;
export type PickState = "ready" | "uploading" | "done" | "error";
export interface Pick { key: string; file: File; url: string; state: PickState; progress: number; error?: string }

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file; /* tarayıcı açamadı (HEIC vb.): sunucu dürüstçe reddeder */
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size <= TARGET_BYTES) { bmp.close(); return file; }
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.88));
}

function send(reviewId: string, blob: Blob, rights: string, onProgress: (n: number) => void): Promise<{ ok: boolean; message?: string }> {
  return new Promise((res) => {
    const fd = new FormData();
    fd.set("file", blob, "foto"); fd.set("rights", rights);
    const x = new XMLHttpRequest();
    x.open("POST", `${BASE}/api/reviews/${reviewId}/photos/`);
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => {
      let j: { message?: string } = {};
      try { j = JSON.parse(x.responseText); } catch { /* boş */ }
      res(x.status >= 200 && x.status < 300 ? { ok: true } : { ok: false, message: j.message ?? `Yüklenemedi (${x.status}).` });
    };
    x.onerror = () => { void fetch(`${BASE}/api/ops/event/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: "upload:client_failed" }) }).catch(() => {}); res({ ok: false, message: "Bağlantı koptu; fotoğraf yüklenmedi." }); };
    x.send(fd);
  });
}

export function usePhotoPicks() {
  const [enabled, setEnabled] = useState(false);
  const [max, setMax] = useState(5);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [rightsType, setRightsType] = useState<"" | "own" | "authorized">("");
  const rights = rightsType !== "";
  const urls = useRef(new Set<string>());
  useEffect(() => {
    fetch(`${BASE}/api/media/status/`).then((r) => r.json()).then((j) => { setEnabled(!!j.enabled); if (j.max) setMax(j.max); }).catch(() => {});
    const u = urls.current;
    return () => { u.forEach((x) => URL.revokeObjectURL(x)); };
  }, []);
  const add = (files: FileList | null) => {
    if (!files) return;
    const next = [...files].slice(0, Math.max(0, max - picks.length)).map((file, i) => {
      const url = URL.createObjectURL(file); urls.current.add(url);
      return { key: `${Date.now()}-${i}-${file.name}`, file, url, state: "ready" as const, progress: 0 };
    });
    setPicks((p) => [...p, ...next]);
  };
  const remove = (key: string) => setPicks((p) => p.filter((x) => x.key !== key));
  const patch = (key: string, v: Partial<Pick>) => setPicks((p) => p.map((x) => (x.key === key ? { ...x, ...v } : x)));
  const uploadOne = async (reviewId: string, p: Pick) => {
    patch(p.key, { state: "uploading", progress: 0, error: undefined });
    const r = await send(reviewId, await shrink(p.file), rightsType, (n) => patch(p.key, { progress: n }));
    patch(p.key, r.ok ? { state: "done", progress: 100 } : { state: "error", error: r.message });
  };
  /* sırayla: küçük bellek, okunur ilerleme */
  const uploadAll = async (reviewId: string) => { for (const p of picks) if (p.state !== "done") await uploadOne(reviewId, p); };
  return { enabled, max, picks, rights, rightsType, setRightsType, add, remove, uploadOne, uploadAll };
}
export type PhotoPicks = ReturnType<typeof usePhotoPicks>;

const DURUM: Record<string, string> = { pending: "Onay bekliyor", approved: "Yayında", rejected: "Reddedildi" };
type Mevcut = { id: string; status: string; rejectReason: string | null; thumb: string | null };

export function PhotoPicker({ ctl, entityName, reviewId }: { ctl: PhotoPicks; entityName: string; reviewId?: string }) {
  const [mevcut, setMevcut] = useState<Mevcut[]>([]);
  const [not, setNot] = useState<string | null>(null);
  useEffect(() => {
    if (!reviewId || !ctl.enabled) return;
    fetch(`${BASE}/api/reviews/${reviewId}/photos/`, { credentials: "same-origin" }).then((r) => r.json()).then((j) => setMevcut(j.photos ?? [])).catch(() => {});
  }, [reviewId, ctl.enabled]);
  if (!ctl.enabled) return null;
  async function kaldir(id: string) {
    if (!window.confirm("Fotoğraf kaldırılsın mı? Dosyası da silinir.")) return;
    const r = await fetch(`${BASE}/api/reviews/${reviewId}/photos/${id}/`, { method: "DELETE", credentials: "same-origin" }).catch(() => null);
    if (r?.ok) { setMevcut((m) => m.filter((x) => x.id !== id)); setNot("Fotoğraf kaldırıldı."); } else setNot("Kaldırılamadı; yeniden dene.");
  }
  const { picks } = ctl;
  const max = Math.max(0, ctl.max - mevcut.filter((m) => m.status !== "rejected").length);
  return (
    <section id="fotograf" className="mt-12 scroll-mt-24 border-t border-line pt-6">
      <h2 className="text-[19px] font-extrabold tracking-[-0.02em]">Fotoğraf ekle <span className="text-[13px] font-semibold text-ink-3">isteğe bağlı, en çok {max}</span></h2>
      <p className="mt-1 max-w-[60ch] text-[13px] text-ink-2">Fotoğraflar <b>{entityName}</b> için kaydedilir ve editör onayından sonra görünür. Fotoğraf ziyareti doğrulamaz; puanı ve güven etiketini değiştirmez.</p>
      {mevcut.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2" aria-label="Daha önce eklediğin fotoğraflar">
          {mevcut.map((m) => (
            <li key={m.id} className="flex items-center gap-3 text-[13px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {m.thumb && m.status !== "rejected" ? <img src={`${BASE}${m.thumb}`} alt="" className="h-14 w-14 shrink-0 object-cover" /> : <span className="h-14 w-14 shrink-0 bg-sheet" />}
              <span className="min-w-0 flex-1"><b>{DURUM[m.status] ?? m.status}</b>{m.rejectReason ? ` · ${m.rejectReason}` : ""}</span>
              {m.status !== "rejected" && <button type="button" onClick={() => kaldir(m.id)} className="min-h-11 font-bold underline underline-offset-2">Kaldır</button>}
            </li>
          ))}
        </ul>
      )}
      {not && <p role="status" className="mt-2 text-[13px] font-semibold">{not}</p>}
      <ul className="mt-3 flex flex-wrap gap-2">
        {picks.map((p) => (
          <li key={p.key} className="relative h-24 w-24 overflow-hidden bg-sheet">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="Seçilen fotoğrafın önizlemesi" className="h-full w-full object-cover" />
            <button type="button" onClick={() => ctl.remove(p.key)} aria-label="Bu fotoğrafı kaldır" className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-[14px] text-white">×</button>
          </li>
        ))}
        {picks.length < max && (
          <li>
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-line-strong text-[12px] font-semibold text-ink-2 hover:bg-sheet focus-within:outline focus-within:outline-2">
              <span aria-hidden className="text-[20px]">+</span>Fotoğraf seç
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { ctl.add(e.target.files); e.target.value = ""; }} />
            </label>
          </li>
        )}
      </ul>
      {picks.length > 0 && (
        <fieldset className="mt-3 flex max-w-[60ch] flex-col gap-2 text-[13px] text-ink-2">
          <legend className="font-semibold text-ink">Hak beyanı</legend>
          <label className="flex min-h-11 items-start gap-2 sm:min-h-0">
            <input type="radio" name="foto-hak" checked={ctl.rightsType === "own"} onChange={() => ctl.setRightsType("own")} className="mt-0.5" />
            <span>Bu fotoğrafları ben çektim ve Gidenler&apos;de yayımlanmasına izin veriyorum.</span>
          </label>
          <label className="flex min-h-11 items-start gap-2 sm:min-h-0">
            <input type="radio" name="foto-hak" checked={ctl.rightsType === "authorized"} onChange={() => ctl.setRightsType("authorized")} className="mt-0.5" />
            <span>Fotoğrafları ben çekmedim ama kullanma yetkim var ve yayımlanmasına izin veriyorum.</span>
          </label>
          <span className="text-[12px] text-ink-3">Google, Instagram ya da başka bir siteden izinsiz alınan fotoğraf yüklenemez.</span>
        </fieldset>
      )}
    </section>
  );
}

/** Kayıt sonrası: her fotoğrafın gerçek sonucu. */
export function PhotoResults({ ctl, reviewId }: { ctl: PhotoPicks; reviewId: string }) {
  if (!ctl.picks.length) return null;
  const busy = ctl.picks.some((p) => p.state === "uploading" || p.state === "ready");
  const done = ctl.picks.filter((p) => p.state === "done").length, bad = ctl.picks.filter((p) => p.state === "error").length;
  return (
    <section aria-live="polite" className="w-full max-w-[60ch] border-t border-line pt-4" data-photo-results>
      <h2 className="text-[15px] font-extrabold">Fotoğraflar</h2>
      <p className="mt-1 text-[13px] text-ink-2">
        {busy ? "Yükleniyor; bu sayfayı kapatma." : bad ? `${done} fotoğraf incelemeye alındı, ${bad} fotoğraf yüklenemedi.` : `${done} fotoğraf incelemeye alındı. Editör onayından sonra görünür.`}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {ctl.picks.map((p) => (
          <li key={p.key} className="flex items-center gap-3 text-[13px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="h-12 w-12 shrink-0 object-cover" />
            <span className="min-w-0 flex-1">
              {p.state === "uploading" && <><span>Yükleniyor %{p.progress}</span><span className="mt-1 block h-1 bg-sheet"><span className="block h-1 bg-ink" style={{ width: `${p.progress}%` }} /></span></>}
              {p.state === "ready" && <span className="text-ink-3">Sırada</span>}
              {p.state === "done" && <span className="font-semibold">Editör onayı bekliyor</span>}
              {p.state === "error" && <span className="font-semibold text-neg-ink" role="alert">{p.error}</span>}
            </span>
            {p.state === "error" && <button type="button" onClick={() => ctl.uploadOne(reviewId, p)} className="font-bold underline underline-offset-2">Yeniden dene</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
