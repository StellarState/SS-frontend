"use client";
import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSupportTicketDetail,
  useReplySupportTicket,
} from "@/hooks/useSupportTickets";

interface TicketDetailProps {
  ticketId: string;
}

export function TicketDetail({ ticketId }: TicketDetailProps) {
  const { data: ticket, isLoading, isError } = useSupportTicketDetail(ticketId);
  const replyMutation = useReplySupportTicket(ticketId);
  const [replyBody, setReplyBody] = useState("");

  const handleSend = async () => {
    if (!replyBody.trim()) return;
    await replyMutation.mutateAsync(replyBody.trim());
    setReplyBody("");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8 space-y-4" data-testid="ticket-detail-loading">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-destructive" role="alert" data-testid="ticket-detail-error">
          Failed to load ticket. Please try again.
        </p>
        <Link href="/help/tickets" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/help/tickets"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to tickets"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold" data-testid="ticket-detail-subject">
          {ticket.subject}
        </h1>
      </div>

      {/* Conversation thread */}
      <Card data-testid="ticket-thread">
        <CardContent className="pt-4 space-y-0">
          {ticket.messages.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No messages yet.</p>
          )}
          {ticket.messages.map((msg, i) => (
            <div key={msg.id}>
              {i > 0 && <Separator className="my-4" />}
              <div
                className="space-y-1"
                data-testid={`ticket-message-${msg.id}`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{msg.sender}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.timestamp).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="text-sm">{msg.body}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Reply box — hidden for resolved tickets */}
      {ticket.status !== "resolved" && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <p className="text-sm font-medium">Reply</p>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <textarea
              rows={4}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write your reply…"
              data-testid="ticket-reply-input"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={!replyBody.trim() || replyMutation.isPending}
              data-testid="ticket-send-button"
            >
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              {replyMutation.isPending ? "Sending…" : "Send"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
