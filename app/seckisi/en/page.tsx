import { HomeView, homeMetadata } from "../sayfa";

export const revalidate = 3600;
export const metadata = homeMetadata("en");
export default function EditPage() { return <HomeView lang="en" />; }
