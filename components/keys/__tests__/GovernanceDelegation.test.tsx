import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { GovernanceDelegationList } from "../GovernanceDelegationList";
import { DelegationModal } from "../DelegationModal";
import { SAMPLE_DELEGATIONS } from "@/lib/governance/delegations";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    address: "GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT",
    jwt: "jwt-token",
  })),
}));

vi.mock("@/hooks/useStellarWallet", () => ({
  useStellarWallet: vi.fn(() => ({
    address: "GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT",
  })),
}));

describe("GovernanceDelegationList & DelegationModal components (#692)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders delegation list with metrics and active/expired badges", () => {
    render(
      <GovernanceDelegationList
        keyId="creator-key-solaris-1"
        initialOptions={{
          keyId: "creator-key-solaris-1",
          initialOwnCustodyKeys: 100,
          initialOutgoingDelegations: SAMPLE_DELEGATIONS,
        }}
      />
    );

    expect(screen.getByTestId("governance-delegation-list")).toBeInTheDocument();
    expect(screen.getByTestId("metric-own-custody")).toHaveTextContent("100 keys");
    expect(screen.getByTestId("metric-delegated-out")).toHaveTextContent("25 keys");
    expect(screen.getByTestId("metric-effective-power")).toHaveTextContent("75 votes");

    // Delegations items
    expect(screen.getByTestId("delegation-item-DEL-2026-001")).toBeInTheDocument();
    expect(screen.getByTestId("delegation-item-DEL-2026-002-EXPIRED")).toBeInTheDocument();

    // Active vs expired badges
    expect(screen.getByTestId("badge-active-DEL-2026-001")).toBeInTheDocument();
    expect(screen.getByTestId("badge-expired-DEL-2026-002-EXPIRED")).toBeInTheDocument();
  });

  it("revokes delegation and restores voting power immediately", () => {
    render(
      <GovernanceDelegationList
        keyId="creator-key-solaris-1"
        initialOptions={{
          keyId: "creator-key-solaris-1",
          initialOwnCustodyKeys: 100,
          initialOutgoingDelegations: [SAMPLE_DELEGATIONS[0]],
        }}
      />
    );

    // Initial power: 100 - 25 = 75
    expect(screen.getByTestId("metric-effective-power")).toHaveTextContent("75 votes");

    // Click revoke
    const revokeBtn = screen.getByTestId("btn-revoke-DEL-2026-001");
    fireEvent.click(revokeBtn);

    // Voting power restored to 100
    expect(screen.getByTestId("metric-effective-power")).toHaveTextContent("100 votes");
    expect(screen.getByTestId("metric-delegated-out")).toHaveTextContent("0 keys");
    expect(screen.getByTestId("badge-revoked-DEL-2026-001")).toBeInTheDocument();
  });

  it("opens modal and displays custody guarantee banner", () => {
    render(
      <DelegationModal
        keyId="creator-key-solaris-1"
        open={true}
        onOpenChange={vi.fn()}
        maxAvailablePower={50}
        whitelistEnabled={true}
        whitelistedAddresses={["GDANW55RBL4AM5BLGIJG4G6PLZDPAJ75V4RWNG7HCN5C44CG5X5CZLTS"]}
        onDelegate={vi.fn(() => ({ success: true }))}
      />
    );

    expect(screen.getByTestId("delegation-modal")).toBeInTheDocument();
    expect(screen.getByTestId("custody-guarantee-alert")).toHaveTextContent("Custody Intact (Zero Asset Transfer)");
    expect(screen.getByTestId("whitelist-restriction-notice")).toBeInTheDocument();
  });

  it("blocks submission when delegate address fails whitelist check", () => {
    const onDelegateMock = vi.fn(() => ({
      success: false,
      error: "Target delegate address is not on the creator key whitelist.",
    }));

    render(
      <DelegationModal
        keyId="creator-key-solaris-1"
        open={true}
        onOpenChange={vi.fn()}
        maxAvailablePower={50}
        whitelistEnabled={true}
        whitelistedAddresses={["GDANW55RBL4AM5BLGIJG4G6PLZDPAJ75V4RWNG7HCN5C44CG5X5CZLTS"]}
        onDelegate={onDelegateMock}
      />
    );

    const input = screen.getByTestId("input-delegate-address");
    fireEvent.change(input, {
      target: { value: "GBEH6X5KIRWHDNE5J6SRAS4KDMXDXTKKZNQAAK23WP4SKN55HRBMPISR" },
    });

    const submitBtn = screen.getByTestId("btn-submit-delegation");
    fireEvent.click(submitBtn);

    expect(onDelegateMock).toHaveBeenCalled();
    expect(screen.getByTestId("delegation-error-alert")).toHaveTextContent(
      "not on the creator key whitelist"
    );
  });
});
