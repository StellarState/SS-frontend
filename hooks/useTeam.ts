"use client";
/**
 * Team member data-fetching and mutation hooks for issuer team accounts (#645).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TeamRole } from "@/lib/permissions";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const TEAM_QUERY_KEY = ["team-members"] as const;

export interface TeamMember {
  id: string;
  email: string;
  name?: string;
  role: TeamRole;
  /** "active" | "pending" | "revoked" */
  status: "active" | "pending" | "revoked";
  joined_at?: string | null;
  invited_at?: string | null;
}

export interface TeamResponse {
  members: TeamMember[];
}

async function fetchTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch(`${API_BASE}/team/members`);
  if (!res.ok) throw new Error("Failed to fetch team members");
  const data: TeamResponse = await res.json();
  return data.members ?? [];
}

export function useTeam() {
  return useQuery<TeamMember[]>({
    queryKey: TEAM_QUERY_KEY,
    queryFn: fetchTeamMembers,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// --- Mutations ---

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: TeamRole }) => {
      const res = await fetch(`${API_BASE}/team/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) throw new Error("Failed to invite member");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Invitation sent");
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to send invitation");
    },
  });
}

export function useChangeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: TeamRole }) => {
      const res = await fetch(`${API_BASE}/team/members/${memberId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to change role");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to update role");
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`${API_BASE}/team/members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove member");
    },
    onSuccess: () => {
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to remove member");
    },
  });
}

export function useResendInvite() {
  return useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`${API_BASE}/team/members/${memberId}/resend`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to resend invite");
    },
    onSuccess: () => {
      toast.success("Invitation resent");
    },
    onError: () => {
      toast.error("Failed to resend invitation");
    },
  });
}
