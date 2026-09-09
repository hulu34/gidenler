import type { Entity } from "@/lib/types";
import { getEntityById } from "@/data/entities";

/**
 * KATEGORİYE DUYARLI DİL — tek kaynak.
 * Restoran "gidilir", film "izlenir", otel "kalınır", etkinliğe "katılınır".
 * Her yüzey (eylem düğmeleri, hızlı tepki, bildirim, yakındakiler başlığı) buradan okur;
 * restoran dili filme sızmaz.
 */
export interface Verbs {
  /** Ana niyet: "Gitmek istiyorum" */
  want: string;
  /** Tamamlanmış: "Gittim" */
  did: string;
  /** "Zaten gittim" */
  already: string;
  /** "Gittin mi?" */
  didQ: string;
  /** "✓ Gittin" */
  didYou: string;
  /** "Evet, gittim" */
  yesDid: string;
  /** "Tekrar giderim" */
  again: string;
  /** "Tekrar gider misin?" */
  againQ: string;
  /** "Yine gideceğim" */
  willAgain: string;
  /** "tekrar gitmem" */
  notAgain: string;
  /** 3. tekil, niyet istatistiği: "…kişinin %91'i tekrar gider" */
  wouldAgain: string;
  /** "Gitmek istediklerine eklendi." */
  wantAdded: string;
  /** "Ne için gidiyorsun?" */
  forWhat: string;
  /** Benzerler/yakındakiler başlığı — konum varsa `${district}'de yakındakiler`, yoksa kategoriye göre. */
  nearby: (district?: string) => string;
  /** Bağlam anahtarları (DecisionContextKey) — bu kategoride anlamlı olanlar. */
  contexts: string[];
}

const GO: Omit<Verbs, "nearby" | "contexts"> = {
  want: "Gitmek istiyorum", did: "Gittim", already: "Zaten gittim", didQ: "Gittin mi?", didYou: "Gittin", yesDid: "Evet, gittim",
  again: "Tekrar giderim", againQ: "Tekrar gider misin?", willAgain: "Yine gideceğim", notAgain: "tekrar gitmem", wouldAgain: "tekrar gider",
  wantAdded: "Gitmek istediklerine eklendi.", forWhat: "Ne için gidiyorsun?",
};
const WATCH: Omit<Verbs, "nearby" | "contexts"> = {
  want: "İzlemek istiyorum", did: "İzledim", already: "Zaten izledim", didQ: "İzledin mi?", didYou: "İzledin", yesDid: "Evet, izledim",
  again: "Tekrar izlerim", againQ: "Tekrar izler misin?", willAgain: "Yine izleyeceğim", notAgain: "tekrar izlemem", wouldAgain: "tekrar izler",
  wantAdded: "İzlemek istediklerine eklendi.", forWhat: "Kiminle izliyorsun?",
};
const STAY: Omit<Verbs, "nearby" | "contexts"> = {
  want: "Kalmak istiyorum", did: "Kaldım", already: "Zaten kaldım", didQ: "Kaldın mı?", didYou: "Kaldın", yesDid: "Evet, kaldım",
  again: "Tekrar kalırım", againQ: "Tekrar kalır mısın?", willAgain: "Yine kalacağım", notAgain: "tekrar kalmam", wouldAgain: "tekrar kalır",
  wantAdded: "Kalmak istediklerine eklendi.", forWhat: "Ne için kalıyorsun?",
};
const ATTEND: Omit<Verbs, "nearby" | "contexts"> = {
  want: "Katılmak istiyorum", did: "Katıldım", already: "Zaten katıldım", didQ: "Katıldın mı?", didYou: "Katıldın", yesDid: "Evet, katıldım",
  again: "Tekrar katılırım", againQ: "Tekrar katılır mısın?", willAgain: "Yine katılacağım", notAgain: "tekrar katılmam", wouldAgain: "tekrar katılır",
  wantAdded: "Katılmak istediklerine eklendi.", forWhat: "Kiminle katılıyorsun?",
};

const DINING_CTX = ["default", "date", "friends", "business", "family", "solo", "quick"];
const SOCIAL_CTX = ["default", "date", "friends", "family", "solo"];
const STAY_CTX = ["default", "date", "business", "family", "solo"];
const OUT_CTX = ["default", "date", "friends", "family", "solo"];

const near = (fallback: string) => (district?: string) => (district ? `${district}'de yakındakiler` : fallback);

const BY_CATEGORY: Record<string, Verbs> = {
  "cat.restaurant": { ...GO, contexts: DINING_CTX, nearby: near("Benzer mekânlar") },
  "cat.cafe": { ...GO, contexts: ["default", "friends", "business", "solo", "quick"], nearby: near("Benzer kahveciler") },
  "cat.bar": { ...GO, contexts: ["default", "date", "friends", "solo"], nearby: near("Benzer barlar") },
  "cat.hotel": { ...STAY, contexts: STAY_CTX, nearby: near("Yakındaki konaklamalar") },
  "cat.film": { ...WATCH, contexts: SOCIAL_CTX, nearby: () => "Benzer filmler" },
  "cat.show": { ...ATTEND, contexts: SOCIAL_CTX, nearby: near("Benzer etkinlikler") },
  "cat.venue": { ...GO, contexts: OUT_CTX, nearby: near("Yakındaki salonlar") },
  "cat.culture": { ...GO, contexts: OUT_CTX, nearby: near("Benzer mekânlar") },
  "cat.place": { ...GO, contexts: OUT_CTX, nearby: near("Yakındaki yerler") },
  "cat.travel": { ...GO, contexts: ["default", "date", "friends", "family", "solo"], nearby: () => "Benzer rotalar" },
  "cat.service": { ...GO, contexts: ["default", "solo", "quick"], nearby: near("Yakındaki işletmeler") },
  "cat.physician": { ...GO, contexts: ["default"], nearby: near("Aynı branştan") },
  "cat.dentist": { ...GO, contexts: ["default"], nearby: near("Aynı branştan") },
  "cat.lawyer": { ...GO, contexts: ["default"], nearby: near("Aynı alandan") },
};

/** Tiyatro oyunu "izlenir"; konser/festival "katılınır"; sergiye "gidilir". */
export function verbsFor(e: Pick<Entity, "categoryId" | "subcategory"> | undefined): Verbs {
  if (!e) return BY_CATEGORY["cat.restaurant"];
  const base = BY_CATEGORY[e.categoryId] ?? BY_CATEGORY["cat.restaurant"];
  if (e.categoryId === "cat.show" && e.subcategory === "Tiyatro oyunu") return { ...base, ...WATCH, contexts: base.contexts, nearby: base.nearby };
  if (e.categoryId === "cat.show" && e.subcategory === "Sergi") return { ...base, ...GO, contexts: base.contexts, nearby: base.nearby };
  return base;
}

export const verbsForId = (entityId: string): Verbs => verbsFor(getEntityById(entityId));
