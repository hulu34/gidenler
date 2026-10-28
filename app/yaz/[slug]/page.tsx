import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEntity, getCategory, getSchema } from "@/lib/api";
import { WriteForm } from "./WriteForm";

/* Derlemede hiçbir deneyim yazma sayfası önceden üretilmez: sayfa ilk ziyarette sunucuda üretilir ve
   önbelleğe alınır (ISR, süresiz; yeni dağıtımda tazelenir). Dağıtım boyutu mekân sayısıyla büyümez.
   Bilinmeyen slug → notFound (404). */
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = getEntity(slug);
  return { title: e ? `${e.name} — deneyim yaz` : "Bulunamadı" };
}

export default async function WritePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entity = getEntity(slug);
  if (!entity) notFound();
  const category = getCategory(entity.categoryId);
  const schema = category && getSchema(category.ratingSchemaId);
  if (!category || !schema) notFound();

  return (
    <WriteForm
      entityId={entity.id}
      entityName={entity.name}
      entitySlug={entity.slug}
      categoryLabel={category.label}
      district={entity.location?.district}
      dimensions={schema.dimensions}
      returnQuestion={schema.returnQuestion}
      regulated={category.compliance.mode === "regulated"}
    />
  );
}
