import Link from "next/link";
import type { Entity } from "@/lib/types";
import { canReserve, isPartner, slotsOf } from "@/lib/reservation";
import { ReservationWidget } from "./ReservationWidget";

/* Mekân sayfasındaki rezervasyon kutusu.
   · Ortak işletme → Gidenler takvimi + talep.
   · Değilse → işletmenin kendi kanalları (telefon / web / Instagram); Gidenler aracı gibi davranmaz. */
export function ReservationBlock({ entity }: { entity: Entity }) {
  if (!canReserve(entity)) return null;
  if (isPartner(entity)) {
    return (
      <ReservationWidget
        venue={{ id: entity.id, slug: entity.slug, name: entity.name, isDemo: entity.isDemo, reservation: entity.reservation, hours: entity.hours }}
        slots={slotsOf(entity)}
        maxParty={entity.reservation?.maxParty ?? 8}
      />
    );
  }
  const c = entity.contact;
  const tel = c?.phone?.replace(/[^\d+]/g, "");
  const links = [
    tel && { href: `tel:${tel}`, label: "Ara", sub: c!.phone! },
    c?.website && { href: c.website, label: "Web sitesi", sub: c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").slice(0, 34), ext: true },
    c?.instagram && { href: `https://www.instagram.com/${c.instagram}/`, label: "Instagram", sub: `@${c.instagram}`, ext: true },
  ].filter(Boolean) as { href: string; label: string; sub: string; ext?: boolean }[];
  return (
    <div className="flex flex-col gap-3 border border-line-2 p-4 sm:p-5">
      <span className="text-[17px] font-extrabold tracking-[-0.015em]">Rezervasyon</span>
      {links.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line">
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href} {...(l.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="flex items-baseline justify-between gap-3 py-2.5 text-[14px] hover:text-accent-ink">
                <span className="font-semibold">{l.label}</span><span className="truncate text-[12.5px] text-ink-3">{l.sub}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13.5px] text-ink-2">Bu mekânın yayımlanmış bir rezervasyon kanalı yok; gitmeden önce aramanı öneririz.</p>
      )}
      <p className="text-[12px] leading-snug text-ink-3">
        Bu mekân henüz Gidenler rezervasyonuna katılmadı; bağlantılar işletmenin kendi kanallarıdır.{" "}
        <Link href="/isletmeler/#rezervasyon" className="underline underline-offset-2 hover:text-ink">İşletme sahibi misin?</Link>
      </p>
    </div>
  );
}
