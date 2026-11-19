/** Source handoff for the two separate YorumS importers. JSON stdout only;
 * never writes catalog/DB state. Local export requires a clean committed tree. */
import { execFileSync } from "node:child_process";
import { realVenueRecords, invalidRecord } from "../data/real";
import { catalogPilotEnabled, catalogPreviewEnabled } from "../lib/catalogRegion";

if (!catalogPilotEnabled()) throw new Error("pilot_export_disabled");
let sourceCommit = process.env.VERCEL && catalogPreviewEnabled() ? process.env.VERCEL_GIT_COMMIT_SHA : undefined;
if (!sourceCommit) {
  if (execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()) throw new Error("pilot_export_requires_clean_commit");
  sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}
if (!/^[0-9a-f]{40}$/.test(sourceCommit)) throw new Error("pilot_source_sha_required");
const records = realVenueRecords.filter(r => r.bolge !== undefined);
if (records.length !== 1 || records[0].researchId !== "kibris/masamoro" || invalidRecord(records[0])) throw new Error("pilot_export_scope_mismatch");
console.log(JSON.stringify({ version: 1, sourceRepository: "hulu34/gidenler", sourceCommit, records }, null, 2));
