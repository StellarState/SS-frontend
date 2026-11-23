import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GovernanceDelegationModal } from "../GovernanceDelegationModal";
import { GovernanceDelegationList } from "../GovernanceDelegationList";
import type { GovernanceDelegation } from "@/lib/governanceDelegation";

const ADDR_ME = "GCKX6ZIFGPDAUBC7S67YP2AQQVXN2EPHSZ7JAAPIKVWZHWLP6Y2XULT2";
const ADDR_DELEGATE = "GDS63336SMAQPGXTGEYM4DIG7Q6UGS67ZAWFSBBS3WQZA2IUU5D4HYTK";
const ADDR_OTHER = "GCCPEBN6CZQD6UO3YIKQ5YNZTDNBWOSP6NRTAY6ZAM54MKZEEU2EVKWE";

describe("GovernanceDelegation Components", () => {
  describe("GovernanceDelegationModal", () => {
    it("renders modal and validates address and weight inputs", () => {
      const onCreated = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <GovernanceDelegationModal
          keyId="k-1"
          userAddress={ADDR_ME}
          availableKeys={10}
          open={true}
          onOpenChange={onOpenChange}
          onDelegationCreated={onCreated}
        />
      );

      expect(screen.getByTestId("governance-delegation-modal")).toBeInTheDocument();
      expect(screen.getByText("Delegate Creator Key Votes")).toBeInTheDocument();
      expect(screen.getByText(/never transfers key custody/i)).toBeInTheDocument();

      const addrInput = screen.getByTestId("input-delegate-address");
      fireEvent.change(addrInput, { target: { value: "invalid-key" } });
      expect(screen.getByText(/Invalid Stellar Ed25519 public address/i)).toBeInTheDocument();

      // Enter valid delegate address
      fireEvent.change(addrInput, { target: { value: ADDR_DELEGATE } });
      expect(screen.queryByText(/Invalid Stellar Ed25519 public address/i)).not.toBeInTheDocument();

      // Submit delegation
      const submitBtn = screen.getByTestId("confirm-delegation-button");
      fireEvent.click(submitBtn);

      expect(onCreated).toHaveBeenCalledTimes(1);
      const created = onCreated.mock.calls[0][0] as GovernanceDelegation;
      expect(created.delegateAddress).toBe(ADDR_DELEGATE);
      expect(created.delegatorAddress).toBe(ADDR_ME);
      expect(created.status).toBe("active");
    });

    it("enforces whitelist when enabled and shows error for non-whitelisted address", () => {
      const onCreated = vi.fn();
      render(
        <GovernanceDelegationModal
          keyId="k-1"
          userAddress={ADDR_ME}
          availableKeys={10}
          whitelistEnabled={true}
          whitelistedAddresses={[ADDR_OTHER]}
          open={true}
          onOpenChange={vi.fn()}
          onDelegationCreated={onCreated}
        />
      );

      const addrInput = screen.getByTestId("input-delegate-address");
      fireEvent.change(addrInput, { target: { value: ADDR_DELEGATE } });

      const submitBtn = screen.getByTestId("confirm-delegation-button");
      fireEvent.click(submitBtn);

      expect(onCreated).not.toHaveBeenCalled();
      expect(screen.getByTestId("delegation-error-message")).toHaveTextContent(
        /creator key whitelist/i
      );
    });
  });

  describe("GovernanceDelegationList", () => {
    const sampleDelegations: GovernanceDelegation[] = [
      {
        id: "del-1",
        keyId: "k-1",
        delegatorAddress: ADDR_ME,
        delegateAddress: ADDR_DELEGATE,
        scope: "all",
        votingWeight: 5,
        createdAt: "2026-11-20T10:00:00Z",
        expiresAt: "2026-12-20T10:00:00Z",
        status: "active",
      },
    ];

    it("renders delegations, shows active badge, and allows revocation", () => {
      const onRevoke = vi.fn();
      const onOpenNew = vi.fn();

      render(
        <GovernanceDelegationList
          keyId="k-1"
          userAddress={ADDR_ME}
          delegations={sampleDelegations}
          onRevoke={onRevoke}
          onOpenNewDelegation={onOpenNew}
        />
      );

      const listContainer = screen.getByTestId("governance-delegation-list");
      expect(listContainer).toBeInTheDocument();
      const card = screen.getByTestId("delegation-card-del-1");
      expect(within(card).getByText("Active")).toBeInTheDocument();
      expect(within(card).getByText(/5 votes/i)).toBeInTheDocument();

      const revokeBtn = screen.getByTestId("revoke-delegation-del-1");
      fireEvent.click(revokeBtn);
      expect(onRevoke).toHaveBeenCalledWith("del-1");

      const delegateBtn = screen.getByTestId("open-delegate-modal-btn");
      fireEvent.click(delegateBtn);
      expect(onOpenNew).toHaveBeenCalledTimes(1);
    });
  });
});
