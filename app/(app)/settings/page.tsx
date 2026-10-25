import SettingsForm from "@/components/SettingsForm";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsForm settings={settings} />;
}
