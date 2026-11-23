"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Flag,
  MessageSquare,
  PlusCircle,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { truncateAddress } from "@/lib/stellar";
import {
  addCommentToThread,
  createDiscussionThread,
  filterDiscussionThreads,
  getVisibleCommentContent,
  loadInvoiceThreads,
  reportComment,
  saveInvoiceThreads,
  setThreadResolvedState,
  MAX_COMMENT_LENGTH,
  type DiscussionFilter,
  type DiscussionThread,
} from "@/lib/discussion";

interface InvoiceDiscussionThreadProps {
  invoiceId: string;
  issuerAddress: string;
  currentUserAddress?: string | null;
  initialThreads?: DiscussionThread[];
  className?: string;
}

export function InvoiceDiscussionThread({
  invoiceId,
  issuerAddress,
  currentUserAddress,
  initialThreads,
  className,
}: InvoiceDiscussionThreadProps) {
  const [threads, setThreads] = useState<DiscussionThread[]>(() => {
    if (initialThreads && initialThreads.length > 0) return initialThreads;
    const stored = loadInvoiceThreads(invoiceId);
    if (stored.length > 0) return stored;

    // Seed default sample threads for showcase
    const defaultThreads: DiscussionThread[] = [
      {
        id: `th-${invoiceId}-1`,
        invoiceId,
        title: "Settlement terms & late interest policy",
        authorAddress: "GBV4INVESTORX1234567890ABCDEF",
        isResolved: true,
        resolvedAt: new Date(Date.now() - 3600000).toISOString(),
        resolvedBy: issuerAddress,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        comments: [
          {
            id: `cm-${invoiceId}-1`,
            threadId: `th-${invoiceId}-1`,
            invoiceId,
            authorAddress: "GBV4INVESTORX1234567890ABCDEF",
            isIssuer: false,
            content: "What grace period is applicable before late interest starts accruing?",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            isReported: false,
            moderationStatus: "approved",
          },
          {
            id: `cm-${invoiceId}-2`,
            threadId: `th-${invoiceId}-1`,
            invoiceId,
            authorAddress: issuerAddress,
            isIssuer: true,
            content: "There is a 3-day grace period, after which statutory late interest of 5% p.a. applies.",
            createdAt: new Date(Date.now() - 40000000).toISOString(),
            isReported: false,
            moderationStatus: "approved",
          },
        ],
      },
      {
        id: `th-${invoiceId}-2`,
        invoiceId,
        title: "Bill of Lading verification documentation",
        authorAddress: "GDA9INVESTORY9876543210FEDCBA",
        isResolved: false,
        createdAt: new Date(Date.now() - 10000000).toISOString(),
        comments: [
          {
            id: `cm-${invoiceId}-3`,
            threadId: `th-${invoiceId}-2`,
            invoiceId,
            authorAddress: "GDA9INVESTORY9876543210FEDCBA",
            isIssuer: false,
            content: "Has the port authority signed the electronic bill of lading?",
            createdAt: new Date(Date.now() - 10000000).toISOString(),
            isReported: false,
            moderationStatus: "approved",
          },
        ],
      },
    ];
    return defaultThreads;
  });

  const [activeFilter, setActiveFilter] = useState<DiscussionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [reportReason, setReportReason] = useState<Record<string, string>>({});
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);

  const isIssuer = currentUserAddress === issuerAddress;

  const updateThreads = (next: DiscussionThread[]) => {
    setThreads(next);
    saveInvoiceThreads(invoiceId, next);
  };

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserAddress) return;
    if (!newTitle.trim() || !newContent.trim()) return;

    const thread = createDiscussionThread(
      invoiceId,
      newTitle,
      newContent,
      currentUserAddress,
      isIssuer,
    );

    updateThreads([thread, ...threads]);
    setNewTitle("");
    setNewContent("");
    setShowNewThread(false);
  };

  const handleAddReply = (threadId: string) => {
    if (!currentUserAddress) return;
    const content = replyContent[threadId]?.trim();
    if (!content) return;

    const targetThread = threads.find((t) => t.id === threadId);
    if (!targetThread) return;

    const updated = addCommentToThread(
      targetThread,
      content,
      currentUserAddress,
      isIssuer,
    );

    updateThreads(threads.map((t) => (t.id === threadId ? updated : t)));
    setReplyContent((prev) => ({ ...prev, [threadId]: "" }));
  };

  const handleToggleResolved = (thread: DiscussionThread) => {
    if (!currentUserAddress) return;
    const updated = setThreadResolvedState(
      thread,
      !thread.isResolved,
      currentUserAddress,
    );
    updateThreads(threads.map((t) => (t.id === thread.id ? updated : t)));
  };

  const handleReportComment = (threadId: string, commentId: string) => {
    const reason = reportReason[commentId]?.trim() || "Inappropriate or confidential content";
    const targetThread = threads.find((t) => t.id === threadId);
    if (!targetThread) return;

    const updated = reportComment(targetThread, commentId, reason);
    updateThreads(threads.map((t) => (t.id === threadId ? updated : t)));
    setReportingCommentId(null);
  };

  const filteredThreads = filterDiscussionThreads(threads, activeFilter, searchQuery);

  return (
    <Card className={className} data-testid="invoice-discussion-threads">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Discussion & Q&A
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Public scoped questions for investors and the verified invoice issuer.
          </p>
        </div>

        {currentUserAddress ? (
          <Button
            size="sm"
            onClick={() => setShowNewThread(!showNewThread)}
            className="gap-1.5"
            data-testid="new-thread-btn"
          >
            <PlusCircle className="h-4 w-4" />
            {showNewThread ? "Cancel" : "Ask Question"}
          </Button>
        ) : (
          <Badge variant="outline" className="text-muted-foreground" data-testid="auth-required-badge">
            Connect wallet to ask questions
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* New Thread Composer */}
        {showNewThread && (
          <form
            onSubmit={handleCreateThread}
            className="rounded-lg border p-4 bg-muted/20 space-y-3"
            data-testid="new-thread-form"
          >
            <div className="space-y-1">
              <Label htmlFor="thread-title" className="text-xs font-semibold">
                Question Topic / Title
              </Label>
              <Input
                id="thread-title"
                data-testid="thread-title-input"
                placeholder="e.g. Due date grace period, transport insurance..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="thread-content" className="text-xs font-semibold">
                  Details
                </Label>
                <span
                  className="text-[11px] text-muted-foreground"
                  data-testid="char-countdown"
                >
                  {MAX_COMMENT_LENGTH - newContent.length} characters left
                </span>
              </div>
              <Textarea
                id="thread-content"
                data-testid="thread-content-input"
                rows={3}
                placeholder="Ask specific, clear questions regarding this listing..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                maxLength={MAX_COMMENT_LENGTH}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewThread(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" data-testid="submit-thread-btn">
                Post Question
              </Button>
            </div>
          </form>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={activeFilter}
            onValueChange={(v) => setActiveFilter(v as DiscussionFilter)}
            className="w-full sm:w-auto"
          >
            <TabsList data-testid="discussion-filter-tabs">
              <TabsTrigger
                value="all"
                data-testid="filter-all"
                onClick={() => setActiveFilter("all")}
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="unanswered"
                data-testid="filter-unanswered"
                onClick={() => setActiveFilter("unanswered")}
              >
                Unanswered
              </TabsTrigger>
              <TabsTrigger
                value="issuer_reply"
                data-testid="filter-issuer-reply"
                onClick={() => setActiveFilter("issuer_reply")}
              >
                Issuer Replies
              </TabsTrigger>
              <TabsTrigger
                value="resolved"
                data-testid="filter-resolved"
                onClick={() => setActiveFilter("resolved")}
              >
                Resolved
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9"
              data-testid="discussion-search-input"
            />
          </div>
        </div>

        {/* Thread List */}
        {filteredThreads.length === 0 ? (
          <div
            className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground"
            data-testid="no-threads-message"
          >
            No discussion threads match your filter criteria.
          </div>
        ) : (
          <div className="space-y-4" data-testid="threads-list">
            {filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className="rounded-lg border p-4 space-y-3 bg-card"
                data-testid={`thread-card-${thread.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-2">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <span>{thread.title}</span>
                      {thread.isResolved && (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-600 text-[10px] gap-1"
                          data-testid="resolved-badge"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Resolved
                        </Badge>
                      )}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Started by {truncateAddress(thread.authorAddress)} ·{" "}
                      {new Date(thread.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {(isIssuer || currentUserAddress === thread.authorAddress) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      data-testid={`toggle-resolve-${thread.id}`}
                      onClick={() => handleToggleResolved(thread)}
                    >
                      {thread.isResolved ? "Reopen Thread" : "Mark Resolved"}
                    </Button>
                  )}
                </div>

                {/* Comments List */}
                <div className="space-y-2.5 pl-2 border-l-2 border-muted">
                  {thread.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="space-y-1 text-xs"
                      data-testid={`comment-${comment.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-medium">
                            {truncateAddress(comment.authorAddress)}
                          </span>
                          {comment.isIssuer && (
                            <Badge
                              className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-[10px] gap-1 px-1.5 py-0"
                              data-testid="issuer-verified-badge"
                            >
                              <BadgeCheck className="h-3 w-3" /> Verified Issuer
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {currentUserAddress && (
                          <button
                            type="button"
                            onClick={() =>
                              setReportingCommentId(
                                reportingCommentId === comment.id ? null : comment.id,
                              )
                            }
                            className="text-muted-foreground hover:text-destructive flex items-center gap-0.5 text-[10px]"
                            data-testid={`report-btn-${comment.id}`}
                          >
                            <Flag className="h-2.5 w-2.5" /> Report
                          </button>
                        )}
                      </div>

                      <p
                        className={`text-foreground/90 ${
                          comment.moderationStatus === "pending_review"
                            ? "italic text-muted-foreground"
                            : ""
                        }`}
                        data-testid={`comment-content-${comment.id}`}
                      >
                        {getVisibleCommentContent(comment, false, currentUserAddress ?? undefined)}
                      </p>

                      {/* Moderation report form */}
                      {reportingCommentId === comment.id && (
                        <div className="mt-2 rounded border border-destructive/30 bg-destructive/5 p-2 space-y-2">
                          <p className="font-semibold text-destructive text-[11px] flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Report Comment to Moderators
                          </p>
                          <Input
                            placeholder="Reason (e.g. offensive, confidential info)..."
                            value={reportReason[comment.id] || ""}
                            onChange={(e) =>
                              setReportReason({ ...reportReason, [comment.id]: e.target.value })
                            }
                            className="h-7 text-xs"
                            data-testid={`report-reason-input-${comment.id}`}
                          />
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px]"
                              onClick={() => setReportingCommentId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-6 text-[10px]"
                              onClick={() => handleReportComment(thread.id, comment.id)}
                              data-testid={`confirm-report-${comment.id}`}
                            >
                              Submit Report
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Reply Composer */}
                {currentUserAddress && (
                  <div className="pt-2 flex gap-2" data-testid={`reply-composer-${thread.id}`}>
                    <Input
                      placeholder={
                        isIssuer ? "Reply as verified issuer..." : "Post a reply..."
                      }
                      value={replyContent[thread.id] || ""}
                      onChange={(e) =>
                        setReplyContent({ ...replyContent, [thread.id]: e.target.value })
                      }
                      maxLength={MAX_COMMENT_LENGTH}
                      className="text-xs h-8"
                      data-testid={`reply-input-${thread.id}`}
                    />
                    <Button
                      size="sm"
                      className="h-8 text-xs shrink-0"
                      onClick={() => handleAddReply(thread.id)}
                      data-testid={`reply-submit-${thread.id}`}
                    >
                      Reply
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
