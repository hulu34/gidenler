import { HomeView, homeMetadata } from "./sayfa";

export const revalidate = 3600;
export const metadata = homeMetadata("tr");
export default function SeckiPage() { return <HomeView lang="tr" />; }
