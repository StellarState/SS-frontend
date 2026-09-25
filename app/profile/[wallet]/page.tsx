import { CreatorProfile } from "@/components/profile/CreatorProfile";

/**
 * Public creator profile page (#319).
 *
 * Loads a seller's public profile by wallet address route param. Publicly
 * accessible — no wallet connection or authentication required.
 */
export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet } = await params;

  return (
    <main className="container mx-auto px-4 py-8">
      <CreatorProfile wallet={decodeURIComponent(wallet)} />
    </main>
  );
}
