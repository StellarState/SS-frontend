import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserFeedbackDialog } from "../UserFeedbackDialog";
import * as sentryModule from "@/src/monitoring/sentry";

describe("UserFeedbackDialog Component (Issue #761)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders form fields and associated eventId", () => {
    render(
      <UserFeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        eventId="event-abc-987654321"
      />
    );

    expect(screen.getByTestId("user-feedback-dialog")).toBeInTheDocument();
    expect(screen.getByText(/event-abc-98/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/What happened\?/i)).toBeInTheDocument();

    const submitBtn = screen.getByTestId("submit-feedback-btn");
    expect(submitBtn).toBeDisabled();
  });

  it("submits feedback and shows success confirmation", async () => {
    const sendFeedbackSpy = vi
      .spyOn(sentryModule, "sendUserFeedback")
      .mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    render(
      <UserFeedbackDialog
        open={true}
        onOpenChange={vi.fn()}
        eventId="event-abc-987654321"
        onSuccess={onSuccess}
      />
    );

    const nameInput = screen.getByLabelText(/Your Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);
    const commentsInput = screen.getByLabelText(/What happened\?/i);
    const submitBtn = screen.getByTestId("submit-feedback-btn");

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.change(commentsInput, { target: { value: "Clicked invest and app crashed" } });

    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(sendFeedbackSpy).toHaveBeenCalledWith({
        eventId: "event-abc-987654321",
        name: "John Doe",
        email: "john@example.com",
        comments: "Clicked invest and app crashed",
      });
      expect(screen.getByTestId("feedback-success-message")).toBeInTheDocument();
      expect(screen.getByText(/Thank you for your feedback!/i)).toBeInTheDocument();
    });
  });
});
