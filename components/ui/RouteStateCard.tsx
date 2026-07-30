import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RouteStateCardProps {
  title: string;
  message: string;
}

export function RouteStateCard({ title, message }: RouteStateCardProps) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-8 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Oops
        </p>
        <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        <Button asChild className="mt-6">
          <Link href="/marketplace">Go to Marketplace</Link>
        </Button>
      </div>
    </main>
  );
}
