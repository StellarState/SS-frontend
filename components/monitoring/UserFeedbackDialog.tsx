"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { sendUserFeedback } from "@/src/monitoring/sentry";
import { MessageSquare, CheckCircle2 } from "lucide-react";

export interface UserFeedbackDialogProps {
  eventId: string;
  onSubmitted?: () => void;
  className?: string;
}

export function UserFeedbackDialog({
  eventId,
  onSubmitted,
  className = "",
}: UserFeedbackDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) {
      setErrorMsg("Please describe what happened before submitting.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      sendUserFeedback({
        eventId,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        comments: comments.trim(),
      });

      setIsSubmitted(true);
      if (onSubmitted) {
        onSubmitted();
      }
    } catch (err) {
      setErrorMsg("Failed to send feedback. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div
        className={`rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300 ${className}`}
        data-testid="feedback-success-msg"
      >
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span>Thank you! Your feedback has been submitted and linked to event {eventId.slice(0, 8)}.</span>
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className={`text-center ${className}`}>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(true)}
          data-testid="feedback-trigger-btn"
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Tell us what happened
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`w-full max-w-md rounded-xl border bg-card p-6 text-card-foreground shadow-sm text-left ${className}`}
      data-testid="feedback-dialog-card"
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold tracking-tight">Report Error Details</h3>
        <p className="text-sm text-muted-foreground">
          Help our engineers resolve this issue. Reference Event ID:{" "}
          <span className="font-mono text-xs">{eventId.slice(0, 8)}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="feedback-name">Your Name (Optional)</Label>
          <Input
            id="feedback-name"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="feedback-name-input"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="feedback-email">Email (Optional)</Label>
          <Input
            id="feedback-email"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="feedback-email-input"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="feedback-comments">
            What were you doing when the error occurred? <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="feedback-comments"
            rows={3}
            placeholder="e.g. I was attempting to submit an invoice on testnet..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            data-testid="feedback-comments-input"
            required
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-red-600 dark:text-red-400" data-testid="feedback-error-msg">
            {errorMsg}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            data-testid="feedback-cancel-btn"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !comments.trim()}
            data-testid="feedback-submit-btn"
          >
            {isSubmitting ? "Submitting..." : "Send Feedback"}
          </Button>
        </div>
      </form>
    </div>
  );
}
