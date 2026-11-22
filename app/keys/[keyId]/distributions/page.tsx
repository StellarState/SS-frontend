import { DistributionStatementsPanel } from "@/components/keys/DistributionStatementsPanel";

interface KeyDistributionsPageProps {
  params: Promise<{ keyId: string }>;
}

export default async function KeyDistributionsPage({
  params,
}: KeyDistributionsPageProps) {
  const { keyId } = await params;

  return (
    <main className="container mx-auto px-4 py-8">
      <DistributionStatementsPanel keyId={keyId} />
    </main>
  );
}
