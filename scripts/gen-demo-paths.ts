/* Demo adres listesi — middleware.ts için (demo kapalıyken eski demo adreslerini açıklama sayfasına yönlendirir).
   Kullanım: npx tsx scripts/gen-demo-paths.ts   (demo veri değişirse yeniden üret; dbtest eşitliği kontrol eder) */
import { writeFileSync } from "node:fs";
import { allEntities } from "../data/entities";
import { allLists } from "../data/lists";
import { allUsers } from "../data/users";

export function demoPaths() {
  return {
    entities: allEntities.filter((e) => e.isDemo).map((e) => e.slug).sort(),
    lists: allLists.filter((l) => l.isDemo).map((l) => l.slug).sort(),
    users: allUsers.filter((u) => u.isDemo).map((u) => u.handle).sort(),
  };
}
if (process.argv[1]?.endsWith("gen-demo-paths.ts")) {
  const p = demoPaths();
  writeFileSync(new URL("../data/demoPaths.json", import.meta.url), JSON.stringify(p) + "\n");
  console.log(`demo adresleri: ${p.entities.length} mekân, ${p.lists.length} liste, ${p.users.length} kişi`);
}
