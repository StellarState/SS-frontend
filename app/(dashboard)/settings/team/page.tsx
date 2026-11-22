import { TeamPage } from "@/components/settings/TeamPage";

// #645 — Team accounts with role-based access for issuer companies.
export default function SettingsTeamPage() {
  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Team</h1>
      <TeamPage />
    </main>
  );
}
