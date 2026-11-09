import { DEMO_VISIBLE } from "@/data/demoFlag";

/* İŞLETME PANELİ ERİŞİMİ (Aşama 0) — tek karar noktası.
   Bugünkü panel yalnız demo verisi gösterir; gerçek sahiplik doğrulaması (business_members, oturum, rol) yok.
   Bu yüzden panel yalnız yatırımcı demosunda (NEXT_PUBLIC_SHOW_DEMO=true; veritabanı ve giriş kapalı) açılır.
   Gerçek panel geldiğinde bu fonksiyon oturum + sahiplik kontrolüyle değiştirilir; çağıran sayfalar değişmez. */
export function businessPanelAllowed(env: { demo: boolean } = { demo: DEMO_VISIBLE }): boolean {
  return env.demo;
}
