"use client";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupportTickets, type TicketStatus } from "@/hooks/useSupportTickets";

const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; className: string }
> = {
  open: { label: "Open", className: "bg-blue-100 text-blue-800" },
  "in-progress": {
    label: "In Progress",
    className: "bg-yellow-100 text-yellow-800",
  },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-800" },
};

export function TicketListPage() {
  const { data: tickets, isLoading, isError } = useSupportTickets();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Support Tickets</h1>
        <Link
          href="/help/support"
          className="text-sm text-primary hover:underline"
          data-testid="new-ticket-link"
        >
          + New ticket
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3" data-testid="tickets-loading">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-2 h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <p
          className="text-sm text-destructive"
          role="alert"
          data-testid="tickets-error"
        >
          Failed to load tickets. Please refresh the page.
        </p>
      )}

      {!isLoading && !isError && tickets?.length === 0 && (
        <div
          className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground"
          data-testid="tickets-empty"
        >
          <p>You have no support tickets.</p>
          <Link
            href="/help/support"
            className="mt-2 inline-block text-primary hover:underline"
          >
            Contact support
          </Link>
        </div>
      )}

      {tickets && tickets.length > 0 && (
        <ul className="space-y-3" data-testid="ticket-list">
          {tickets.map((ticket) => {
            const statusCfg =
              STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
            return (
              <li key={ticket.id}>
                <Link href={`/help/tickets/${ticket.id}`}>
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="font-medium leading-snug"
                          data-testid={`ticket-subject-${ticket.id}`}
                        >
                          {ticket.subject}
                        </p>
                        <Badge
                          className={statusCfg.className}
                          data-testid={`ticket-status-${ticket.id}`}
                        >
                          {statusCfg.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4 pt-0">
                      <p className="text-xs text-muted-foreground">
                        {ticket.category}
                      </p>
                      <p
                        className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"
                        data-testid={`ticket-updated-${ticket.id}`}
                      >
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        Last updated{" "}
                        {new Date(ticket.updatedAt).toLocaleDateString(
                          undefined,
                          { dateStyle: "medium" }
                        )}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
