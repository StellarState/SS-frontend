"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoiceTemplates } from "@/hooks/useInvoiceTemplates";
import {
  buildTemplate,
  hasExistingValues,
  templateValues,
} from "@/lib/invoiceTemplates";

/** Saved templates for reusing recurring debtor and terms details. */
export function TemplatesPanel({
  values,
  onApply,
}: {
  values: { debtor?: string; terms?: string; description?: string };
  onApply: (values: { debtor: string; terms: string; description: string }) => void;
}) {
  const [name, setName] = useState("");
  const {
    data: templates = [],
    isLoading,
    saveTemplate,
    deleteTemplate,
    isSaving,
    isDeleting,
  } = useInvoiceTemplates();

  const apply = (templateId: string) => {
    const template = templates.find((entry) => entry.id === templateId);
    if (!template) return;
    if (
      hasExistingValues(values) &&
      !window.confirm("Applying this template will replace the values you already entered. Continue?")
    ) {
      return;
    }
    onApply(templateValues(template));
  };

  return (
    <section className="space-y-3 rounded-lg border p-4" data-testid="templates-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Saved templates</h3>
        <span className="text-xs text-muted-foreground">{templates.length} saved</span>
      </div>

      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Template name"
          aria-label="Template name"
          data-testid="template-name"
        />
        <Button
          type="button"
          variant="outline"
          disabled={!name.trim() || isSaving}
          onClick={async () => {
            await saveTemplate(buildTemplate(name, values));
            setName("");
          }}
          data-testid="template-save"
        >
          Save
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-12 w-full" data-testid="templates-loading" />
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="templates-empty">
          No templates saved yet.
        </p>
      ) : (
        <ul className="divide-y rounded-md border" data-testid="template-rows">
          {templates.map((template) => (
            <li key={template.id} className="flex items-center justify-between p-2 text-sm" data-testid={`template-${template.id}`}>
              <span className="font-medium">{template.name}</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => apply(template.id)} data-testid={`template-apply-${template.id}`}>
                  Apply
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isDeleting}
                  onClick={() => deleteTemplate(template.id)}
                  data-testid={`template-delete-${template.id}`}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
