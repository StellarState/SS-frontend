"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendUserFeedback } from "@/src/monitoring/sentry";
import { CheckCircle2, MessageSquare } from "lucide-react";

interface UserFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onSuccess?: () => void;
}

export function UserFeedbackDialog({
  open,
  onOpenChange,
  eventId,
  onSuccess,
}: UserFeedbackDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) return;

    setSubmitting(true);
    try {
      await sendUserFeedback({
        eventId,
        name: name.trim(),
        email: email.trim(),
        comments: comments.trim(),
      });
      setSubmitted(true);
      onSuccess?.();
    } catch {
      // Sentry offline or non-blocking
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setName("");
      setEmail("");
      setComments("");
      setSubmitted(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="user-feedback-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Report Issue or Send Feedback
          </DialogTitle>
          <DialogDescription>
            Help us fix this problem. Your feedback will be directly linked to error report:{" "}
            <span className="font-mono text-xs text-foreground font-semibold">
              {eventId ? eventId.slice(0, 12) : "unknown"}
            </span>
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center space-y-3" data-testid="feedback-success-message">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h4 className="font-semibold text-base">Thank you for your feedback!</h4>
            <p className="text-xs text-muted-foreground">
              Our engineering team will review the error trace alongside your comments.
            </p>
            <div className="pt-2">
              <Button type="button" onClick={handleClose} size="sm">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-sm" data-testid="feedback-form">
            <div className="space-y-1.5">
              <Label htmlFor="feedback-name">Your Name (optional)</Label>
              <Input
                id="feedback-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="feedback-email">Email Address (optional)</Label>
              <Input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="feedback-comments">What happened?</Label>
              <textarea
                id="feedback-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                required
                placeholder="Please describe what you were doing right before the error appeared..."
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="feedback-comments-input"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!comments.trim() || submitting}
                data-testid="submit-feedback-btn"
              >
                {submitting ? "Sending..." : "Submit Feedback"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
