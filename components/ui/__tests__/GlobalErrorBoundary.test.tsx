import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GlobalErrorBoundary } from "../GlobalErrorBoundary";
import * as logger from "@/lib/logger";

function BrokenComponent() {
  throw new Error("boom");
}

describe("GlobalErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(logger, "logError").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the fallback page and logs the error", () => {
    render(
      <GlobalErrorBoundary>
        <BrokenComponent />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to marketplace/i })).toHaveAttribute(
      "href",
      "/marketplace"
    );
    expect(logger.logError).toHaveBeenCalled();
  });
});
