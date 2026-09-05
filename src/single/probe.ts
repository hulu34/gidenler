import * as D from "@/lib/decision";
import { entities } from "@/data/entities";
(globalThis as unknown as { P: unknown }).P = { ...D, entities };
