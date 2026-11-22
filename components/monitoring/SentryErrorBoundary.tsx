"use client";

import React, { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { UserFeedbackDialog } from "./UserFeedbackDialog";
import { logError } from "@/lib/logger";

export interface SentryErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, eventId: string | null, resetError: () => void) => ReactNode;
  showDialog?: boolean;
}

export interface SentryErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

/**
 * Global Sentry-enabled React Error Boundary.
 * Catches unhandled exceptions, dispatches scrubbed crash reports with release tags,
 * and surfaces an interactive user feedback dialog on the fallback screen.
 */
export class SentryErrorBoundary extends Component<
  SentryErrorBoundaryProps,
  SentryErrorBoundaryState
> {
  constructor(props: SentryErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      eventId: null,
    };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<SentryErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logError("Unhandled error caught by SentryErrorBoundary", error);

    try {
      const eventId = Sentry.captureException(error, {
        extra: {
          componentStack: errorInfo.componentStack,
        },
      });
      this.setState({ eventId });
    } catch {
      // In case Sentry capture fails or is not initialized
      this.setState({ eventId: null });
    }
  }

  handleReset(): void {
    this.setState({ hasError: false, error: null, eventId: null });
  }

  handleReload(): void {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  render(): ReactNode {
    const { hasError, error, eventId } = this.state;
    const { children, fallback, showDialog = true } = this.props;

    if (hasError) {
      if (fallback && error) {
        return fallback(error, eventId, this.handleReset);
      }

      return (
        <main
          className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-8 text-center"
          data-testid="error-boundary-fallback"
        >
          <div className="space-y-2 max-w-md">
            <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. Our team has been notified if telemetry is enabled.
            </p>
            {eventId && (
              <p className="text-xs text-muted-foreground font-mono">
                Event ID: <span data-testid="error-event-id">{eventId}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={this.handleReload}
              data-testid="error-boundary-refresh"
            >
              Reload Page
            </Button>
            <Button
              variant="outline"
              onClick={this.handleReset}
              data-testid="error-boundary-retry"
            >
              Try Again
            </Button>
          </div>

          {showDialog && eventId && (
            <div className="w-full max-w-md pt-2">
              <UserFeedbackDialog eventId={eventId} />
            </div>
          )}
        </main>
      );
    }

    return children;
  }
}
