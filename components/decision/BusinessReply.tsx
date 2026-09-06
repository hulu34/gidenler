"use client";

import { useState } from "react";
import { saveBusinessDraft, useUserData } from "@/lib/store";
import { Button } from "@/components/ui/Button";

/**
 * İşletme yanıtı / iç not — panelde ölü düğme yok.
 * Yanıt taslağı yerel saklanır; prototipte yayına alınmaz ve bunu söyler.
 * Yanıt deneyimi silmez, ağırlığını değiştirmez (kilitli kural).
 */
export function BusinessReply({ experienceId }: { experienceId: string }) {
  const data = useUserData();
  const draft = data.businessDrafts[experienceId] ?? {};
  const [mode, setMode] = useState<"none" | "reply" | "note">("none");
  const [text, setText] = useState("");
  const open = (m: "reply" | "note") => { setMode(m); setText((m === "reply" ? draft.reply : draft.note) ?? ""); };
  const save = () => { saveBusinessDraft(experienceId, mode === "reply" ? { reply: text.trim() } : { note: text.trim() }); setMode("none"); };

  return (
    <div className="mb-8 flex flex-col gap-3 border-l-2 border-line-2 pl-5">
      {mode === "none" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => open("reply")}>{draft.reply ? "Resmî yanıtı düzenle" : "Resmî yanıt yaz"}</Button>
          <Button variant="ghost" size="sm" onClick={() => open("note")}>{draft.note ? "Notu düzenle" : "Not al"}</Button>
          {draft.reply && <span className="text-[12px] text-ink-3">Yanıt taslağı kaydedildi · prototipte yayına alınmaz</span>}
          {draft.note && !draft.reply && <span className="text-[12px] text-ink-3">İç not kaydedildi</span>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="label" htmlFor={`br-${experienceId}`}>{mode === "reply" ? "Resmî yanıt — deneyimin altında işletme etiketiyle görünür" : "İç not — yalnızca panelde"}</label>
          <textarea id={`br-${experienceId}`} value={text} onChange={(e) => setText(e.target.value)} rows={3}
            className="w-full border-b-2 border-line-2 bg-transparent text-[14px] outline-none focus:border-accent"
            placeholder={mode === "reply" ? "Geri bildiriminiz için teşekkürler; servis süresi konusunda…" : "Cuma akşamı vardiya eksikti; kontrol et."} />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" disabled={!text.trim()} onClick={save}>Kaydet</Button>
            <Button variant="ghost" size="sm" onClick={() => setMode("none")}>Vazgeç</Button>
            <span className="text-[12px] text-ink-3">{mode === "reply" ? "Yanıt deneyimi silmez, puanı ve ağırlığını değiştirmez." : "Not müşteriye görünmez."}</span>
          </div>
        </div>
      )}
    </div>
  );
}
