import { vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SentryErrorBoundary } from "../SentryErrorBoundary";
import { UserFeedbackDialog } from "../UserFeedbackDialog";
import * as Sentry from "@sentry/react";
import * as monitoringSentry from "@/src/monitoring/sentry";

vi.mock("@sentry/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentry/react")>();
  return {
    ...actual,
    captureException: vi.fn().mockReturnValue("sentry-event-id-9999"),
    captureFeedback: vi.fn().mockReturnValue("feedback-submission-1234"),
  };
});

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

function ExplodingComponent(): never {
  throw new Error("Simulated component render failure");
}

describe("SentryErrorBoundary & UserFeedbackDialog (Issue #761)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("SentryErrorBoundary", () => {
    it("renders children when no error occurs", () => {
      render(
        <SentryErrorBoundary>
          <div data-testid="child-content">Normal Application Content</div>
        </SentryErrorBoundary>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.queryByTestId("error-boundary-fallback")).not.toBeInTheDocument();
    });

    it("catches render errors, captures to Sentry, and displays fallback UI", () => {
      render(
        <SentryErrorBoundary>
          <ExplodingComponent />
        </SentryErrorBoundary>
      );

      expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("error-event-id")).toHaveTextContent("sentry-event-id-9999");
    });

    it("reloads page when reload button is clicked", () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...window.location, reload: reloadSpy },
      });

      render(
        <SentryErrorBoundary>
          <ExplodingComponent />
        </SentryErrorBoundary>
      );

      fireEvent.click(screen.getByTestId("error-boundary-refresh"));
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it("supports custom fallback renderer", () => {
      render(
        <SentryErrorBoundary
          fallback={(error, eventId) => (
            <div data-testid="custom-fallback">
              Custom Error: {error.message} (ID: {eventId})
            </div>
          )}
        >
          <ExplodingComponent />
        </SentryErrorBoundary>
      );

      expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
      expect(screen.getByText(/Custom Error: Simulated component render failure/)).toBeInTheDocument();
    });
  });

  describe("UserFeedbackDialog", () => {
    it("renders feedback trigger button and opens dialog form on click", () => {
      render(<UserFeedbackDialog eventId="evt-1111" />);

      const triggerBtn = screen.getByTestId("feedback-trigger-btn");
      expect(triggerBtn).toBeInTheDocument();

      fireEvent.click(triggerBtn);

      expect(screen.getByTestId("feedback-dialog-card")).toBeInTheDocument();
      expect(screen.getByTestId("feedback-comments-input")).toBeInTheDocument();
      expect(screen.getByTestId("feedback-submit-btn")).toBeInTheDocument();
    });

    it("submits comments linked to the event ID", () => {
      const sendFeedbackSpy = vi.spyOn(monitoringSentry, "sendUserFeedback");
      const onSubmittedMock = vi.fn();

      render(<UserFeedbackDialog eventId="evt-1111" onSubmitted={onSubmittedMock} />);

      // Open dialog
      fireEvent.click(screen.getByTestId("feedback-trigger-btn"));

      // Fill form
      fireEvent.change(screen.getByTestId("feedback-name-input"), {
        target: { value: "Bob" },
      });
      fireEvent.change(screen.getByTestId("feedback-email-input"), {
        target: { value: "bob@example.com" },
      });
      fireEvent.change(screen.getByTestId("feedback-comments-input"), {
        target: { value: "Crash occurred when clicking stake button" },
      });

      // Submit
      fireEvent.click(screen.getByTestId("feedback-submit-btn"));

      expect(sendFeedbackSpy).toHaveBeenCalledWith({
        eventId: "evt-1111",
        name: "Bob",
        email: "bob@example.com",
        comments: "Crash occurred when clicking stake button",
      });
      expect(onSubmittedMock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("feedback-success-msg")).toBeInTheDocument();
    });

    it("cancels and hides dialog when Cancel is clicked", () => {
      render(<UserFeedbackDialog eventId="evt-1111" />);

      fireEvent.click(screen.getByTestId("feedback-trigger-btn"));
      expect(screen.getByTestId("feedback-dialog-card")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("feedback-cancel-btn"));
      expect(screen.queryByTestId("feedback-dialog-card")).not.toBeInTheDocument();
      expect(screen.getByTestId("feedback-trigger-btn")).toBeInTheDocument();
    });
  });
});
