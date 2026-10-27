/** Prototip verisini gizlemek yerine açıkça söyler. */
export function DemoNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-ink-3">
      <span className="mt-px shrink-0 border border-dashed border-line-2 px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.12em]">
        Demo veri
      </span>
      <p className="max-w-[68ch]">
        {children ??
          "Bu sayfadaki işletme, deneyim ve dış kaynak puanlarının tamamı prototip için üretilmiştir. Gerçek bir işletmeye veya kişiye ait değildir."}
      </p>
    </div>
  );
}

/** Satır içi küçük "demo" etiketi: demo puanlarla üretilmiş modül başlıklarında. */
export function DemoTag({ className = "" }: { className?: string }) {
  return (
    <span title="Demo veri: puan ve deneyimler prototip için üretilmiştir" className={`ml-2 inline-block border border-dashed border-line-2 px-1 py-px align-middle text-[9.5px] font-bold uppercase tracking-[0.12em] text-ink-3 ${className}`}>
      demo
    </span>
  );
}
