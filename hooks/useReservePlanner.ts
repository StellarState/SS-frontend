"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchIssuerReserveData } from "@/lib/api";
import { useAuth } from "./useAuth";
import {
  projectReservePlan,
  type Obligation,
  type ScheduledContribution,
  type ReservePlanProjection,
} from "@/lib/analytics/reservePlanner";

export const ISSUER_RESERVE_QUERY_KEY = ["issuer", "reserves"] as const;

const DEFAULT_MOCK_OBLIGATIONS: Obligation[] = [
  {
    id: "ob-inv-101",
    title: "Quarterly Settlement Note #101",
    amount: 15000,
    due_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 6 days
    status: "upcoming",
  },
  {
    id: "ob-inv-102",
    title: "Supplier Alpha Invoice Advance",
    amount: 25000,
    due_date: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 13 days
    status: "upcoming",
  },
  {
    id: "ob-inv-103",
    title: "Logistics Partner Facility Settlement",
    amount: 10000,
    due_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 28 days
    status: "upcoming",
  },
];

const DEFAULT_MOCK_CONTRIBUTIONS: ScheduledContribution[] = [
  {
    id: "sc-contrib-1",
    amount: 12000,
    scheduled_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    label: "Treasury Weekly Sweep",
  },
];

export interface UseReservePlannerOptions {
  initialBalance?: number;
  initialObligations?: Obligation[];
  initialContributions?: ScheduledContribution[];
  initialAsOfDate?: string;
}

export function useReservePlanner(options?: UseReservePlannerOptions) {
  let jwt: string | null | undefined = undefined;
  try {
    const auth = useAuth();
    jwt = auth.jwt;
  } catch {
    // Graceful fallback when rendered outside AuthProvider
    jwt = undefined;
  }

  const query = useQuery({
    queryKey: ISSUER_RESERVE_QUERY_KEY,
    queryFn: () => fetchIssuerReserveData(jwt ?? undefined),
    enabled: Boolean(jwt),
    retry: false,
  });

  const [localContributions, setLocalContributions] = useState<ScheduledContribution[]>(
    () => options?.initialContributions ?? DEFAULT_MOCK_CONTRIBUTIONS,
  );

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (options?.initialAsOfDate) return options.initialAsOfDate;
    const future30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return future30.toISOString().slice(0, 10);
  });

  const [isNotificationDismissed, setIsNotificationDismissed] = useState(false);

  // Fallback to options or mock if API unavailable
  const obligations: Obligation[] = useMemo(() => {
    if (options?.initialObligations) return options.initialObligations;
    if (query.data?.obligations && query.data.obligations.length > 0) {
      return query.data.obligations;
    }
    return DEFAULT_MOCK_OBLIGATIONS;
  }, [options?.initialObligations, query.data?.obligations]);

  const currentBalance = useMemo(() => {
    if (typeof options?.initialBalance === "number") return options.initialBalance;
    if (typeof query.data?.current_balance === "number") return query.data.current_balance;
    return 18000; // default realistic issuer reserve balance
  }, [options?.initialBalance, query.data?.current_balance]);

  const contributions: ScheduledContribution[] = useMemo(() => {
    if (query.data?.scheduled_contributions && query.data.scheduled_contributions.length > 0) {
      return query.data.scheduled_contributions;
    }
    return localContributions;
  }, [query.data?.scheduled_contributions, localContributions]);

  const addContribution = (contribution: Omit<ScheduledContribution, "id">) => {
    const newEntry: ScheduledContribution = {
      ...contribution,
      id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setLocalContributions((prev) => [...prev, newEntry]);
  };

  const removeContribution = (id: string) => {
    setLocalContributions((prev) => prev.filter((item) => item.id !== id));
  };

  const projection: ReservePlanProjection = useMemo(() => {
    return projectReservePlan({
      currentBalance,
      obligations,
      contributions,
      asOfDate: selectedDate,
    });
  }, [currentBalance, obligations, contributions, selectedDate]);

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    obligations,
    contributions,
    currentBalance,
    selectedDate,
    setSelectedDate,
    addContribution,
    removeContribution,
    projection,
    isNotificationDismissed,
    dismissNotification: () => setIsNotificationDismissed(true),
  };
}
