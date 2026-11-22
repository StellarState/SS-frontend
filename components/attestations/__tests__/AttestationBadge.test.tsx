import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AttestationBadge } from "../AttestationBadge";
import type { Attestation } from "@/lib/api/attestations";

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

describe("AttestationBadge (#605)", () => {
  it.each([
    [[attestation()], "Verified"],
    [[attestation(), attestation({ id: "att-2", verdict: "rejected" })], "Mixed"],
    [[], "Unreviewed"],
  ] as const)("renders the %s verdict set as %s", (rows, expected) => {
    render(<AttestationBadge attestations={rows} />);
    expect(screen.getByTestId("attestation-badge")).toHaveTextContent(expected);
  });

  it("exposes a keyboard-focusable tooltip that limits the guarantee", async () => {
    render(<AttestationBadge attestations={[attestation()]} />);
    const trigger = screen.getByTestId("attestation-badge");

    expect(trigger).toHaveAttribute("tabindex", "0");
    fireEvent.focus(trigger);

    expect(await screen.findByTestId("attestation-tooltip")).toHaveTextContent(
      "does not guarantee repayment"
    );
  });
});
