"use client";

import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";

interface InformationalPageProps {
  title: string;
  description: string;
  sections: Array<{ heading: string; body: string }>;
}

/** Small shared layout for the public About, Terms and Privacy pages. */
export function InformationalPage({ title, description, sections }: InformationalPageProps) {
  usePageTitle(title);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 pb-24 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>
      {sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h2 className="text-lg font-semibold">{section.heading}</h2>
          <p className="text-sm text-muted-foreground">{section.body}</p>
        </section>
      ))}
      <p className="text-sm">
        Security practices and contract addresses are published on the{" "}
        <Link href="/trust" className="underline underline-offset-2">
          Trust and Security page
        </Link>
        .
      </p>
    </main>
  );
}
