"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface MergeProposalVotingProps {
  keyId: string;
  sourceKeyId: string;
  sourceKeyName: string;
  votingDeadline: string;
  requiredApprovalPercentage: number;
  currentApprovalPercentage: number;
  totalVotingWeight: number;
  userVotingWeight?: number;
  userHasVoted?: boolean;
  userVote?: "approve" | "reject" | null;
  votingStatus: "pending" | "passed" | "failed" | "expired";
}

function formatCountdown(deadline: string, now: number): string {
  const remaining = new Date(deadline).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "Voting ended";

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export function MergeProposalVoting({
  sourceKeyName,
  votingDeadline,
  requiredApprovalPercentage,
  currentApprovalPercentage,
  userVotingWeight,
  userHasVoted,
  userVote,
  votingStatus,
}: MergeProposalVotingProps) {
  const { address, loginWithWallet } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const isActive = votingStatus === "pending";
  const canVote = isActive && !userHasVoted && Boolean(userVotingWeight && userVotingWeight > 0);

  const handleVote = async (vote: "approve" | "reject") => {
    if (!address) {
      await loginWithWallet();
      return;
    }

    setIsVoting(true);
    try {
      // Vote submission would be handled here
      // This is a placeholder for the actual vote transaction logic
    } finally {
      setIsVoting(false);
    }
  };

  const statusConfig = {
    pending: { icon: Clock, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
    passed: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
    failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
    expired: { icon: XCircle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
  };

  const config = statusConfig[votingStatus];
  const StatusIcon = config.icon;

  return (
    <Card className={`border-opacity-50 ${config.bg}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Merge Proposal</h3>
              <Badge variant={isActive ? "default" : "secondary"}>
                {votingStatus === "passed" ? "Approved" : votingStatus === "failed" ? "Rejected" : "Voting"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Merge {sourceKeyName} with source key
            </p>
          </div>
          {isActive && (
            <div className="flex items-center gap-1 text-sm font-medium">
              <StatusIcon className={`h-4 w-4 ${config.color}`} />
              {formatCountdown(votingDeadline, now)}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Approval</span>
            <span className="font-semibold">{currentApprovalPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${Math.min(currentApprovalPercentage, 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Required: {requiredApprovalPercentage}%
          </div>
        </div>

        {userHasVoted && userVote && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <p className="text-muted-foreground">
              Your vote:{" "}
              <span
                className={
                  userVote === "approve"
                    ? "font-semibold text-green-600"
                    : "font-semibold text-red-600"
                }
              >
                {userVote === "approve" ? "Approve" : "Reject"}
              </span>
            </p>
          </div>
        )}

        {canVote && (
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleVote("approve")}
              disabled={isVoting}
              className="flex-1"
            >
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleVote("reject")}
              disabled={isVoting}
              className="flex-1"
            >
              Reject
            </Button>
          </div>
        )}

        {!canVote && isActive && !userHasVoted && (
          <Button
            variant="outline"
            size="sm"
            onClick={loginWithWallet}
            className="w-full"
          >
            Connect Wallet to Vote
          </Button>
        )}

        {votingStatus === "passed" && (
          <div className="rounded-md bg-green-50 dark:bg-green-950 px-3 py-2 text-sm">
            <p className="font-semibold text-green-900 dark:text-green-100">
              Merge approved
            </p>
            <p className="text-xs text-green-700 dark:text-green-200">
              The merge proposal reached {requiredApprovalPercentage}% approval
            </p>
          </div>
        )}

        {votingStatus === "failed" && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 px-3 py-2 text-sm">
            <p className="font-semibold text-red-900 dark:text-red-100">
              Merge rejected
            </p>
            <p className="text-xs text-red-700 dark:text-red-200">
              Did not reach {requiredApprovalPercentage}% approval threshold
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
