"use client";

import { createContext, useContext } from "react";
import type { PublishedMap } from "@/lib/score/publishedCards";

/* İstemci sayfaları için yayımlanmış puanlar; veri sunucudan bir kez gelir, ayrı istek yok. */
const Ctx = createContext<PublishedMap>({});
export const usePublished = () => useContext(Ctx);
export const PublishedProvider = ({ value, children }: { value: PublishedMap; children: React.ReactNode }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;
