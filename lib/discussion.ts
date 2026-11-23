/**
 * Invoice Discussion Threads with Moderation (#661)
 *
 * Scoped questions and answers for invoices:
 * - Thread listing with unanswered, issuer-reply, and resolved filters
 * - Search across all threads (including resolved)
 * - Character-limited composer (max 500 chars)
 * - Verified badge for issuer replies
 * - Issuers can mark threads as resolved
 * - Community moderation: report action sends comment to moderator review
 * - Public approved threads are visible without exposing private data
 */

export interface DiscussionComment {
  id: string;
  threadId: string;
  invoiceId: string;
  authorAddress: string;
  authorName?: string;
  isIssuer: boolean;
  content: string; // Max 500 chars
  createdAt: string;
  isReported: boolean;
  moderationStatus: "approved" | "pending_review" | "rejected";
  reportReason?: string;
}

export interface DiscussionThread {
  id: string;
  invoiceId: string;
  title: string;
  authorAddress: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  comments: DiscussionComment[];
}

export type DiscussionFilter = "all" | "unanswered" | "issuer_reply" | "resolved";

export const MAX_COMMENT_LENGTH = 500;

/**
 * Filters and searches discussion threads based on tab and query.
 * Resolved threads remain searchable per acceptance criteria.
 */
export function filterDiscussionThreads(
  threads: DiscussionThread[],
  filter: DiscussionFilter = "all",
  searchQuery = "",
): DiscussionThread[] {
  let result = threads;

  // 1. Tab filters
  switch (filter) {
    case "unanswered":
      result = result.filter(
        (t) => !t.isResolved && t.comments.every((c) => !c.isIssuer),
      );
      break;
    case "issuer_reply":
      result = result.filter((t) => t.comments.some((c) => c.isIssuer));
      break;
    case "resolved":
      result = result.filter((t) => t.isResolved);
      break;
    case "all":
    default:
      break;
  }

  // 2. Search query filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.comments.some((c) => c.content.toLowerCase().includes(q)),
    );
  }

  return result;
}

/**
 * Sanitizes comment content for public viewing.
 * Comments under moderator review display a placeholder without private data.
 */
export function getVisibleCommentContent(
  comment: DiscussionComment,
  isModerator = false,
  viewerAddress?: string,
): string {
  if (comment.moderationStatus === "pending_review" && !isModerator && viewerAddress !== comment.authorAddress) {
    return "[This comment has been reported and is currently under moderator review.]";
  }
  if (comment.moderationStatus === "rejected") {
    return "[This comment was removed by moderation policy.]";
  }
  return comment.content;
}

/**
 * Creates a new discussion thread.
 */
export function createDiscussionThread(
  invoiceId: string,
  title: string,
  initialComment: string,
  authorAddress: string,
  isIssuer = false,
  now = new Date(),
): DiscussionThread {
  if (!title.trim()) throw new Error("Thread title is required");
  if (!initialComment.trim()) throw new Error("Comment content is required");
  if (initialComment.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment exceeds maximum limit of ${MAX_COMMENT_LENGTH} characters`);
  }

  const threadId = `th-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const commentId = `cm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: threadId,
    invoiceId,
    title: title.trim(),
    authorAddress,
    isResolved: false,
    createdAt: now.toISOString(),
    comments: [
      {
        id: commentId,
        threadId,
        invoiceId,
        authorAddress,
        isIssuer,
        content: initialComment.trim(),
        createdAt: now.toISOString(),
        isReported: false,
        moderationStatus: "approved",
      },
    ],
  };
}

/**
 * Adds a reply comment to an existing thread.
 */
export function addCommentToThread(
  thread: DiscussionThread,
  content: string,
  authorAddress: string,
  isIssuer = false,
  now = new Date(),
): DiscussionThread {
  if (!content.trim()) throw new Error("Comment content cannot be empty");
  if (content.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment exceeds maximum limit of ${MAX_COMMENT_LENGTH} characters`);
  }

  const newComment: DiscussionComment = {
    id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    threadId: thread.id,
    invoiceId: thread.invoiceId,
    authorAddress,
    isIssuer,
    content: content.trim(),
    createdAt: now.toISOString(),
    isReported: false,
    moderationStatus: "approved",
  };

  return {
    ...thread,
    comments: [...thread.comments, newComment],
  };
}

/**
 * Resolves or reopens a discussion thread (issuer action).
 */
export function setThreadResolvedState(
  thread: DiscussionThread,
  isResolved: boolean,
  actorAddress: string,
  now = new Date(),
): DiscussionThread {
  return {
    ...thread,
    isResolved,
    resolvedAt: isResolved ? now.toISOString() : undefined,
    resolvedBy: isResolved ? actorAddress : undefined,
  };
}

/**
 * Reports a comment to enter moderator review.
 */
export function reportComment(
  thread: DiscussionThread,
  commentId: string,
  reason: string,
): DiscussionThread {
  return {
    ...thread,
    comments: thread.comments.map((c) =>
      c.id === commentId
        ? {
            ...c,
            isReported: true,
            moderationStatus: "pending_review",
            reportReason: reason,
          }
        : c,
    ),
  };
}

// ─── Storage Persistence ───────────────────────────────────────────────────

const STORAGE_PREFIX = "ss_discussion_threads_";

export function loadInvoiceThreads(invoiceId: string): DiscussionThread[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${invoiceId}`);
    return raw ? (JSON.parse(raw) as DiscussionThread[]) : [];
  } catch {
    return [];
  }
}

export function saveInvoiceThreads(invoiceId: string, threads: DiscussionThread[]): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${STORAGE_PREFIX}${invoiceId}`, JSON.stringify(threads));
  } catch {
    // Graceful storage fallback
  }
}
