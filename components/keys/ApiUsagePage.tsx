"use client";
import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiUsage } from "@/hooks/useApiUsage";

interface ApiKey {
  id: string;
  label: string;
}

interface TopEndpoint {
  endpoint: string;
  count: number;
}

type DateRange = 7 | 30 | 90;

function getDateRange(days: DateRange): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

function QuotaGauge({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Quota used</span>
        <span className="font-medium">
          {used.toLocaleString()} / {limit.toLocaleString()} requests ({pct}%)
        </span>
      </div>
      <Progress value={pct} className="h-3" />
    </div>
  );
}

export interface ApiUsagePageProps {
  apiKeys?: ApiKey[];
}

export function ApiUsagePage({ apiKeys = [] }: ApiUsagePageProps) {
  const [selectedKeyId, setSelectedKeyId] = useState<string>(
    apiKeys[0]?.id ?? ""
  );
  const [dateRange, setDateRange] = useState<DateRange>(7);
  const { from, to } = getDateRange(dateRange);
  const { data, isLoading, isError } = useApiUsage(selectedKeyId, from, to);

  const topEndpoints: TopEndpoint[] = data
    ? [...(data as any).topEndpoints ?? []].sort(
        (a: TopEndpoint, b: TopEndpoint) => b.count - a.count
      )
    : [];

  const hasActivity = data && data.days.some((d) => d.requests > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Select
            value={selectedKeyId}
            onValueChange={setSelectedKeyId}
            disabled={apiKeys.length === 0}
          >
            <SelectTrigger data-testid="key-selector">
              <SelectValue placeholder="Select a key" />
            </SelectTrigger>
            <SelectContent>
              {apiKeys.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1">
          {([7, 30, 90] as DateRange[]).map((d) => (
            <Button
              key={d}
              variant={dateRange === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(d)}
              data-testid={`range-${d}`}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {!selectedKeyId && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Select a key to view usage data.
          </CardContent>
        </Card>
      )}

      {selectedKeyId && isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {selectedKeyId && isError && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Failed to load usage data.
          </CardContent>
        </Card>
      )}

      {selectedKeyId && data && (
        <>
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">Quota</h2>
            </CardHeader>
            <CardContent>
              <QuotaGauge used={data.quotaUsed} limit={data.quotaLimit} />
            </CardContent>
          </Card>

          {!hasActivity ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No requests recorded in this period.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <h2 className="text-base font-semibold">
                    Requests per day
                  </h2>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.days} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          new Date(v).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number) => [
                          value.toLocaleString(),
                          "Requests",
                        ]}
                      />
                      <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="text-base font-semibold">Error rate</h2>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={data.days} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          new Date(v).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="errors"
                        stroke="hsl(var(--destructive))"
                        dot={false}
                        name="Errors"
                      />
                      <Line
                        type="monotone"
                        dataKey="rateLimitHits"
                        stroke="hsl(var(--warning, 38 92% 50%))"
                        dot={false}
                        name="Rate limit hits"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {topEndpoints.length > 0 && (
                <Card>
                  <CardHeader>
                    <h2 className="text-base font-semibold">Top endpoints</h2>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Endpoint</TableHead>
                          <TableHead className="text-right">Requests</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topEndpoints.map((ep) => (
                          <TableRow key={ep.endpoint}>
                            <TableCell className="font-mono text-sm">
                              {ep.endpoint}
                            </TableCell>
                            <TableCell className="text-right">
                              {ep.count.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
