import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KycStatusBanner } from "../KycStatusBanner";

describe("KycStatusBanner", () => {
    it("renders the pending message with no action button", () => {
        render(<KycStatusBanner status="pending" />);

        expect(screen.getByText("Your KYC is under review")).toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("renders the rejected message with a Reapply button", () => {
        render(<KycStatusBanner status="rejected" />);

        expect(screen.getByText("Your KYC was rejected")).toBeInTheDocument();
        const link = screen.getByRole("link", { name: "Reapply" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/kyc/reapply");
    });

    it("renders nothing when approved", () => {
        const { container } = render(<KycStatusBanner status="approved" />);

        expect(container).toBeEmptyDOMElement();
    });

    it("renders the not submitted message with a Start KYC button", () => {
        render(<KycStatusBanner status="not_submitted" />);

        expect(screen.getByText("Complete KYC to publish invoices")).toBeInTheDocument();
        const link = screen.getByRole("link", { name: "Start KYC" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/kyc/start");
    });

    it("navigates the Reapply button to the correct route", () => {
        render(<KycStatusBanner status="rejected" />);

        expect(screen.getByRole("link", { name: "Reapply" })).toHaveAttribute(
            "href",
            "/kyc/reapply"
        );
    });

    it("navigates the Start KYC button to the correct route", () => {
        render(<KycStatusBanner status="not_submitted" />);

        expect(screen.getByRole("link", { name: "Start KYC" })).toHaveAttribute(
            "href",
            "/kyc/start"
        );
    });
});
