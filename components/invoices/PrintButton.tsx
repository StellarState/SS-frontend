"use client";
/**
 * Print button for invoices and statements (issue #623)
 *
 * Calls window.print() and applies print:hidden to itself so it does not
 * appear in the printed output.
 */
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintButtonProps {
  label?: string;
}

export function PrintButton({ label = "Print" }: PrintButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="print:hidden no-print"
      onClick={() => window.print()}
      aria-label="Print this page"
      data-testid="print-button"
    >
      <Printer className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
