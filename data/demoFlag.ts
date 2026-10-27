/** Demo veri yalnız ayrı önizleme dağıtımında görünür (NEXT_PUBLIC_SHOW_DEMO=true). Varsayılan: kapalı.
    Demo kayıtlar silinmez; testler ve önizleme için kaynak dosyalarda durur. */
export const DEMO_VISIBLE = process.env.NEXT_PUBLIC_SHOW_DEMO === "true";
