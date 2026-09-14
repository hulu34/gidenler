import { z } from "zod";

/* ──────────────────────────────────────────────────────────────────────────
   YAPILANDIRILMIŞ ÇIKTI SÖZLEŞMELERİ (zod). Model ne dönerse dönsün burada doğrulanır;
   geçmeyen yanıt → deterministik motora düşülür. `entityId` sözleşmeye ek olarak veri kümesine karşı da denetlenir (orchestrator).
   ────────────────────────────────────────────────────────────────────────── */

const short = (n: number) => z.string().trim().max(n);

export const UnderstoodSchema = z.object({
  location: short(60).nullable().optional(),
  date: short(30).nullable().optional(),
  time: short(20).nullable().optional(),
  partySize: z.number().int().min(1).max(50).nullable().optional(),
  intent: short(80).nullable().optional(),
  budget: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).nullable().optional(),
  preferences: z.array(short(30)).max(8).optional().default([]),
});
export type Understood = z.infer<typeof UnderstoodSchema>;

export const RecommendationSchema = z.object({
  entityId: short(64),
  name: short(120).optional(),
  matchScore: z.number().min(0).max(100),
  reasons: z.array(short(160)).max(4).default([]),
  cautions: z.array(short(160)).max(3).default([]),
  confidence: z.enum(["low", "medium", "high"]),
});
export type LLMRecommendation = z.infer<typeof RecommendationSchema>;

export const FollowUpSchema = z.object({ key: short(20), label: short(40) });

/* Model → orkestratör tur sözleşmesi: ya araç çağrısı ya nihai yanıt. Sağlayıcıdan bağımsız (native tool-calling yok). */
export const ToolCallSchema = z.object({
  toolCall: z.object({
    tool: z.enum(["search_places", "get_place_candidates", "rank_candidates", "get_place_details", "get_category_results", "get_context_fit", "get_experience_signals"]),
    args: z.record(z.string(), z.unknown()).default({}),
  }),
});
export const FinalSchema = z.object({
  understood: UnderstoodSchema,
  recommendations: z.array(RecommendationSchema).max(6),
  followUps: z.array(FollowUpSchema).max(5).default([]),
  overallConfidence: z.enum(["low", "medium", "high"]),
  note: short(300).optional(),
});
export const ModelTurnSchema = z.union([ToolCallSchema, FinalSchema]);
export type ModelTurn = z.infer<typeof ModelTurnSchema>;
export type FinalTurn = z.infer<typeof FinalSchema>;

/* Hızlı model: niyet ayrıştırma (isteğe bağlı; yerel ayrıştırıcıyı ZENGİNLEŞTİRİR, değiştirmez). */
export const IntentSchema = z.object({
  location: short(60).nullable().optional(),
  district: short(60).nullable().optional(),
  day: short(30).nullable().optional(),
  time: short(20).nullable().optional(),
  partySize: z.number().int().min(1).max(50).nullable().optional(),
  category: z.enum(["yemek", "kahve", "gece", "konaklama", "kultur", "hepsi"]).nullable().optional(),
  qualifiers: z.array(z.enum(["quiet", "value", "romantic", "family", "late", "fast", "breakfast", "view"])).max(6).default([]),
  budget: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).nullable().optional(),
  ambiguous: z.boolean().default(false),
});
export type LLMIntent = z.infer<typeof IntentSchema>;

/* Yargıç: örneklemeli kalite denetimi (kullanıcıya gitmez; eval/telemetri). */
export const JudgeSchema = z.object({
  intentCorrect: z.boolean(),
  relevance: z.number().min(0).max(1),
  hallucination: z.boolean(),
  explanationQuality: z.number().min(0).max(1),
  issues: z.array(short(120)).max(5).default([]),
});
export type JudgeVerdict = z.infer<typeof JudgeSchema>;

/* API yanıtı (istemciye giden). Sağlayıcı/model adı yalnızca görünür etiket olarak; anahtar, prompt, ham yanıt gitmez. */
export const AIResponseSchema = z.object({
  requestId: z.string(),
  mode: z.enum(["llm", "deterministic", "cached"]),
  /** Neden deterministik: not_configured | budget | provider_error | invalid_output | timeout | rate_limited | regulated */
  fallbackReason: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  understood: UnderstoodSchema,
  recommendations: z.array(z.object({
    entityId: z.string(), slug: z.string(), name: z.string(), kind: z.string(), place: z.string(),
    matchScore: z.number(), score: z.number().nullable(), confidence: z.enum(["low", "medium", "high"]),
    reasons: z.array(z.string()), cautions: z.array(z.string()), hoursNote: z.string().optional(),
  })),
  followUps: z.array(FollowUpSchema),
  overallConfidence: z.enum(["low", "medium", "high"]),
  note: z.string().optional(),
  latencyMs: z.number(),
});
export type AIResponse = z.infer<typeof AIResponseSchema>;

/* İstek gövdesi. */
export const AskRequestSchema = z.object({
  query: z.string().min(1).max(4000),
  structured: z.object({
    location: short(60).optional(), day: short(30).optional(), time: short(20).optional(),
    party: z.number().int().min(1).max(50).optional(),
    category: z.enum(["yemek", "kahve", "gece", "konaklama", "kultur", "hepsi"]).optional(),
  }).optional(),
  followUp: z.enum(["quiet", "value", "near", "expert", "late"]).nullable().optional(),
  /** Profil ÖZETİ — istemci ham profili değil, summarizeProfile çıktısını yollar; sunucu yine de yeniden filtreler. */
  profile: z.object({
    city: short(40).optional(), district: short(40).optional(), partySize: z.number().int().min(1).max(50).optional(),
    tasteProfile: z.record(z.string(), z.number()).optional(), avoid: z.array(short(20)).max(5).optional(),
  }).optional(),
  sessionId: z.string().max(64).optional(),
});
export type AskRequest = z.infer<typeof AskRequestSchema>;

/* Geri bildirim olayı (anonim). */
export const FeedbackSchema = z.object({
  requestId: z.string().max(32),
  event: z.enum(["click", "save", "choose_other", "helpful", "unhelpful", "wrong_info"]),
  entityId: z.string().max(64).optional(),
  mode: z.enum(["llm", "deterministic", "cached"]).optional(),
});
export type FeedbackEvent = z.infer<typeof FeedbackSchema>;
