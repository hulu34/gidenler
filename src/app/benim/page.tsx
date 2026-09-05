"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getEntityById } from "@/data/entities";
import { getTopicIntelligence } from "@/lib/api";
import { effectiveProfile, getNotifications, getPersonalMatch, similarCreators } from "@/lib/decision";
import { resetDemo, useUserData } from "@/lib/store";
import { score1, nf } from "@/lib/format";
import { EntityActions } from "@/components/decision/EntityActions";
import { TasteEditor } from "@/components/decision/TasteEditor";
import { ReputationChip } from "@/components/creator/ReputationChip";
import { DemoNotice } from "@/components/ui/DemoNotice";

/**
 * BENİM GİDENLER'İM — kullanıcının ana üssü.
 * Gitmek istediklerim · Kaydettiklerim · Gittiklerim · Deneyimlerim · Listelerim · Zevkim · Pasaport.
 * "Portfolio" değil; benim yerlerim.
 */
export default function MyPage() {
  const data = useUserData();
  const profile = useMemo(() => effectiveProfile(data.taste), [data.taste]);
  const rels = Object.values(data.relationships);
  const by = (s: string) => rels.filter((r) => r.state === s);
  const want = by("want_to_go"), saved = by("saved"), visited = [...by("visited"), ...by("experienced")];
  const notes = useMemo(() => getNotifications(data.relationships), [data.relationships]);
  const creators = useMemo(() => similarCreators(profile, 4), [profile]);
  const empty = rels.length === 0;
  const [confirmReset, setConfirmReset] = useState(false);

  const Row = ({ entityId, right }: { entityId: string; right?: React.ReactNode }) => {
    const e = getEntityById(entityId); const it = getTopicIntelligence(entityId);
    if (!e || !it) return null;
    const m = getPersonalMatch(entityId, "default", undefined, undefined, profile);
    return (
      <li className="grid gap-x-6 gap-y-2 border-t border-line py-4 sm:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 flex-col gap-1">
          <Link href={`/mekan/${e.slug}/`} className="text-[18px] font-bold leading-tight tracking-[-0.02em] hover:text-accent-ink">{e.name}</Link>
          <span className="flex flex-wrap items-center gap-x-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            {e.location?.district && <span>{e.location.district}</span>}
            {it.overallScore !== null && <span className="tnum">Gidenler {score1(it.overallScore)} <span className={it.scoreTrend.direction === "up" ? "text-pos-ink" : it.scoreTrend.direction === "down" ? "text-neg-ink" : ""}>{it.scoreTrend.direction === "up" ? "↑" : it.scoreTrend.direction === "down" ? "↓" : "→"}</span></span>}
            {m && <span className="tnum text-accent-ink">%{m.score} sana göre</span>}
          </span>
        </div>
        <div className="flex items-center">{right ?? <EntityActions entityId={entityId} entitySlug={e.slug} entityName={e.name} variant="compact" via="benim" />}</div>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-7">
      <header className="flex flex-col gap-3 pt-10 sm:pt-14">
        <p className="label">Benim Gidenler&apos;im</p>
        <h1 className="max-w-[14ch] text-[clamp(2rem,6.5vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">Karar ver, git, yaşa, yaz.</h1>
        <p className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-3">
          <span className="tnum">{want.length} gitmek istediğim</span><span className="tnum">{saved.length} kaydettiğim</span><span className="tnum">{visited.length} gittiğim</span><span className="tnum">{data.reactions.length} tepki</span>
        </p>
      </header>

      {empty && (
        <section className="mt-8 border-t-2 border-line-strong pt-7">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.2em]">Henüz bir yer seçmedin</h2>
          <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">Bir mekânda "Gitmek istiyorum" dediğinde burada bekler; gittiğinde iki dokunuşla nasıl geçtiğini söylersin. Başlamak için:</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/sor/" className="inline-flex h-9 items-center rounded-[3px] bg-accent px-3.5 text-[13.5px] font-semibold text-on-accent">Sor Gidenler</Link>
            <Link href="/zevkim/" className="inline-flex h-9 items-center rounded-[3px] border border-line-2 px-3.5 text-[13.5px] font-semibold hover:border-ink">Zevkini tanıyalım</Link>
            <Link href="/mekan/sakura-omakase/" className="inline-flex h-9 items-center rounded-[3px] border border-line-2 px-3.5 text-[13.5px] font-semibold hover:border-ink">Sakura Omakase&apos;ye bak</Link>
          </div>
        </section>
      )}

      {want.length > 0 && (
        <section className="mt-8 border-t-2 border-line-strong pt-6" aria-labelledby="devam">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"><h2 id="devam" className="text-[13px] font-bold uppercase tracking-[0.2em]">Devam et</h2><span className="text-[12px] text-ink-3">Gitmek istiyorum demiştin. Gittin mi?</span></div>
          <ul className="mt-2">
            {want.map((r) => {
              const e = getEntityById(r.entityId)!;
              return <Row key={r.entityId} entityId={r.entityId} right={<EntityActions entityId={r.entityId} entitySlug={e.slug} entityName={e.name} variant="full" via="benim" />} />;
            })}
          </ul>
        </section>
      )}

      {notes.length > 0 && (
        <section className="mt-10" aria-labelledby="haber">
          <h2 id="haber" className="label">Senin için haberler</h2>
          <ul className="mt-2 flex flex-col divide-y divide-line border-t border-line">
            {notes.slice(0, 4).map((n) => {
              const e = getEntityById(n.entityId)!;
              return (
                <li key={n.id} className="flex flex-col gap-0.5 py-3">
                  <Link href={`/mekan/${e.slug}/`} className="text-[14.5px] font-semibold hover:text-accent-ink">{n.title}</Link>
                  <span className="text-[12.5px] text-ink-3">{n.body} · <span className="uppercase tracking-[0.1em]">{n.basedOn === "want_to_go" ? "gitmek istiyorum" : n.basedOn === "saved" ? "kaydettiğim" : "gittiğim"} tabanlı</span></span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11.5px] text-ink-3">Bildirim niyete dayanır: kaydettiğin ile gitmek istediğin farklı haber alır. Prototipte burada görünür; ileride bildirim olur.</p>
        </section>
      )}

      {visited.length > 0 && (
        <section className="mt-10" aria-labelledby="gittim">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"><h2 id="gittim" className="label">Gittiklerim ve deneyimlerim</h2><span className="text-[12px] text-ink-3">Hızlı tepki ≠ deneyim; ikisi ayrı sayılır.</span></div>
          <ul className="mt-2">
            {visited.map((r) => {
              const e = getEntityById(r.entityId)!; const q = data.reactions.find((x) => x.entityId === r.entityId);
              if (!q && r.state === "visited") return <Row key={r.entityId} entityId={r.entityId} right={<EntityActions entityId={r.entityId} entitySlug={e.slug} entityName={e.name} variant="full" via="benim" />} />;
              return (
                <Row key={r.entityId} entityId={r.entityId} right={
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    {q ? <span className="text-[13px] font-semibold">{q.mood === "çok iyi" ? "😍" : q.mood === "iyi" ? "🙂" : q.mood === "ortalama" ? "😐" : "🙁"} {q.mood} · {q.returnIntent === "evet" ? "tekrar giderim" : q.returnIntent === "hayır" ? "tekrar gitmem" : "belki"}</span> : <span className="text-[12.5px] text-ink-3">Tepki yok</span>}
                    {q?.note && <span className="max-w-[40ch] text-[12.5px] text-ink-2">“{q.note}”</span>}
                    {r.state === "experienced" ? <span className="text-[12px] font-semibold text-pos-ink">✓ Deneyim yazıldı</span> : <Link href={`/yaz/${e.slug}/`} className="text-[12.5px] font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">Deneyimini yaz</Link>}
                  </div>
                } />
              );
            })}
          </ul>
        </section>
      )}

      {saved.length > 0 && (
        <section className="mt-10" aria-labelledby="kayit">
          <h2 id="kayit" className="label">Kaydettiklerim</h2>
          <ul className="mt-2">{saved.map((r) => <Row key={r.entityId} entityId={r.entityId} />)}</ul>
        </section>
      )}

      <section className="mt-10" aria-labelledby="listeler">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"><h2 id="listeler" className="label">Listelerim</h2><span className="text-[12px] text-ink-3">Liste bir yer imi değil, karar bağlamı: her satırda puan, uyum ve yön.</span></div>
        <ul className="mt-3 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {data.lists.map((l) => (
            <li key={l.id} className="flex flex-col gap-1.5 border-t border-line pt-3">
              <span className="flex items-baseline justify-between"><span className="text-[17px] font-bold tracking-[-0.02em]">{l.title}</span><span className="tnum text-[12px] text-ink-3">{l.entityIds.length} mekân</span></span>
              {l.entityIds.length ? (
                <ul className="flex flex-col">
                  {l.entityIds.map((id) => { const e = getEntityById(id)!; const it = getTopicIntelligence(id)!; const m = getPersonalMatch(id, l.id === "l.date" ? "date" : l.id === "l.friends" ? "friends" : "default", undefined, undefined, profile);
                    return <li key={id} className="flex items-baseline justify-between gap-3 py-1 text-[13.5px]"><Link href={`/mekan/${e.slug}/`} className="font-semibold hover:text-accent-ink">{e.name}</Link><span className="tnum text-[12px] text-ink-3">{it.overallScore !== null ? score1(it.overallScore) : "—"} · <span className="text-accent-ink">%{m?.score ?? "—"}</span></span></li>; })}
                </ul>
              ) : <span className="text-[12.5px] text-ink-3">Boş. Bir mekânda "Gitmek istiyorum" dedikten sonra listeye ekleyebilirsin.</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 border-t-2 border-line-strong pt-6" aria-labelledby="zevk">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"><h2 id="zevk" className="text-[13px] font-bold uppercase tracking-[0.2em]">Zevkim</h2><Link href="/zevkim/" className="text-[12px] font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">Tam sayfa düzenle</Link></div>
        <div className="mt-5"><TasteEditor compact /></div>
      </section>

      {creators.length > 0 && (
        <section className="mt-12" aria-labelledby="yakin">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"><h2 id="yakin" className="label">Zevkine yakın uzmanlar</h2><span className="text-[12px] text-ink-3">Ünlü olduğu için değil — senin gibi düşündüğü için.</span></div>
          <ul className="mt-2 grid gap-x-10 border-t border-line sm:grid-cols-2">
            {creators.map((c) => (
              <li key={c.user.id} className="flex items-baseline justify-between gap-4 border-b border-line py-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/@${c.user.handle}/`} className="text-[15px] font-bold hover:text-accent-ink">@{c.user.handle}</Link>
                  <ReputationChip reputation={c.user.reputation} kind={c.user.kind} />
                  {c.shared.length > 0 && <span className="text-[12px] text-ink-3">Ortak: {c.shared.slice(0, 3).join(", ")}</span>}
                </span>
                <span className="flex flex-col items-end"><span className="tnum text-[24px] font-extrabold leading-none tracking-[-0.04em] text-accent-ink">%{c.score}</span><span className="label">zevk uyumu</span>{data.follows.includes(c.user.id) && <span className="text-[11px] font-semibold text-pos-ink">takip ediyorsun</span>}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-line pt-4">
        <p className="text-[13px] text-ink-2">Pasaport: gerçek katkılarınla büyür — {nf(data.visits.length)} ziyaret, {nf(data.reactions.length)} tepki, {nf(rels.filter((r) => r.state === "experienced").length)} deneyim. Örnek: <Link href="/pasaport/denizyer/" className="font-semibold underline decoration-line-2 underline-offset-4 hover:decoration-ink">@denizyer&apos;in pasaportu</Link>.</p>
        {confirmReset ? (
          <span className="flex items-center gap-3 text-[12px]"><span className="text-ink-2">Sıfırlansın mı?</span><button type="button" onClick={() => { resetDemo(); setConfirmReset(false); }} className="font-semibold text-neg-ink">Evet, sıfırla</button><button type="button" onClick={() => setConfirmReset(false)} className="text-ink-3">Vazgeç</button></span>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3 hover:text-ink">Demo verilerini sıfırla</button>
        )}
      </section>
      <div className="mt-8"><DemoNotice>Gitmek istediklerin, gittiklerin ve zevk düzenlemelerin yalnızca bu tarayıcıda saklanır; varsayılan olarak özeldir.</DemoNotice></div>
    </div>
  );
}
