/**
 * Role-based access control for issuer team accounts (#645).
 *
 * Four roles in descending privilege order:
 *   Owner   — full control including billing and team management
 *   Finance — invoice publishing and financial operations
 *   Operator — day-to-day invoice management (no team/billing)
 *   Viewer  — read-only
 */

export type TeamRole = "Owner" | "Finance" | "Operator" | "Viewer";

export type TeamAction =
  | "invite_member"
  | "remove_member"
  | "change_role"
  | "publish_invoice"
  | "cancel_invoice"
  | "relist_invoice"
  | "edit_invoice"
  | "view_invoices"
  | "view_earnings"
  | "manage_billing"
  | "view_team";

export const PERMISSIONS: Record<TeamRole, Set<TeamAction>> = {
  Owner: new Set<TeamAction>([
    "invite_member",
    "remove_member",
    "change_role",
    "publish_invoice",
    "cancel_invoice",
    "relist_invoice",
    "edit_invoice",
    "view_invoices",
    "view_earnings",
    "manage_billing",
    "view_team",
  ]),
  Finance: new Set<TeamAction>([
    "publish_invoice",
    "cancel_invoice",
    "relist_invoice",
    "edit_invoice",
    "view_invoices",
    "view_earnings",
    "view_team",
  ]),
  Operator: new Set<TeamAction>([
    "cancel_invoice",
    "relist_invoice",
    "edit_invoice",
    "view_invoices",
    "view_team",
  ]),
  Viewer: new Set<TeamAction>(["view_invoices", "view_team"]),
};

/**
 * Returns true when `role` is allowed to perform `action`.
 * Unknown roles are treated as Viewer.
 */
export function hasPermission(role: TeamRole, action: TeamAction): boolean {
  const allowed = PERMISSIONS[role] ?? PERMISSIONS["Viewer"];
  return allowed.has(action);
}
