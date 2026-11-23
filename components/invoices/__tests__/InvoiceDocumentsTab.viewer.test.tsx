import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InvoiceDocumentsTab } from "@/components/invoices/InvoiceDocumentsTab";

vi.mock("@/components/invoices/DocumentVerificationBadge", () => ({ DocumentVerificationBadge: () => null }));

describe("InvoiceDocumentsTab PDF viewer", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200, headers: { "content-length": "2048" } })));
  });

  it("lists metadata, opens the PDF in a modal, and offers a download", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}>
      <InvoiceDocumentsTab invoiceId="inv-7" documentUrl={null} additionalDocuments={[{ cid: "ipfs://bafybeitest.pdf", type: "Invoice PDF", file_name: "invoice.pdf", size: 4096 }]} />
    </QueryClientProvider>);
    expect(await screen.findByTestId("document-metadata")).toHaveTextContent("Invoice PDF");
    expect(screen.getByTestId("document-metadata")).toHaveTextContent("4.0 KB");
    fireEvent.click(screen.getByTestId("document-view-button"));
    expect(await screen.findByTestId("document-viewer-modal")).toBeInTheDocument();
    expect(screen.getByTestId("document-inline-pdf")).toBeInTheDocument();
    expect(screen.getByTestId("document-download-button")).toHaveAttribute("aria-label", "Download invoice.pdf");
  });
});
