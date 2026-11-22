import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DuplicateInvoiceButton, DUPLICATE_STORAGE_KEY } from "../DuplicateInvoiceButton";

const { mockFetchInvoiceDetail, mockPush } = vi.hoisted(() => ({
  mockFetchInvoiceDetail: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ fetchInvoiceDetail: mockFetchInvoiceDetail }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  window.sessionStorage.clear();
  mockPush.mockReset();
  mockFetchInvoiceDetail.mockReset().mockResolvedValue({
    id: "inv-1",
    title: "Consulting",
    description: "Monthly consulting",
    amount: 1000,
    debtor_hash: "GDEBTOR",
    terms: "Net 30",
    due_date: "2026-12-31",
    document_url: "bafy-secret",
  });
});

describe("DuplicateInvoiceButton (#609)", () => {
  it("prefills commercial fields and clears dates and documents", async () => {
    const user = userEvent.setup();
    render(<DuplicateInvoiceButton invoiceId="inv-1" />);

    await user.click(screen.getByTestId("duplicate-invoice-inv-1"));

    await waitFor(() => expect(mockFetchInvoiceDetail).toHaveBeenCalledWith("inv-1"));
    expect(mockPush).toHaveBeenCalledWith("/seller/publish?duplicate=1");

    const stored = window.sessionStorage.getItem(DUPLICATE_STORAGE_KEY);
    expect(stored).not.toBeNull();
    const copy = JSON.parse(stored as string);
    expect(copy).toMatchObject({
      title: "Consulting",
      description: "Monthly consulting",
      faceValue: "1000",
      debtor: "GDEBTOR",
      terms: "Net 30",
    });
    expect(copy).not.toHaveProperty("id");
    expect(copy).not.toHaveProperty("due_date");
    expect(copy).not.toHaveProperty("document_url");
  });
});
