import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";

describe("InvoiceStatusBadge", () => {
    it("renders a neutral chip with label 'Draft'", () => {
        render(<InvoiceStatusBadge status="draft" />);
        expect(screen.getByText("Draft")).toBeInTheDocument();
        expect(screen.getByTestId("status-chip")).toHaveAttribute("data-variant", "neutral");
    });

    it("renders an info chip for published/open/active", () => {
        for (const status of ["published", "open", "active"]) {
            const { unmount } = render(<InvoiceStatusBadge status={status} />);
            expect(screen.getByTestId("status-chip")).toHaveAttribute("data-variant", "info");
            unmount();
        }
    });

    it("renders a success chip for funded and settled", () => {
        for (const status of ["funded", "settled"]) {
            const { unmount } = render(<InvoiceStatusBadge status={status} />);
            expect(screen.getByTestId("status-chip")).toHaveAttribute("data-variant", "success");
            unmount();
        }
    });

    it("renders a danger chip for expired, rejected and defaulted", () => {
        for (const status of ["expired", "rejected", "defaulted"]) {
            const { unmount } = render(<InvoiceStatusBadge status={status} />);
            expect(screen.getByTestId("status-chip")).toHaveAttribute("data-variant", "danger");
            unmount();
        }
    });

    it("renders an unknown chip for an unrecognised status", () => {
        render(<InvoiceStatusBadge status="unknown_status" />);
        expect(screen.getByText("Unknown")).toBeInTheDocument();
        expect(screen.getByTestId("status-chip")).toHaveAttribute("data-variant", "neutral");
    });

    it("shows an icon alongside every status label", () => {
        const { container } = render(<InvoiceStatusBadge status="expired" />);
        expect(screen.getByText("Expired")).toBeInTheDocument();
        expect(container.querySelector("svg")).not.toBeNull();
    });

    it("returns null when status is null, undefined or absent", () => {
        for (const status of [null, undefined]) {
            const { container, unmount } = render(<InvoiceStatusBadge status={status} />);
            expect(container.innerHTML).toBe("");
            unmount();
        }
        const { container } = render(<InvoiceStatusBadge />);
        expect(container.innerHTML).toBe("");
    });
});
