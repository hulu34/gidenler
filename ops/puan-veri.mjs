/* CANLI · yalnız okuma: puan üretimi planı için deneyim verisinin hacmi (kalite raporu). Kişisel veri yok, yazım yok. */
const H = { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS };
const d = await (await fetch(`https://${process.env.ADAY_HOST}/api/admin/db/`, { headers: H })).json();
console.log(`env=${d.env} restoran=${d.quality?.restaurants} deneyimli_restoran=${d.quality?.restaurantFields?.reviews?.count} doğrulama/puan tablosu yok sayımı: rollbackSeed=${JSON.stringify(d.rollback?.migration ?? {})}`);
