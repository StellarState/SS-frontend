import { describe, expect, it } from "vitest";
import {
  buildTemplate,
  duplicateInvoice,
  hasExistingValues,
  readTemplates,
  TEMPLATE_STORAGE_KEY,
  templateValues,
  writeTemplates,
} from "@/lib/invoiceTemplates";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("invoice templates and duplication (#609)", () => {
  it("stores only debtor, terms and description in a template", () => {
    const template = buildTemplate("  Recurring client  ", {
      debtor: "Acme",
      terms: "Net 30",
      description: "Monthly services",
      invoice_number: "INV-1042",
      documentCid: "bafy-secret",
      fundingDeadline: "2026-12-01",
    });

    expect(template.name).toBe("Recurring client");
    expect(templateValues(template)).toEqual({
      debtor: "Acme",
      terms: "Net 30",
      description: "Monthly services",
    });
    expect(JSON.stringify(template)).not.toContain("INV-1042");
    expect(JSON.stringify(template)).not.toContain("bafy-secret");
    expect(JSON.stringify(template)).not.toContain("fundingDeadline");
  });

  it("clears unique and dated fields when duplicating", () => {
    const copy = duplicateInvoice({
      title: "Consulting",
      id: "inv-1",
      invoice_number: "INV-1042",
      documentCid: "bafy-secret",
      documents: ["bafy-1"],
      fundingDeadline: "2026-12-01",
      dueDate: "2026-12-31",
      created_at: "2026-11-01",
      debtor: "Acme",
    });

    expect(copy).toEqual({ title: "Consulting", debtor: "Acme" });
  });

  it("detects existing values and ignores corrupt storage", () => {
    expect(hasExistingValues({ debtor: "  ", terms: "Net 30" })).toBe(true);
    expect(hasExistingValues({ debtor: "  " })).toBe(false);

    const storage = memoryStorage();
    storage.setItem(TEMPLATE_STORAGE_KEY, "{not json");
    expect(readTemplates(storage)).toEqual([]);
  });

  it("round-trips templates through storage", () => {
    const storage = memoryStorage();
    const template = buildTemplate("Client A", { debtor: "Acme" });
    writeTemplates(storage, [template]);
    expect(readTemplates(storage)).toEqual([template]);
  });
});
