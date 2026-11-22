"use client";
/**
 * Team management page for issuer companies (#645).
 *
 * Shows all team members with their role badge and status chip. Owners can
 * invite new members (email + role select), resend or revoke pending
 * invitations, change roles, and remove members. The last-owner guard
 * prevents removing or demoting the final Owner.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Mail, Trash2, RefreshCw } from "lucide-react";
import {
  useTeam,
  useInviteMember,
  useChangeRole,
  useRemoveMember,
  useResendInvite,
  type TeamMember,
} from "@/hooks/useTeam";
import type { TeamRole } from "@/lib/permissions";

const ROLES: TeamRole[] = ["Owner", "Finance", "Operator", "Viewer"];

const ROLE_VARIANT: Record<TeamRole, "default" | "secondary" | "outline" | "destructive"> = {
  Owner: "default",
  Finance: "secondary",
  Operator: "outline",
  Viewer: "outline",
};

const STATUS_VARIANT: Record<
  TeamMember["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  active: "default",
  pending: "secondary",
  revoked: "destructive",
};

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
  role: z.enum(["Owner", "Finance", "Operator", "Viewer"] as const),
});
type InviteFormData = z.infer<typeof inviteSchema>;

function countOwners(members: TeamMember[]): number {
  return members.filter((m) => m.role === "Owner" && m.status === "active").length;
}

function InviteMemberModal() {
  const [open, setOpen] = useState(false);
  const invite = useInviteMember();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "Operator" },
  });

  const onSubmit = (data: InviteFormData) => {
    invite.mutate(
      { email: data.email, role: data.role },
      {
        onSuccess: () => {
          reset();
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <UserPlus className="size-4" aria-hidden="true" />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              defaultValue="Operator"
              onValueChange={(v) => setValue("role", v as TeamRole)}
            >
              <SelectTrigger id="invite-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MemberRowProps {
  member: TeamMember;
  ownerCount: number;
}

function MemberRow({ member, ownerCount }: MemberRowProps) {
  const changeRole = useChangeRole();
  const removeMember = useRemoveMember();
  const resendInvite = useResendInvite();

  const isLastOwner = member.role === "Owner" && ownerCount <= 1;

  const handleRoleChange = (role: string) => {
    if (isLastOwner && role !== "Owner") {
      toast.error("Cannot demote the last owner");
      return;
    }
    changeRole.mutate({ memberId: member.id, role: role as TeamRole });
  };

  const handleRemove = () => {
    if (isLastOwner) {
      toast.error("Cannot remove the last owner");
      return;
    }
    removeMember.mutate(member.id);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="flex-1 min-w-0 space-y-0.5">
        {member.name && (
          <p className="font-medium text-sm truncate">{member.name}</p>
        )}
        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={STATUS_VARIANT[member.status]} className="text-xs">
          {member.status}
        </Badge>
        <Select
          value={member.role}
          onValueChange={handleRoleChange}
          disabled={changeRole.isPending}
        >
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r} className="text-xs">
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {member.status === "pending" && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => resendInvite.mutate(member.id)}
            disabled={resendInvite.isPending}
            aria-label="Resend invitation"
          >
            <Mail className="size-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          onClick={handleRemove}
          disabled={removeMember.isPending || isLastOwner}
          aria-label={`Remove ${member.email}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function TeamPage() {
  const { data: members, isLoading, isError } = useTeam();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive text-sm">
          Failed to load team members.
        </CardContent>
      </Card>
    );
  }

  const ownerCount = countOwners(members ?? []);
  const active = (members ?? []).filter((m) => m.status === "active");
  const pending = (members ?? []).filter((m) => m.status === "pending");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Team members</CardTitle>
          <CardDescription>
            Manage who has access to your issuer account.
          </CardDescription>
        </div>
        <InviteMemberModal />
      </CardHeader>
      <CardContent className="space-y-2">
        {active.length > 0 && (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Active
            </p>
            {active.map((m) => (
              <div key={m.id}>
                <MemberRow member={m} ownerCount={ownerCount} />
                <Separator />
              </div>
            ))}
          </>
        )}
        {pending.length > 0 && (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mt-4">
              Pending invitations
            </p>
            {pending.map((m) => (
              <div key={m.id}>
                <MemberRow member={m} ownerCount={ownerCount} />
                <Separator />
              </div>
            ))}
          </>
        )}
        {active.length === 0 && pending.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No team members yet. Invite someone to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
