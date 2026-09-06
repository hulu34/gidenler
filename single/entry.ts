import * as api from "@/lib/api";
import * as fmt from "@/lib/format";
import { indices, expectations } from "@/data/market";
import { lists } from "@/data/lists";
import { entities } from "@/data/entities";
import { users } from "@/data/users";

(globalThis as unknown as { G: unknown }).G = { ...api, ...fmt, indices, expectations, lists, entities, users };
