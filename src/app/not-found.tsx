import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col items-start gap-5 px-5 py-24 sm:px-7">
      <span className="label">404</span>
      <h1 className="text-[clamp(2rem,6vw,3.25rem)] font-extrabold leading-none tracking-[-0.045em]">
        Böyle bir başlık yok.
      </h1>
      <p className="prose-exp max-w-[46ch] text-ink-2">
        Aradığın yer henüz Gidenler&apos;de olmayabilir. İlk deneyimi yazan kişi başlığı açar.
      </p>
      <Link
        href="/"
        className="border-b-2 border-accent pb-0.5 text-[12px] font-semibold uppercase tracking-[0.12em]"
      >
        Ana sayfaya dön
      </Link>
    </div>
  );
}
