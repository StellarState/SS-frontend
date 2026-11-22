import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TemplatesPanel } from "../TemplatesPanel";

const { mockUseInvoiceTemplates, mockSaveTemplate, mockDeleteTemplate } = vi.hoisted(
  () => ({
    mockUseInvoiceTemplates: vi.fn(),
    mockSaveTemplate: vi.fn(),
    mockDeleteTemplate: vi.fn(),
  })
);

vi.mock("@/hooks/useInvoiceTemplates", () => ({
  useInvoiceTemplates: mockUseInvoiceTemplates,
}));

const TEMPLATE = {
  id: "tpl-1",
  name: "Client A",
  debtor: "Acme",
  terms: "Net 30",
  description: "Monthly services",
  createdAt: "2026-11-01T00:00:00Z",
};

let templates: typeof TEMPLATE[];
let onApply: ReturnType<
  typeof vi.fn<(values: { debtor: string; terms: string; description: string }) => void>
>;

beforeEach(() => {
  templates = [TEMPLATE];
  onApply = vi.fn<(values: { debtor: string; terms: string; description: string }) => void>();
  mockSaveTemplate.mockReset().mockResolvedValue(undefined);
  mockDeleteTemplate.mockReset().mockResolvedValue(undefined);
  mockUseInvoiceTemplates.mockImplementation(() => ({
    data: templates,
    isLoading: false,
    saveTemplate: mockSaveTemplate,
    deleteTemplate: mockDeleteTemplate,
    isSaving: false,
    isDeleting: false,
  }));
});

describe("TemplatesPanel (#609)", () => {
  it("applies a saved template to the form", () => {
    render(
      <TemplatesPanel
        values={{ debtor: "", terms: "", description: "" }}
        onApply={onApply}
      />
    );

    fireEvent.click(screen.getByTestId("template-apply-tpl-1"));
    expect(onApply).toHaveBeenCalledWith({
      debtor: "Acme",
      terms: "Net 30",
      description: "Monthly services",
    });
  });

  it("asks before replacing values already entered", () => {
    const confirmMock = vi.fn().mockReturnValue(false);
    vi.stubGlobal("confirm", confirmMock);

    render(
      <TemplatesPanel
        values={{ debtor: "Existing debtor", terms: "", description: "" }}
        onApply={onApply}
      />
    );

    fireEvent.click(screen.getByTestId("template-apply-tpl-1"));
    expect(confirmMock).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();

    confirmMock.mockReturnValue(true);
    fireEvent.click(screen.getByTestId("template-apply-tpl-1"));
    expect(onApply).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("saves only the supported fields under a name", () => {
    render(
      <TemplatesPanel
        values={{ debtor: "Acme", terms: "Net 30", description: "Services" }}
        onApply={onApply}
      />
    );

    fireEvent.change(screen.getByTestId("template-name"), {
      target: { value: "Client B" },
    });
    fireEvent.click(screen.getByTestId("template-save"));

    expect(mockSaveTemplate).toHaveBeenCalledTimes(1);
    const saved = mockSaveTemplate.mock.calls[0][0];
    expect(saved.name).toBe("Client B");
    expect(saved).toMatchObject({
      debtor: "Acme",
      terms: "Net 30",
      description: "Services",
    });
    expect(saved).not.toHaveProperty("invoice_number");
    expect(saved).not.toHaveProperty("documentCid");
  });

  it("deletes a template from the list", () => {
    render(
      <TemplatesPanel values={{}} onApply={onApply} />
    );

    fireEvent.click(screen.getByTestId("template-delete-tpl-1"));
    expect(mockDeleteTemplate).toHaveBeenCalledWith("tpl-1");
  });
});
