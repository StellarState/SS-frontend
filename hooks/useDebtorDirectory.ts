"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  type PublicDebtorProfile,
  type RawDebtorRecord,
  sanitizePublicDebtorProfile,
  toggleWatchedDebtor,
  isDebtorWatched,
  WATCHED_DEBTORS_STORAGE_KEY,
} from "@/lib/debtor/organisationDirectory";

const DEMO_RAW_DEBTORS: RawDebtorRecord[] = [
  {
    id: "org-1",
    name: "Apex Logistics International",
    jurisdiction: "Singapore",
    creditRating: "AAA",
    status: "Trusted",
    taxId: "SG-9988221", // Sensitive
    bankAccountIban: "SG650011223344", // Sensitive
    approvedAttestations: ["ACRA Verified", "Dun & Bradstreet Verified"],
    publicDocuments: [
      { id: "doc-1", title: "Certificate of Incorporation", verifiedAt: "2026-01-10" },
      { id: "doc-2", title: "Audited Financials 2025", verifiedAt: "2026-04-15" },
    ],
    invoices: [
      { id: "inv-101", invoiceNumber: "APX-882", amountXLM: 45_000, status: "active", dueDate: "2026-12-15" },
      { id: "inv-102", invoiceNumber: "APX-810", amountXLM: 30_000, status: "settled", dueDate: "2026-10-01", settledAt: "2026-09-28" },
      { id: "inv-103", invoiceNumber: "APX-750", amountXLM: 55_000, status: "settled", dueDate: "2026-08-01", settledAt: "2026-07-30" },
    ],
  },
  {
    id: "org-2",
    name: "Nordic CleanTech Group",
    jurisdiction: "Sweden",
    creditRating: "AA",
    status: "Trusted",
    taxId: "SE-5561234567", // Sensitive
    approvedAttestations: ["Bolagsverket Registry", "Green Bond Compliance"],
    publicDocuments: [
      { id: "doc-3", title: "Annual Sustainability Audit", verifiedAt: "2026-03-20" },
    ],
    invoices: [
      { id: "inv-201", invoiceNumber: "NC-104", amountXLM: 20_000, status: "active", dueDate: "2026-12-30" },
      { id: "inv-202", invoiceNumber: "NC-098", amountXLM: 25_000, status: "settled", dueDate: "2026-09-15", settledAt: "2026-09-14" },
    ],
  },
  {
    id: "org-3",
    name: "Helios Solar Supply Co.",
    jurisdiction: "Germany",
    creditRating: "BBB",
    status: "Watch",
    taxId: "DE-12938475", // Sensitive
    approvedAttestations: ["Handelsregister B"],
    publicDocuments: [],
    invoices: [
      { id: "inv-301", invoiceNumber: "HEL-441", amountXLM: 60_000, status: "active", dueDate: "2026-12-05" },
      { id: "inv-302", invoiceNumber: "HEL-390", amountXLM: 40_000, status: "in_dispute", dueDate: "2026-10-15" },
    ],
  },
];

export function useDebtorDirectory() {
  const [debtors] = useState<PublicDebtorProfile[]>(() =>
    DEMO_RAW_DEBTORS.map(sanitizePublicDebtorProfile),
  );

  const [watchedIds, setWatchedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["org-1"];
    try {
      const stored = window.localStorage.getItem(WATCHED_DEBTORS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return ["org-1"];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [watchedOnly, setWatchedOnly] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        WATCHED_DEBTORS_STORAGE_KEY,
        JSON.stringify(watchedIds),
      );
    } catch {
      // ignore
    }
  }, [watchedIds]);

  const toggleWatch = useCallback((debtorId: string) => {
    setWatchedIds((prev) => toggleWatchedDebtor(prev, debtorId));
  }, []);

  const filteredDebtors = useMemo(() => {
    return debtors.filter((d) => {
      if (watchedOnly && !isDebtorWatched(watchedIds, d.id)) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(q);
        const matchesJurisdiction = d.jurisdiction.toLowerCase().includes(q);
        if (!matchesName && !matchesJurisdiction) return false;
      }
      return true;
    });
  }, [debtors, watchedIds, watchedOnly, statusFilter, searchQuery]);

  return {
    debtors: filteredDebtors,
    totalCount: debtors.length,
    watchedIds,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    watchedOnly,
    setWatchedOnly,
    toggleWatch,
  };
}
