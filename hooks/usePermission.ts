"use client";
/**
 * Per-action permission check for the current authenticated user (#645).
 *
 * Reads the user's role from team data and delegates to `hasPermission`.
 */
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { hasPermission, type TeamAction, type TeamRole } from "@/lib/permissions";

export function usePermission(action: TeamAction): boolean {
  const { address } = useAuth();
  const { data: members } = useTeam();

  if (!address || !members) return false;

  const me = members.find((m) => m.id === address);
  if (!me) return false;

  return hasPermission(me.role as TeamRole, action);
}
