"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { RouteStateCard } from "@/components/ui/RouteStateCard";
import { logError } from "@/lib/logger";

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError("Unhandled render error", { error, errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <RouteStateCard
          title="Something went wrong"
          message="We ran into an unexpected issue. Please try again in a moment."
        />
      );
    }

    return this.props.children;
  }
}
