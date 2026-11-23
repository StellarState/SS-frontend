"use client";

import { useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_CONCENTRATION_THRESHOLD,
  type ConcentrationTab,
} from "@/lib/analytics/concentration";
import { usePortfolioConcentration } from "@/hooks/usePortfolioConcentration";
import { formatXLM } from "@/lib/format";
import { ExposureTreemap } from "./ExposureTreemap";

const TABS: Array<{ value: ConcentrationTab; label: string }> = [
  { value: "debtor", label: "Debtor" },
  { value: "issuer", label: "Issuer" },
  { value: "jurisdiction", label: "Jurisdiction" },
  { value: "maturity", label: "Maturity bucket" },
];

export interface ConcentrationPanelProps {
  /** Warning threshold in percent. Defaults to the documented 25%. */
  threshold?: number;
}

/**
 * Portfolio concentration view for issue #597.
 *
 * The panel is presentational apart from one hook. Grouping, shares and the
 * warning decision are pure functions, so the UI never computes money math.
 */
export function ConcentrationPanel({
  threshold = DEFAULT_CONCENTRATION_THRESHOLD,
}: ConcentrationPanelProps) {
  const [tab, setTab] = useState<ConcentrationTab>("debtor");
  const { groups, isLoading, isError, isEmpty } = usePortfolioConcentration(tab, threshold);

  return (
    <Card data-testid="concentration-panel">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              Portfolio concentration
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="How exposure is calculated"
                      data-testid="concentration-info"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Share is each segment&apos;s outstanding principal divided by the total
                    principal of your open positions. Segments above {threshold}% are flagged.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>
              See whether your portfolio depends on a few debtors or regions.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(value) => setTab(value as ConcentrationTab)}>
          <TabsList aria-label="Concentration grouping">
            {TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4 space-y-4" data-testid="concentration-content">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground" role="status">
                Loading concentration...
              </p>
            ) : isError ? (
              <p className="py-8 text-center text-sm text-destructive" role="alert">
                Concentration is unavailable right now.
              </p>
            ) : isEmpty ? (
              <p className="py-8 text-center text-sm text-muted-foreground" data-testid="concentration-empty">
                No open positions to measure.
              </p>
            ) : (
              <>
                <ExposureTreemap buckets={groups} />
                <Table data-testid="concentration-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment</TableHead>
                      <TableHead className="text-right">Outstanding principal</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((bucket) => (
                      <TableRow key={bucket.key} data-testid={`concentration-row-${bucket.key}`}>
                        <TableCell className="font-medium">{bucket.label}</TableCell>
                        <TableCell className="text-right">{formatXLM(bucket.principal)}</TableCell>
                        <TableCell className="text-right">{bucket.sharePercent}%</TableCell>
                        <TableCell className="text-right">
                          {bucket.warning ? (
                            <Badge variant="destructive" data-testid={`concentration-warning-${bucket.key}`}>
                              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                              High exposure
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
