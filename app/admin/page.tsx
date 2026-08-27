"use client";

import { useState } from "react";
import { AdminInvoiceReview } from "@/components/admin/AdminInvoiceReview";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { TimelockProposalsPanel } from "@/components/admin/TimelockProposalsPanel";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    "invoices" | "audit-log" | "timelock"
import { TradingControlsPanel } from "@/components/admin/TradingControlsPanel";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    "invoices" | "audit-log" | "trading-controls"
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
            activeTab === "audit-log"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("audit-log")}
          data-testid="audit-log-tab"
        >
          Audit Log
        </button>
        <button
          type="button"
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "timelock"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("timelock")}
          data-testid="timelock-tab"
        >
          Timelock
            activeTab === "trading-controls"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("trading-controls")}
          data-testid="trading-controls-tab"
        >
          Trading Controls
        </button>
      </div>

      {activeTab === "invoices" && <AdminInvoiceReview />}
      {activeTab === "audit-log" && <AuditLogViewer />}
      {activeTab === "timelock" && <TimelockProposalsPanel />}
      {activeTab === "trading-controls" && <TradingControlsPanel />}
    </div>
  );
}
