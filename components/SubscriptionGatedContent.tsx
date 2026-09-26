"use client";

import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionGatingProps {
  title: string;
  description?: string;
  minKeyBalance: number;
  requiredKeyId: string;
  requiredKeyName: string;
  userKeyBalance: number | null;
  subscriptionExpiresAt?: string | null;
  isSubscriptionActive: boolean;
  children: React.ReactNode;
}

function formatCountdown(expiresAt: string, now: number): string {
  const remaining = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "Expired";

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function SubscriptionGatedContent({
  title,
  description,
  minKeyBalance,
  requiredKeyId,
  requiredKeyName,
  userKeyBalance,
  subscriptionExpiresAt,
  isSubscriptionActive,
  children,
}: SubscriptionGatingProps) {
  const { address, loginWithWallet } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const hasAccess = userKeyBalance !== null && userKeyBalance >= minKeyBalance;

  if (!address) {
    return (
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your wallet to check subscription status
            </p>
            <Button onClick={loginWithWallet} className="w-full">
              Connect Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasAccess) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-amber-900 dark:text-amber-100">
                {title}
              </h2>
              {description && (
                <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
                  {description}
                </p>
              )}
            </div>
            <Lock className="h-5 w-5 text-amber-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-white dark:bg-slate-900 p-3">
            <p className="text-sm font-medium mb-2">Minimum Holding Required</p>
            <p className="text-2xl font-bold text-amber-600">
              {minKeyBalance.toLocaleString()} {requiredKeyName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your current balance: {userKeyBalance ?? 0}
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Buy {requiredKeyName} to unlock this exclusive content
          </p>

          <Button asChild className="w-full">
            <Link href={`/marketplace/${requiredKeyId}`}>
              Buy {requiredKeyName}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {isSubscriptionActive && (
        <div className="mb-4 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 p-3 flex items-start justify-between">
          <div className="flex items-start gap-2">
            <Unlock className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Subscription Active
              </p>
              {subscriptionExpiresAt && (
                <p className="text-xs text-green-700 dark:text-green-200">
                  Expires in {formatCountdown(subscriptionExpiresAt, now)}
                </p>
              )}
            </div>
          </div>
          <Badge variant="default" className="bg-green-600">
            Active
          </Badge>
        </div>
      )}

      {children}
    </div>
  );
}

interface SubscriptionStatusCheckProps {
  keyId: string;
  minKeyBalance: number;
  onStatusChange?: (hasAccess: boolean) => void;
}

export function SubscriptionStatusChecker({
  keyId,
  minKeyBalance,
  onStatusChange,
}: SubscriptionStatusCheckProps) {
  const { address } = useAuth();
  const [status, setStatus] = useState<"checking" | "active" | "inactive">(
    "checking"
  );

  useEffect(() => {
    if (!address) {
      setStatus("inactive");
      onStatusChange?.(false);
      return;
    }

    const checkStatus = async () => {
      try {
        // Subscription status check would be performed here
        // This is a placeholder for the actual API call
        const hasAccess = false; // Replace with actual check
        setStatus(hasAccess ? "active" : "inactive");
        onStatusChange?.(hasAccess);
      } catch {
        setStatus("inactive");
        onStatusChange?.(false);
      }
    };

    checkStatus();
  }, [address, keyId, minKeyBalance, onStatusChange]);

  if (status === "checking") {
    return <div className="text-sm text-muted-foreground">Checking access...</div>;
  }

  if (status === "active") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Unlock className="h-4 w-4" />
        Subscription Active
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-amber-600">
      <Lock className="h-4 w-4" />
      Subscription Required
    </div>
  );
}
