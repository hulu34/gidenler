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

const KEY = "gidenler.v4";
const TODAY = "2026-09-02";

export interface UserData {
  relationships: Record<string, UserEntityRelationship>;
  visits: VisitSignal[];
  reactions: QuickReaction[];
  lists: PersonalList[];
  taste: TasteEdits;
  follows: string[];          // user ids
  groupVotes: GroupVote[];
  groupChosen: Record<string, string>;
}

const DEFAULT_LISTS: PersonalList[] = [
  { id: "l.week", title: "Bu hafta", entityIds: [], createdAt: TODAY, isDefault: true },
  { id: "l.date", title: "Date", entityIds: [], createdAt: TODAY, isDefault: true },
  { id: "l.ist", title: "İstanbul listem", entityIds: [], createdAt: TODAY, isDefault: true },
  { id: "l.friends", title: "Arkadaşlarla", entityIds: [], createdAt: TODAY, isDefault: true },
];

const empty = (): UserData => ({
  relationships: {}, visits: [], reactions: [], lists: DEFAULT_LISTS.map((l) => ({ ...l, entityIds: [] })),
  taste: { dimensions: {}, cuisines: {}, dislikes: [] }, follows: [], groupVotes: [], groupChosen: {},
});

let cache: UserData | null = null;
const listeners = new Set<() => void>();

function read(): UserData {
  if (cache) return cache;
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...empty(), ...(JSON.parse(raw) as UserData) } : empty();
  } catch { cache = empty(); }
  return cache;
}

function write(next: UserData) {
  cache = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* özel pencere vb. */ }
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

/* ─────────────────────────── demo sıfırlama ────────────────────────────── */

export function resetDemo() { write(empty()); }
