"use client";

import React from "react";
import { logError } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { GoToMarketplaceButton } from "@/components/layout/GoToMarketplaceButton";
import { captureException } from "@/src/monitoring/sentry";
import { UserFeedbackDialog } from "@/components/monitoring/UserFeedbackDialog";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  eventId?: string | null;
}

/**
 * Top-level React error boundary (#281, #761).
 *
 * Wraps the whole app in the root layout and catches render errors thrown
 * outside of Next.js route transitions (e.g. inside providers or shared
 * components). Integrates with Sentry to capture scrubbed exceptions and
 * surfaces a user feedback dialog linked to the error event ID.
 */
export class AppErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, eventId: null };
    this.handleRefresh = this.handleRefresh.bind(this);
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo?: React.ErrorInfo): void {
    logError("Unhandled render error caught by AppErrorBoundary", error);
    try {
      const eventId = captureException(error, {
        extra: errorInfo ? { componentStack: errorInfo.componentStack } : undefined,
      });
      this.setState({ eventId: typeof eventId === "string" ? eventId : null });
    } catch {
      this.setState({ eventId: null });
    }
  }

  handleRefresh(): void {
    this.setState({ hasError: false, eventId: null });
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
            <GoToMarketplaceButton />
          </div>
          {this.state.eventId && (
            <div className="w-full max-w-md pt-4">
              <UserFeedbackDialog eventId={this.state.eventId} />
            </div>
          )}
        </main>
      );
    }

    return this.props.children;
  }
}
