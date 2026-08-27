"use client";

import { useState } from "react";
import { AdminInvoiceReview } from "@/components/admin/AdminInvoiceReview";
import { AdminSettlements } from "@/components/admin/AdminSettlements";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    "invoices" | "settlements" | "audit-log"
  >("invoices");

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex gap-4 border-b">
        <button
          type="button"
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "invoices"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("invoices")}
        >
          Invoices
        </button>
        <button
          type="button"
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "settlements"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("settlements")}
          data-testid="settlements-tab"
        >
          Settlements
        </button>
        <button
          type="button"
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "audit-log"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("audit-log")}
          data-testid="audit-log-tab"
        >
          Audit Log
        </button>
      </div>

      {activeTab === "invoices" && <AdminInvoiceReview />}
      {activeTab === "settlements" && <AdminSettlements />}
      {activeTab === "audit-log" && <AuditLogViewer />}
    </div>
  );
}
