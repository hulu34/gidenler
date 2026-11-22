import { DEMO_VISIBLE } from "@/data/demoFlag";
import { articles } from "@/lib/seckisi";
import { SemtHarita } from "@/components/map/SemtHarita";
import { HaritaDemo } from "./HaritaDemo";

export default function MapPage() {
  if (DEMO_VISIBLE) return <HaritaDemo />;
  const secki = [...new Set(articles().flatMap((a) => a.venues.map((v) => v.slug)))];
  return <SemtHarita secki={secki} />;
}
