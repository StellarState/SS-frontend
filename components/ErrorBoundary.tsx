"use client";

import React from "react";
import { logError } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { GoToMarketplaceButton } from "@/components/layout/GoToMarketplaceButton";
import { Sentry } from "@/src/monitoring/sentry";
import { UserFeedbackDialog } from "@/components/monitoring/UserFeedbackDialog";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  eventId: string | null;
  feedbackOpen: boolean;
}

/**
 * Top-level React error boundary (#281, #761).
 *
 * Wraps the whole app in the root layout and catches render errors thrown
 * outside of Next.js route transitions (e.g. inside providers or shared
 * components). Integrates with Sentry error monitoring and surfaces a user
 * feedback dialog linked to the captured event.
 */
export class AppErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, eventId: null, feedbackOpen: false };
    this.handleRefresh = this.handleRefresh.bind(this);
  }

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo?: React.ErrorInfo): void {
    logError("Unhandled render error caught by AppErrorBoundary", error);
    try {
      const eventId = Sentry.captureException(error, {
        extra: { componentStack: errorInfo?.componentStack },
      });
      if (eventId) {
        this.setState({ eventId: String(eventId) });
      }
    } catch {
      // Ignore if Sentry is disabled or not initialized
    }
  }

  handleRefresh(): void {
    this.setState({ hasError: false, feedbackOpen: false });
    window.location.reload();
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <main
          className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-8 text-center"
          data-testid="error-boundary-fallback"
        >
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. You can refresh the page or head back
            to the marketplace.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={this.handleRefresh} data-testid="error-boundary-refresh">
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => this.setState({ feedbackOpen: true })}
              data-testid="error-boundary-feedback-btn"
            >
              Report Feedback
            </Button>
            <GoToMarketplaceButton />
          </div>
          <UserFeedbackDialog
            open={this.state.feedbackOpen}
            onOpenChange={(open) => this.setState({ feedbackOpen: open })}
            eventId={this.state.eventId || ""}
          />
        </main>
      );
    }

    return this.props.children;
  }
}

