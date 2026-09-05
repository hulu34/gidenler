"use client";

/* ==========================================================================
   KULLANICI DURUMU — prototip kalıcılığı
   --------------------------------------------------------------------------
   Kaydet / Gitmek istiyorum / Gittim / Hızlı tepki / listeler / zevk
   düzenlemeleri / takip / grup oyları. localStorage arkasında temiz bir
   arayüz: backend geldiğinde yalnızca bu dosyanın gövdesi değişir.
   ========================================================================== */

import { useSyncExternalStore } from "react";
import type {
  GroupVote, GroupVoteChoice, PersonalList, QuickReaction, ReactionMood, ReturnIntent,
  TasteEdits, TasteLevel, UserEntityRelationship, UserEntityState, VisitSignal,
} from "@/lib/types";
import { DEMO_USER_ID } from "@/data/taste";

/**
 * İKİ AYRI AD ALANI: normal kullanıcı verisi ile sunum (yatırımcı) verisi
 * birbirine karışmaz. Sunum modu açıkken okuma/yazma `gidenler.demo`
 * anahtarına gider; normal kullanıcının `gidenler.v4` kaydına dokunulmaz.
 * Mod bayrağı üçüncü bir anahtarda tutulur ki sayfalar arasında korunsun.
 */
const KEY_USER = "gidenler.v4";
const KEY_DEMO = "gidenler.demo";
const KEY_MODE = "gidenler.mode";
const TODAY = "2026-09-02";

function readMode(): "investor" | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(KEY_MODE) === "investor" ? "investor" : null; } catch { return null; }
}
const activeKey = () => (readMode() === "investor" ? KEY_DEMO : KEY_USER);

export interface UserData {
  relationships: Record<string, UserEntityRelationship>;
  visits: VisitSignal[];
  reactions: QuickReaction[];
  lists: PersonalList[];
  taste: TasteEdits;
  follows: string[];          // user ids
  groupVotes: GroupVote[];
  groupChosen: Record<string, string>;
  /** V5 — küçük öneri geri bildirimi: "Bana uymadı" + neden. Profili değiştirmez; sinyal olarak saklanır. */
  feedback: RecommendationFeedback[];
  /** V5 — Sor Gidenler'de son aranan niyetler (en yeni önce, en çok 5). */
  recentIntents: RecentIntent[];
  /** V5 — sunum (yatırımcı) modu açık mı? Ad alanından türetilir; kayda yazılmaz. */
  demoMode?: "investor";
  /** V5.1 — "faydalı" işaretlediğin deneyimler ve bildirdiklerin (prototipte yerel). */
  helpful: string[];
  reports: string[];
  /** V5.1 — işletme paneli taslakları (resmî yanıt / iç not); prototipte yerel. */
  businessDrafts: Record<string, { reply?: string; note?: string }>;
}

export interface RecommendationFeedback { entityId: string; reason: string; surface: string; createdAt: string }
export interface RecentIntent { text: string; createdAt: string }

const DEFAULT_LISTS: PersonalList[] = [
  { id: "l.week", title: "Bu hafta", entityIds: [], createdAt: TODAY, isDefault: true },
  { id: "l.date", title: "Date", entityIds: [], createdAt: TODAY, isDefault: true },
  { id: "l.ist", title: "İstanbul listem", entityIds: [], createdAt: TODAY, isDefault: true },
  { id: "l.friends", title: "Arkadaşlarla", entityIds: [], createdAt: TODAY, isDefault: true },
];

const empty = (): UserData => ({
  relationships: {}, visits: [], reactions: [], lists: DEFAULT_LISTS.map((l) => ({ ...l, entityIds: [] })),
  taste: { dimensions: {}, cuisines: {}, dislikes: [] }, follows: [], groupVotes: [], groupChosen: {},
  feedback: [], recentIntents: [], helpful: [], reports: [], businessDrafts: {},
});

/** Eski sürümden kalan / bozuk kayıt hiçbir zaman sayfayı düşürmesin: her alan tipine göre doğrulanır. */
function sanitize(p: Partial<UserData> | null): UserData {
  const e = empty();
  if (!p || typeof p !== "object") return e;
  const arr = <T,>(v: unknown, d: T[]): T[] => (Array.isArray(v) ? (v as T[]) : d);
  const obj = <T,>(v: unknown, d: T): T => (v && typeof v === "object" && !Array.isArray(v) ? (v as T) : d);
  const taste = obj(p.taste, e.taste);
  return {
    relationships: Object.fromEntries(Object.entries(obj<Record<string, UserEntityRelationship>>(p.relationships, {})).filter(([, r]) => r && typeof r === "object" && typeof r.state === "string").map(([k, r]) => [k, { ...r, listIds: Array.isArray(r.listIds) ? r.listIds : [] }])),
    visits: arr(p.visits, e.visits),
    reactions: arr(p.reactions, e.reactions),
    lists: arr<PersonalList>(p.lists, e.lists).filter((l) => l && typeof l === "object" && Array.isArray(l.entityIds)),
    taste: { dimensions: obj(taste.dimensions, {}), cuisines: obj(taste.cuisines, {}), dislikes: arr(taste.dislikes, []), updatedAt: taste.updatedAt },
    follows: arr(p.follows, e.follows),
    groupVotes: arr(p.groupVotes, e.groupVotes),
    groupChosen: obj(p.groupChosen, e.groupChosen),
    feedback: arr(p.feedback, e.feedback),
    recentIntents: arr(p.recentIntents, e.recentIntents),
    helpful: arr(p.helpful, e.helpful),
    reports: arr(p.reports, e.reports),
    businessDrafts: obj(p.businessDrafts, e.businessDrafts),
  };
}

let cache: UserData | null = null;
const listeners = new Set<() => void>();

let cacheKey: string | null = null;

function read(): UserData {
  const key = typeof window === "undefined" ? KEY_USER : activeKey();
  if (cache && cacheKey === key) return cache;
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(key);
    cache = raw ? sanitize(JSON.parse(raw) as Partial<UserData>) : empty();
  } catch { cache = empty(); }
  /* Sunum modunda kayıt yoksa (ilk açılış / temizlenmiş) başlangıç anlık görüntüsünü kur. */
  if (key === KEY_DEMO && !window.localStorage.getItem(key)) cache = investorSnapshot();
  cache.demoMode = key === KEY_DEMO ? "investor" : undefined;
  cacheKey = key;
  return cache;
}

function write(next: UserData) {
  const key = activeKey();
  cache = { ...next, demoMode: key === KEY_DEMO ? "investor" : undefined };
  cacheKey = key;
  try { const { demoMode: _m, ...persist } = cache; void _m; window.localStorage.setItem(key, JSON.stringify(persist)); } catch { /* özel pencere vb. */ }
  listeners.forEach((l) => l());
}

const SERVER_SNAPSHOT = empty();
export function useUserData(): UserData {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => read(),
    () => SERVER_SNAPSHOT,
  );
}

const uid = () => Math.random().toString(36).slice(2, 9);

/* ───────────────────────── ilişki durumu ───────────────────────────────── */

export function getEntityState(entityId: string): UserEntityState {
  return read().relationships[entityId]?.state ?? "none";
}

export function setEntityState(entityId: string, state: UserEntityState, via?: string) {
  const d = read();
  const prev = d.relationships[entityId];
  const rel: UserEntityRelationship = {
    entityId, state, via: via ?? prev?.via, listIds: prev?.listIds ?? [], updatedAt: TODAY,
    visitedAt: state === "visited" || state === "experienced" ? (prev?.visitedAt ?? TODAY) : prev?.visitedAt,
  };
  const relationships = { ...d.relationships };
  if (state === "none") delete relationships[entityId]; else relationships[entityId] = rel;
  write({ ...d, relationships });
}

export function markVisited(entityId: string) {
  const d = read();
  const visit: VisitSignal = { id: `v.${uid()}`, entityId, userId: DEMO_USER_ID, visitedAt: TODAY, source: "self_report" };
  write({ ...d, visits: [...d.visits, visit] });
  setEntityState(entityId, "visited", "visit");
}

export function submitQuickReaction(entityId: string, mood: ReactionMood, returnIntent: ReturnIntent, note?: string) {
  const d = read();
  const r: QuickReaction = { id: `r.${uid()}`, entityId, userId: DEMO_USER_ID, mood, returnIntent, note: note?.trim() || undefined, createdAt: TODAY };
  write({ ...d, reactions: [...d.reactions.filter((x) => x.entityId !== entityId), r] });
}

export function markExperienced(entityId: string) {
  const d = read();
  const reactions = d.reactions.map((r) => (r.entityId === entityId ? { ...r, upgradedToExperienceId: `exp.${uid()}` } : r));
  write({ ...d, reactions });
  setEntityState(entityId, "experienced", "write");
}

/* ─────────────────────────── listeler ──────────────────────────────────── */

export function toggleInList(listId: string, entityId: string) {
  const d = read();
  const lists = d.lists.map((l) => l.id !== listId ? l : ({
    ...l, entityIds: l.entityIds.includes(entityId) ? l.entityIds.filter((x) => x !== entityId) : [...l.entityIds, entityId],
  }));
  const rel = d.relationships[entityId];
  const relationships = rel ? { ...d.relationships, [entityId]: { ...rel, listIds: lists.filter((l) => l.entityIds.includes(entityId)).map((l) => l.id) } } : d.relationships;
  write({ ...d, lists, relationships });
}

export function createList(title: string, entityId?: string): PersonalList {
  const d = read();
  const l: PersonalList = { id: `l.${uid()}`, title: title.trim(), entityIds: entityId ? [entityId] : [], createdAt: TODAY };
  write({ ...d, lists: [...d.lists, l] });
  return l;
}

/* ─────────────────────────── zevk düzenleme ────────────────────────────── */

export function updateTasteDimension(key: string, weight: number) {
  const d = read();
  write({ ...d, taste: { ...d.taste, dimensions: { ...d.taste.dimensions, [key]: Math.max(0, Math.min(100, Math.round(weight))) }, updatedAt: TODAY } });
}
export function updateTasteCuisine(key: string, level: TasteLevel) {
  const d = read();
  write({ ...d, taste: { ...d.taste, cuisines: { ...d.taste.cuisines, [key]: level }, updatedAt: TODAY } });
}
export function toggleDislike(tag: string) {
  const d = read();
  const dislikes = d.taste.dislikes.includes(tag) ? d.taste.dislikes.filter((x) => x !== tag) : [...d.taste.dislikes, tag];
  write({ ...d, taste: { ...d.taste, dislikes, updatedAt: TODAY } });
}
export function resetTaste() {
  const d = read();
  write({ ...d, taste: { dimensions: {}, cuisines: {}, dislikes: [] } });
}

/* ─────────────────────────── takip · grup ──────────────────────────────── */

export function toggleFollow(userId: string) {
  const d = read();
  write({ ...d, follows: d.follows.includes(userId) ? d.follows.filter((x) => x !== userId) : [...d.follows, userId] });
}

export const groupVoteKey = (groupId: string, memberId: string) => `${groupId}|${memberId}`;
export function voteGroup(groupId: string, memberId: string, entityId: string, choice: GroupVoteChoice) {
  const d = read();
  const mid = groupVoteKey(groupId, memberId);
  write({ ...d, groupVotes: [...d.groupVotes.filter((v) => !(v.memberId === mid && v.entityId === entityId)), { memberId: mid, entityId, choice }] });
}
export function chooseForGroup(groupId: string, entityId: string) {
  const d = read();
  write({ ...d, groupChosen: { ...d.groupChosen, [groupId]: entityId } });
}

/* ─────────────────────────── sıfırlama ─────────────────────────────────── */

/** Etkin ad alanını sıfırlar: normal modda kullanıcı verisi temizlenir, sunum modunda başlangıç anlık görüntüsü geri gelir. */
export function resetDemo() {
  if (readMode() === "investor") { write(investorSnapshot()); return; }
  write(empty());
}

/* ─────────────────────────── V5 · geri bildirim · niyet ────────────────── */

export function submitFeedback(entityId: string, reason: string, surface: string) {
  const d = read();
  write({ ...d, feedback: [...d.feedback.filter((f) => f.entityId !== entityId), { entityId, reason, surface, createdAt: TODAY }] });
}
export function clearFeedback(entityId: string) {
  const d = read();
  write({ ...d, feedback: d.feedback.filter((f) => f.entityId !== entityId) });
}
export function recordIntent(text: string) {
  const t = text.trim();
  if (!t) return;
  const d = read();
  if (d.recentIntents[0]?.text === t) return;
  write({ ...d, recentIntents: [{ text: t, createdAt: TODAY }, ...d.recentIntents.filter((i) => i.text !== t)].slice(0, 5) });
}

/* ─────────────────────────── V5 · sunum (yatırımcı) modu ───────────────── */

/**
 * Tek belirleyici anlık görüntü: döngünün her aşamasında bir örnek.
 * Gerçek sinyal üretmez; yalnızca sunum ad alanını tohumlar. Normal kullanıcı verisine dokunmaz.
 */
export function investorSnapshot(): UserData {
  const base = empty();
  const rel = (entityId: string, state: UserEntityState, via: string, listIds: string[] = [], visitedAt?: string): UserEntityRelationship =>
    ({ entityId, state, via, listIds, updatedAt: TODAY, visitedAt });
  const lists = base.lists.map((l) =>
    l.id === "l.week" ? { ...l, entityIds: ["ent.moda-lokantasi"] } :
    l.id === "l.friends" ? { ...l, entityIds: ["ent.koz-durum"] } :
    l.id === "l.ist" ? { ...l, entityIds: ["ent.moda-lokantasi", "ent.balikci-sokagi"] } : l);
  /* Sakura kasıtlı olarak boş bırakılır: sunumda "Gitmek istiyorum → Gittim → tepki → deneyim" zinciri onunla canlı yürür. */
  return {
    ...base,
    lists,
    relationships: {
      "ent.moda-lokantasi": rel("ent.moda-lokantasi", "want_to_go", "ask", ["l.week", "l.ist"]),
      "ent.koz-durum": rel("ent.koz-durum", "saved", "topic", ["l.friends"]),
      "ent.balikci-sokagi": rel("ent.balikci-sokagi", "experienced", "write", ["l.ist"], "2026-08-29"),
      "ent.ates-steak": rel("ent.ates-steak", "visited", "visit", [], "2026-08-31"),
    },
    visits: [
      { id: "v.demo1", entityId: "ent.balikci-sokagi", userId: DEMO_USER_ID, visitedAt: "2026-08-29", source: "self_report" },
      { id: "v.demo2", entityId: "ent.ates-steak", userId: DEMO_USER_ID, visitedAt: "2026-08-31", source: "self_report" },
    ],
    reactions: [
      { id: "r.demo1", entityId: "ent.balikci-sokagi", userId: DEMO_USER_ID, mood: "çok iyi", returnIntent: "evet", note: "Balık taze, meze tabağı efsane.", createdAt: "2026-08-29", upgradedToExperienceId: "exp.demo1" },
      { id: "r.demo2", entityId: "ent.ates-steak", userId: DEMO_USER_ID, mood: "iyi", returnIntent: "emin değil", note: "Et iyi, servis yavaştı.", createdAt: "2026-08-31" },
    ],
    follows: ["u.denizyer"],
    recentIntents: [{ text: "Bu akşam Kadıköy'de sakin, iyi yemekli bir yer arıyorum.", createdAt: TODAY }],
    demoMode: "investor",
  };
}

/** Sunum moduna gir (normal veri olduğu gibi kalır) ve anlık görüntüyü kur. */
export function enterInvestorDemo(): UserData {
  try { window.localStorage.setItem(KEY_MODE, "investor"); } catch { /* yoksay */ }
  cache = null; cacheKey = null;
  const snap = investorSnapshot();
  write(snap);
  return snap;
}
/** Sunum modundan çık: sunum verisi silinir, normal kullanıcı verisine dönülür. */
export function exitInvestorDemo() {
  try { window.localStorage.removeItem(KEY_MODE); window.localStorage.removeItem(KEY_DEMO); } catch { /* yoksay */ }
  cache = null; cacheKey = null;
  listeners.forEach((l) => l());
}
/** Geriye uyumluluk: eski adı. */
export const seedInvestorDemo = enterInvestorDemo;
export function isInvestorDemo(): boolean { return readMode() === "investor"; }

/* ─────────────────────────── V5.1 · faydalı · bildir ───────────────────── */

export function toggleHelpful(experienceId: string) {
  const d = read();
  write({ ...d, helpful: d.helpful.includes(experienceId) ? d.helpful.filter((x) => x !== experienceId) : [...d.helpful, experienceId] });
}
export function saveBusinessDraft(experienceId: string, patch: { reply?: string; note?: string }) {
  const d = read();
  write({ ...d, businessDrafts: { ...d.businessDrafts, [experienceId]: { ...d.businessDrafts[experienceId], ...patch } } });
}
export function reportExperience(experienceId: string) {
  const d = read();
  if (d.reports.includes(experienceId)) return;
  write({ ...d, reports: [...d.reports, experienceId] });
}
