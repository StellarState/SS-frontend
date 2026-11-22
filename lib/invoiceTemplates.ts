/** Reusable invoice template helpers (#609). */

export interface InvoiceTemplate {
  id: string;
  name: string;
  debtor: string;
  terms: string;
  description: string;
  createdAt: string;
}

/** Unique and sensitive fields are never stored in a template. */
export type TemplateSource = Partial<InvoiceTemplate> & {
  invoice_number?: string;
  documentCid?: string | null;
  fundingDeadline?: string;
  dueDate?: string;
};

export function buildTemplate(name: string, source: TemplateSource): InvoiceTemplate {
  return {
    id: source.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    debtor: source.debtor ?? "",
    terms: source.terms ?? "",
    description: source.description ?? "",
    createdAt: source.createdAt ?? new Date().toISOString(),
  };
}

export function templateValues(template: InvoiceTemplate) {
  return {
    debtor: template.debtor,
    terms: template.terms,
    description: template.description,
  };
}

export function hasExistingValues(values: {
  debtor?: string;
  terms?: string;
  description?: string;
}): boolean {
  return Boolean(values.debtor?.trim() || values.terms?.trim() || values.description?.trim());
}

/** Duplicate keeps commercial fields but clears unique and dated fields. */
export function duplicateInvoice<T extends Record<string, unknown>>(invoice: T): T {
  const copy = { ...invoice } as Record<string, unknown>;
  for (const key of [
    "id",
    "invoice_number",
    "documentCid",
    "documents",
    "fundingDeadline",
    "due_date",
    "dueDate",
    "created_at",
    "settled_at",
  ]) {
    delete copy[key];
  }
  return copy as T;
}

export const TEMPLATE_STORAGE_KEY = "ss:invoice-templates:v1";

export function readTemplates(storage: Storage): InvoiceTemplate[] {
  try {
    const raw = storage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is InvoiceTemplate => {
      const record = typeof entry === "object" && entry !== null
        ? (entry as Record<string, unknown>)
        : {};
      return typeof record.id === "string" && typeof record.name === "string";
    });
  } catch {
    return [];
  }
}

export function writeTemplates(storage: Storage, templates: readonly InvoiceTemplate[]): void {
  try {
    storage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // Storage can be unavailable; the in-memory query cache still works.
  }
}
