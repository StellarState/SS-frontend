"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useContractRegistry, type ContractRegistryResult } from "@/hooks/useContractRegistry";
import { ContractTable } from "./ContractTable";

interface TrustPageProps {
  /** Injectable registry data for tests and server-rendered snapshots. */
  registry?: ContractRegistryResult;
}

function Section({
  title,
  children,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <section data-testid={testId}>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

/** Public trust and security page body (issue #655). */
export function TrustPage({ registry }: TrustPageProps) {
  const live = useContractRegistry();
  const { contracts, audits, config, isLoading } = registry ?? live;

  return (
    <div className="space-y-6">
      <Section title="Custody model" testId="trust-custody">
        <p>{config.custody}</p>
      </Section>

      <Section title="Security audits" testId="trust-audits">
        {audits.length === 0 ? (
          <p data-testid="audit-empty">Audit reports will be published here when available.</p>
        ) : (
          <ul className="space-y-3">
            {audits.map((audit) => (
              <li
                key={`${audit.auditor}-${audit.date}`}
                className="rounded-md border p-3"
                data-testid="audit-row"
              >
                <p className="font-medium text-foreground">{audit.auditor}</p>
                <p>{audit.date}</p>
                <p>{audit.scope}</p>
                <a
                  href={audit.reportUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                  data-testid="audit-report-link"
                >
                  Download report
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="KYC and AML" testId="trust-kyc-aml">
        <p>{config.kycAml}</p>
      </Section>

      <Section title="Insurance" testId="trust-insurance">
        <p>{config.insurance}</p>
      </Section>

      <Section title="Incident history" testId="trust-incidents">
        <p>{config.incidents}</p>
      </Section>

      <section data-testid="trust-contracts">
        <Card>
          <CardHeader>
            <CardTitle>Verified contracts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2" data-testid="contract-table-loading">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            ) : (
              <ContractTable contracts={contracts} />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
