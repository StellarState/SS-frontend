"use client";
/**
 * Full glossary page component (issue #624)
 *
 * Searchable, alphabetically grouped list of finance terms.
 * Each entry shows its definition and links to related terms.
 */
import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import glossaryData from "@/src/content/glossary.json";

export function GlossaryPage() {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? glossaryData.filter(
        (entry) =>
          entry.term.toLowerCase().includes(query.toLowerCase()) ||
          entry.definition.toLowerCase().includes(query.toLowerCase())
      )
    : glossaryData;

  // Group by first letter
  const grouped = filtered.reduce<Record<string, typeof filtered>>(
    (acc, entry) => {
      const letter = entry.term[0].toUpperCase();
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(entry);
      return acc;
    },
    {}
  );
  const letters = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance Glossary</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Definitions of key terms used across the platform.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms…"
          className="pl-9"
          aria-label="Search glossary"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No terms match &ldquo;{query}&rdquo;.
        </p>
      )}

      {letters.map((letter, letterIdx) => (
        <div key={letter}>
          <h2
            id={`letter-${letter}`}
            className="mb-3 text-xl font-semibold text-muted-foreground"
          >
            {letter}
          </h2>
          <div className="space-y-3">
            {grouped[letter].map((entry) => (
              <Card key={entry.term} id={encodeURIComponent(entry.term.toLowerCase())}>
                <CardHeader className="pb-1 pt-4">
                  <h3 className="font-semibold">{entry.term}</h3>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                  <p className="text-sm text-muted-foreground">{entry.definition}</p>
                  {entry.related.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Related:{" "}
                      {entry.related.map((r, i) => (
                        <span key={r}>
                          {i > 0 && ", "}
                          <Link
                            href={`#${encodeURIComponent(r.toLowerCase())}`}
                            className="underline hover:text-foreground"
                          >
                            {r}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {letterIdx < letters.length - 1 && <Separator className="mt-4" />}
        </div>
      ))}
    </div>
  );
}
