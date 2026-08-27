"use client";

import { UserProfile } from "@/components/dashboard/UserProfile";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ProfilePage() {
  usePageTitle("Profile");

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>
      <UserProfile />
    </main>
  );
}
