import type { CompliancePolicy } from "@/lib/types";

/**
 * Regüle kategorilerde kısıtın gerekçesini kullanıcıya gösterir.
 * Kural arayüzde saklanmaz — güven ürünün parçasıdır.
 */
export function ComplianceNotice({ policy, noun }: { policy: CompliancePolicy; noun: string }) {
  if (policy.mode !== "regulated") return null;
  return (
    <section className="flex flex-col gap-3 border-t-2 border-neg pt-5">
      <h2 className="label" style={{ color: "var(--neg-ink)" }}>
        Bu kategoride puan ve özet yok
      </h2>
      <p className="max-w-[70ch] text-[14.5px] leading-relaxed text-ink-2">
        Gidenler bu kategoride <strong className="font-semibold text-ink">puan üretmez ve özet cümlesi kurmaz.</strong>{" "}
        Adı geçen bir {noun} hakkında hüküm veren bir puan ya da cümle, platformun kendi ağzından
        konuşması olur; bu da 5651 sayılı kanundaki yer sağlayıcı korumasının dışına çıkmak
        anlamına gelir. Aşağıdaki sayılar yorum değil, deneyimlerde geçen konuların sayımıdır.
      </p>
      {policy.basis && (
        <p className="max-w-[70ch] border-t border-line pt-3 text-[12px] leading-relaxed text-ink-3">
          <span className="font-semibold text-ink-2">Dayanak: </span>
          {policy.basis}
        </p>
      )}
    </section>
  );
}
