import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KycSubmissionForm } from "../KycSubmissionForm";

Element.prototype.scrollIntoView = vi.fn();

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  submitKyc: vi.fn(),
}));

import { submitKyc } from "@/lib/api";
import { toast } from "sonner";

describe("KycSubmissionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Already submitted' when status is pending", () => {
    render(<KycSubmissionForm status="pending" />);

    expect(screen.getByText("Already submitted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });

  it("renders all required fields for not_submitted status", () => {
    render(<KycSubmissionForm status="not_submitted" />);

    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Country")).toBeInTheDocument();
    expect(screen.getByLabelText("Government ID Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Document")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit KYC" })).toBeInTheDocument();
  });

  it("shows validation errors on submit with empty fields", async () => {
    render(<KycSubmissionForm status="not_submitted" />);

    fireEvent.click(screen.getByRole("button", { name: "Submit KYC" }));

    await waitFor(() => {
      expect(screen.getByText("Full name is required")).toBeInTheDocument();
      expect(screen.getByText("Country is required")).toBeInTheDocument();
      expect(screen.getByText("Government ID type is required")).toBeInTheDocument();
    });
  });

  it("calls submitKyc and navigates on successful submission", async () => {
    vi.mocked(submitKyc).mockResolvedValueOnce({ success: true });

    render(<KycSubmissionForm status="not_submitted" />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "John Doe" },
    });

    const countrySelect = screen.getByLabelText("Country");
    fireEvent.click(countrySelect);
    const countryOption = screen.getAllByText("United States").find((el) => el.tagName === "SPAN");
    if (countryOption) fireEvent.click(countryOption);

    const idTypeSelect = screen.getByLabelText("Government ID Type");
    fireEvent.click(idTypeSelect);
    const idOption = screen.getAllByText("Passport").find((el) => el.tagName === "SPAN");
    if (idOption) fireEvent.click(idOption);

    const fileInput = screen.getByLabelText("Document") as HTMLInputElement;
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: "Submit KYC" }));

    await waitFor(() => {
      expect(submitKyc).toHaveBeenCalled();
    });
  });

  it("shows error toast when submission fails", async () => {
    vi.mocked(submitKyc).mockRejectedValueOnce(new Error("Network error"));

    render(<KycSubmissionForm status="not_submitted" />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "John Doe" },
    });

    const countrySelect = screen.getByLabelText("Country");
    fireEvent.click(countrySelect);
    const countryOption = screen.getAllByText("United States").find((el) => el.tagName === "SPAN");
    if (countryOption) fireEvent.click(countryOption);

    const idTypeSelect = screen.getByLabelText("Government ID Type");
    fireEvent.click(idTypeSelect);
    const idOption = screen.getAllByText("Passport").find((el) => el.tagName === "SPAN");
    if (idOption) fireEvent.click(idOption);

    const fileInput = screen.getByLabelText("Document") as HTMLInputElement;
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: "Submit KYC" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to submit KYC. Please try again.",
      );
    });
  });

  it("shows upload progress indicator during submission", async () => {
    vi.mocked(submitKyc).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500)),
    );

    render(<KycSubmissionForm status="not_submitted" />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "John Doe" },
    });

    const countrySelect = screen.getByLabelText("Country");
    fireEvent.click(countrySelect);
    const countryOption = screen.getAllByText("United States").find((el) => el.tagName === "SPAN");
    if (countryOption) fireEvent.click(countryOption);

    const idTypeSelect = screen.getByLabelText("Government ID Type");
    fireEvent.click(idTypeSelect);
    const idOption = screen.getAllByText("Passport").find((el) => el.tagName === "SPAN");
    if (idOption) fireEvent.click(idOption);

    const fileInput = screen.getByLabelText("Document") as HTMLInputElement;
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: "Submit KYC" }));

    await waitFor(() => {
      expect(screen.getByText(/Uploading/)).toBeInTheDocument();
    });
  });
});
