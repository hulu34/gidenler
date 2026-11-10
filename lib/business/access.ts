import { DEMO_VISIBLE } from "@/data/demoFlag";

/* Gerçek sahiplik doğrulaması henüz yok. Panel bu nedenle yalnız sahte verili yatırımcı demosunda açılır. */
export function businessPanelAllowed(env: { demo: boolean } = { demo: DEMO_VISIBLE }): boolean {
  return env.demo;
}
