import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttestationList } from "../AttestationList";
import type { Attestation } from "@/lib/api/attestations";

const { mockUseAttestations } = vi.hoisted(() => ({
  mockUseAttestations: vi.fn(),
}));

vi.mock("@/hooks/useAttestations", () => ({ useAttestations: mockUseAttestations }));

function attestation(overrides: Partial<Attestation> = {}): Attestation {
  return {
    id: "att-1",
    auditor: "Auditor One",
    verdict: "verified",
    datedAt: "2026-10-01T00:00:00Z",
    auditorActive: true,
    auditorRevoked: false,
    documentChanged: false,
    ...overrides,
  };
}

beforeEach(() => {
  mockUseAttestations.mockReturnValue({ data: [], isLoading: false });
});

describe("AttestationList (#605)", () => {
  it("lists only active, non-revoked verdicts", () => {
    mockUseAttestations.mockReturnValue({
      data: [
        attestation(),
        attestation({ id: "att-2", auditorActive: false }),
        attestation({ id: "att-3", auditorRevoked: true }),
      ],
      isLoading: false,
    });

    render(<AttestationList invoiceId="inv-1" />);
    expect(screen.getByTestId("attestation-rows")).toHaveTextContent("Auditor One");
    expect(screen.queryByTestId("attestation-att-2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("attestation-att-3")).not.toBeInTheDocument();
  });

  it("warns when the document changed after review", () => {
    mockUseAttestations.mockReturnValue({
      data: [attestation({ documentChanged: true })],
      isLoading: false,
    });

    render(<AttestationList invoiceId="inv-1" />);
    expect(screen.getByTestId("attestation-invalidated")).toHaveTextContent(
      "no longer apply"
    );
  });

  it("shows an explicit empty state when nothing was reviewed", () => {
    render(<AttestationList invoiceId="inv-1" />);
    expect(screen.getByTestId("attestation-empty")).toBeInTheDocument();
    expect(screen.getByTestId("attestation-badge")).toHaveTextContent("Unreviewed");
  });
});
