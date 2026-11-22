"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  type UnderwriterProfile,
  type ReputationMetrics,
  type CapacityReconciliation,
  type SlashingEvent,
  type InvoiceHistoryRecord,
  calculateReputation,
  reconcileCapacity,
  sanitizeUnderwriterProfile,
  isUnderwriterFollowed,
  toggleFollowUnderwriter,
} from "@/lib/underwriting/reputationProfile";
import { MOCK_UNDERWRITERS } from "@/lib/underwriting/mockData";

export interface UseUnderwriterProfileOptions {
  initialProfile?: UnderwriterProfile;
  autoFetch?: boolean;
}

export function useUnderwriterProfile(
  underwriterId?: string | null,
  options: UseUnderwriterProfileOptions = {}
) {
  const { initialProfile, autoFetch = true } = options;

  const [profile, setProfile] = useState<UnderwriterProfile | null>(() => {
    if (initialProfile) return sanitizeUnderwriterProfile(initialProfile);
    if (!underwriterId) return null;
    const found = MOCK_UNDERWRITERS.find((u) => u.id === underwriterId || u.address === underwriterId);
    return found ? sanitizeUnderwriterProfile(found) : null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFollowed, setIsFollowed] = useState<boolean>(() => {
    return underwriterId ? isUnderwriterFollowed(underwriterId) : false;
  });

  // Sync follow state on ID change or localStorage change
  useEffect(() => {
    if (underwriterId) {
      setIsFollowed(isUnderwriterFollowed(underwriterId));
    }
  }, [underwriterId]);

  // Load profile if needed
  useEffect(() => {
    if (!autoFetch || !underwriterId) return;

    // Simulate async data fetching
    setIsLoading(true);
    const timer = setTimeout(() => {
      const found =
        initialProfile ??
        MOCK_UNDERWRITERS.find((u) => u.id === underwriterId || u.address === underwriterId) ??
        null;

      if (found) {
        setProfile(sanitizeUnderwriterProfile(found));
      }
      setIsFollowed(isUnderwriterFollowed(underwriterId));
      setIsLoading(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [underwriterId, initialProfile, autoFetch]);

  const toggleFollow = useCallback(() => {
    if (!underwriterId && !profile?.id) return false;
    const targetId = underwriterId || profile!.id;
    const next = toggleFollowUnderwriter(targetId);
    setIsFollowed(next);
    setProfile((prev) => (prev ? { ...prev, isFollowed: next } : null));
    return next;
  }, [underwriterId, profile]);

  const recalculate = useCallback(() => {
    setProfile((prev) => {
      if (!prev) return null;
      const rep = calculateReputation(prev.invoiceHistory);
      const cap = reconcileCapacity(prev.totalCapacity, prev.activeCover, prev.reservedCover);
      return {
        ...prev,
        reputation: rep,
        capacity: cap,
      };
    });
  }, []);

  const metrics = useMemo<ReputationMetrics | null>(() => {
    if (!profile) return null;
    return profile.reputation ?? calculateReputation(profile.invoiceHistory);
  }, [profile]);

  const capacity = useMemo<CapacityReconciliation | null>(() => {
    if (!profile) return null;
    return (
      profile.capacity ??
      reconcileCapacity(profile.totalCapacity, profile.activeCover, profile.reservedCover)
    );
  }, [profile]);

  return {
    profile,
    setProfile,
    isLoading,
    isFollowed,
    toggleFollow,
    recalculate,
    metrics,
    capacity,
  };
}

export type CapacityFilterType = "all" | "available" | "exhausted" | "high-capacity";

export function useUnderwriterDirectory(initialUnderwriters: UnderwriterProfile[] = MOCK_UNDERWRITERS) {
  const [underwriters, setUnderwriters] = useState<UnderwriterProfile[]>(() =>
    initialUnderwriters.map(sanitizeUnderwriterProfile)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilterType>("all");
  const [followedOnly, setFollowedOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleFollow = useCallback((id: string) => {
    const next = toggleFollowUnderwriter(id);
    setUnderwriters((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isFollowed: next } : u))
    );
    return next;
  }, []);

  const filteredUnderwriters = useMemo(() => {
    return underwriters.filter((u) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = u.name.toLowerCase().includes(query);
        const matchesAddress = u.address.toLowerCase().includes(query);
        if (!matchesName && !matchesAddress) return false;
      }

      // Followed filter
      if (followedOnly && !isUnderwriterFollowed(u.id)) {
        return false;
      }

      // Capacity filter
      const cap = u.capacity ?? reconcileCapacity(u.totalCapacity, u.activeCover, u.reservedCover);
      if (capacityFilter === "available" && cap.availableCapacity <= 0) {
        return false;
      }
      if (capacityFilter === "exhausted" && !cap.isExhausted) {
        return false;
      }
      if (capacityFilter === "high-capacity" && u.totalCapacity < 500_000) {
        return false;
      }

      return true;
    });
  }, [underwriters, searchQuery, capacityFilter, followedOnly]);

  return {
    underwriters,
    filteredUnderwriters,
    searchQuery,
    setSearchQuery,
    capacityFilter,
    setCapacityFilter,
    followedOnly,
    setFollowedOnly,
    isLoading,
    setIsLoading,
    toggleFollow,
  };
}
