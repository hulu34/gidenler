import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEMO_VISIBLE } from "@/data/demoFlag";
import { DISTRICTS } from "@/lib/oneri";
import { OnerForm } from "./OnerForm";

export const metadata: Metadata = { title: "Mekân öner", robots: { index: false, follow: true }, alternates: { canonical: "/nerede-yedin/oner/" } };

export default function OnerPage() {
  if (DEMO_VISIBLE) notFound();
  return <OnerForm districts={DISTRICTS} />;
}
