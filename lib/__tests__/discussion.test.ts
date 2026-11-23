import { describe, expect, it } from "vitest";
import {
  createDiscussionThread,
  addCommentToThread,
  setThreadResolvedState,
  reportComment,
  filterDiscussionThreads,
  getVisibleCommentContent,
  MAX_COMMENT_LENGTH,
  type DiscussionThread,
} from "@/lib/discussion";

describe("Invoice Discussion Threads with Moderation (#661)", () => {
  const issuer = "GISSUER1234567890ABCDEF";
  const investor1 = "GINVESTOR11111111111111";
  const investor2 = "GINVESTOR22222222222222";

  it("creates a thread with a validated character limit", () => {
    const thread = createDiscussionThread(
      "inv-1",
      "Late interest question",
      "What is the late interest rate after due date?",
      investor1,
      false,
    );

    expect(thread.title).toBe("Late interest question");
    expect(thread.isResolved).toBe(false);
    expect(thread.comments).toHaveLength(1);
    expect(thread.comments[0].isIssuer).toBe(false);

    // Character limit error
    const longText = "a".repeat(MAX_COMMENT_LENGTH + 1);
    expect(() =>
      createDiscussionThread("inv-1", "Title", longText, investor1),
    ).toThrow(/limit of 500 characters/);
  });

  it("identifies issuer replies and verifies character limits", () => {
    let thread = createDiscussionThread(
      "inv-1",
      "Payment terms",
      "Are partial repayments allowed?",
      investor1,
      false,
    );

    thread = addCommentToThread(
      thread,
      "Yes, partial repayments are credited pro-rata.",
      issuer,
      true,
    );

    expect(thread.comments).toHaveLength(2);
    expect(thread.comments[1].isIssuer).toBe(true);
    expect(thread.comments[1].authorAddress).toBe(issuer);
  });

  it("filters by unanswered, issuer_reply, and resolved", () => {
    const threadUnanswered = createDiscussionThread("inv-1", "Q1", "Help?", investor1, false);

    let threadWithIssuer = createDiscussionThread("inv-1", "Q2", "Fee?", investor2, false);
    threadWithIssuer = addCommentToThread(threadWithIssuer, "Zero fee.", issuer, true);

    let threadResolved = createDiscussionThread("inv-1", "Q3", "Done?", investor1, false);
    threadResolved = setThreadResolvedState(threadResolved, true, issuer);

    const all = [threadUnanswered, threadWithIssuer, threadResolved];

    // Filter "unanswered" (open and no issuer comments)
    const unanswered = filterDiscussionThreads(all, "unanswered");
    expect(unanswered.map((t) => t.title)).toEqual(["Q1"]);

    // Filter "issuer_reply"
    const withReplies = filterDiscussionThreads(all, "issuer_reply");
    expect(withReplies.map((t) => t.title)).toEqual(["Q2"]);

    // Filter "resolved"
    const resolved = filterDiscussionThreads(all, "resolved");
    expect(resolved.map((t) => t.title)).toEqual(["Q3"]);
  });

  it("allows searching across threads including resolved ones", () => {
    const t1 = createDiscussionThread("inv-1", "Invoice Logistics", "Customs clearance question", investor1);
    let t2 = createDiscussionThread("inv-1", "Delivery Timeline", "Delivered on Friday", investor2);
    t2 = setThreadResolvedState(t2, true, issuer);

    const all = [t1, t2];

    const search1 = filterDiscussionThreads(all, "all", "Customs");
    expect(search1).toHaveLength(1);
    expect(search1[0].title).toBe("Invoice Logistics");

    // Resolved thread remains searchable
    const search2 = filterDiscussionThreads(all, "all", "Friday");
    expect(search2).toHaveLength(1);
    expect(search2[0].title).toBe("Delivery Timeline");
    expect(search2[0].isResolved).toBe(true);
  });

  it("moderates reported comments and hides private details from general public", () => {
    let thread = createDiscussionThread("inv-1", "Sensitive inquiry", "My private bank routing number is 123456", investor1);
    const commentId = thread.comments[0].id;

    // Report comment
    thread = reportComment(thread, commentId, "Contains private banking info");

    const reportedComment = thread.comments[0];
    expect(reportedComment.isReported).toBe(true);
    expect(reportedComment.moderationStatus).toBe("pending_review");

    // Public view hides confidential/reported text
    const publicView = getVisibleCommentContent(reportedComment, false, "G_OTHER_VIEWER");
    expect(publicView).toContain("[This comment has been reported and is currently under moderator review.]");
    expect(publicView).not.toContain("123456");

    // Moderator or author can see the content
    const authorView = getVisibleCommentContent(reportedComment, false, investor1);
    expect(authorView).toContain("123456");

    const modView = getVisibleCommentContent(reportedComment, true);
    expect(modView).toContain("123456");
  });
});
