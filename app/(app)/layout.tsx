import AppShell from "@/components/AppShell";
import { getSettings } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return <AppShell bakeryName={settings.bakery_name}>{children}</AppShell>;
}
