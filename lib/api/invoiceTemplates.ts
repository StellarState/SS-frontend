/** Invoice template storage with a localStorage fallback (#609). */

import { SOMA_API_BASE, readSomaJson } from "./somaShared";
import {
  readTemplates,
  TEMPLATE_STORAGE_KEY,
  writeTemplates,
  type InvoiceTemplate,
} from "@/lib/invoiceTemplates";

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function localTemplates(storage: Storage | null): InvoiceTemplate[] {
  return storage ? readTemplates(storage) : [];
}

function hasLocalState(storage: Storage | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(TEMPLATE_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Once the user has saved or deleted a template, localStorage is authoritative.
 * That keeps a stale backend response from resurrecting a deleted template or
 * hiding a new one before the mirror has caught up.
 */
export async function listInvoiceTemplates(): Promise<InvoiceTemplate[]> {
  const storage = browserStorage();
  if (hasLocalState(storage)) return localTemplates(storage);

  try {
    const res = await fetch(`${SOMA_API_BASE}/invoice-templates`);
    if (res.ok) {
      const payload = await readSomaJson(res);
      const rows = Array.isArray(payload)
        ? payload
        : typeof payload === "object" && payload !== null && Array.isArray((payload as { templates?: unknown }).templates)
          ? (payload as { templates: unknown[] }).templates
          : [];
      const templates = rows.filter((entry): entry is InvoiceTemplate => {
        const record = typeof entry === "object" && entry !== null
          ? (entry as Record<string, unknown>)
          : {};
        return typeof record.id === "string" && typeof record.name === "string";
      });
      if (templates.length > 0) {
        if (storage) writeTemplates(storage, templates);
        return templates;
      }
    }
  } catch {
    // Fall through to local storage.
  }

  return localTemplates(storage);
}

export async function saveInvoiceTemplate(template: InvoiceTemplate): Promise<InvoiceTemplate[]> {
  const storage = browserStorage();
  const current = localTemplates(storage);
  const next = [template, ...current.filter((entry) => entry.id !== template.id)];
  if (storage) writeTemplates(storage, next);

  try {
    await fetch(`${SOMA_API_BASE}/invoice-templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template),
    });
  } catch {
    // Local persistence is sufficient for this feature.
  }
  return next;
}

export async function deleteInvoiceTemplate(id: string): Promise<InvoiceTemplate[]> {
  const storage = browserStorage();
  const current = localTemplates(storage);
  const next = current.filter((entry) => entry.id !== id);
  if (storage) writeTemplates(storage, next);

  try {
    await fetch(`${SOMA_API_BASE}/invoice-templates/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch {
    // Local persistence is sufficient for this feature.
  }
  return next;
}
