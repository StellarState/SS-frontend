import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaxProfileStep } from "@/components/onboarding/TaxProfileStep";

describe("TaxProfileStep Component (Issue #759)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders form fields and initial state", () => {
    render(<TaxProfileStep />);
    expect(screen.getByLabelText(/Country of Tax Residence/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tax Form Type/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Tax Identification Number/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save & Continue/i })).toBeDisabled();
  });

  it("updates help text and form type when country changes", () => {
    render(<TaxProfileStep />);
    const countryInput = screen.getByLabelText(/Country of Tax Residence/i);
    const formSelect = screen.getByLabelText(/Tax Form Type/i) as HTMLSelectElement;

    // Default US
    expect(formSelect.value).toBe("W-9");
    expect(screen.getByTestId("tax-help-text").textContent).toContain("W-9");

    // Change to Germany
    fireEvent.change(countryInput, { target: { value: "Germany" } });
    expect(formSelect.value).toBe("W-8BEN");
    expect(screen.getByTestId("tax-help-text").textContent).toContain("W-8BEN");
  });

  it("enables submit only when valid TIN and certification are provided", () => {
    const onSuccess = vi.fn();
    render(<TaxProfileStep onSuccess={onSuccess} />);

    const tinInput = screen.getByRole("textbox", { name: /Tax Identification Number/i });
    const checkbox = screen.getByRole("checkbox");
    const submitBtn = screen.getByRole("button", { name: /Save & Continue/i });

    expect(submitBtn).toBeDisabled();

    // Enter TIN only
    fireEvent.change(tinInput, { target: { value: "123-45-6789" } });
    expect(submitBtn).toBeDisabled();

    // Check certification
    fireEvent.click(checkbox);
    expect(submitBtn).not.toBeDisabled();

    // Submit
    fireEvent.click(submitBtn);
    expect(onSuccess).toHaveBeenCalledTimes(1);

    // Verify stored data has masked TIN
    const stored = JSON.parse(localStorage.getItem("ss_tax_profile") || "{}");
    expect(stored.maskedTin).toBe("••••••6789");
    expect(stored.status).toBe("submitted");
  });
});
