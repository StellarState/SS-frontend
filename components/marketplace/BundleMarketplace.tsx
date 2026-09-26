"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/marketplace/countdown-timer";
import { useAuth } from "@/hooks/useAuth";

interface BundleKey {
  id: string;
  title: string;
  quantity: number;
  individualPrice: number;
}

interface Bundle {
  id: string;
  title: string;
  description: string;
  keys: BundleKey[];
  bundlePrice: number;
  savingsPercentage: number;
  expiresAt: string | null;
  isAvailable: boolean;
}

interface BundleMarketplaceProps {
  bundles?: Bundle[];
  isLoading?: boolean;
}

function BundleListing({ bundle }: { bundle: Bundle }) {
  const { address, loginWithWallet } = useAuth();
  const [isBuying, setIsBuying] = useState(false);

  const individualTotal = bundle.keys.reduce(
    (sum, key) => sum + key.individualPrice * key.quantity,
    0
  );
  const savings = individualTotal - bundle.bundlePrice;

  const handleBuyBundle = async () => {
    if (!address) {
      await loginWithWallet();
      return;
    }

    setIsBuying(true);
    try {
      // Bundle purchase transaction would be handled here
      // This is a placeholder for the actual transaction logic
    } finally {
      setIsBuying(false);
    }
  };

  if (!bundle.isAvailable) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{bundle.title}</h3>
              <p className="text-sm text-muted-foreground">{bundle.description}</p>
            </div>
            <Badge variant="secondary">Unavailable</Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{bundle.title}</h3>
            <p className="text-sm text-muted-foreground">{bundle.description}</p>
          </div>
          {bundle.expiresAt && (
            <div className="flex items-center gap-2">
              <CountdownTimer deadline={bundle.expiresAt} published={true} />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Included Keys</h4>
          <div className="space-y-2">
            {bundle.keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between text-sm rounded-md bg-muted p-2"
              >
                <div>
                  <p className="font-medium">{key.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty: {key.quantity}
                  </p>
                </div>
                <p className="text-sm font-medium">
                  ${(key.individualPrice * key.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Individual Total:</span>
            <span className="font-medium">${individualTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Bundle Price:</span>
            <span className="text-primary">${bundle.bundlePrice.toLocaleString()}</span>
          </div>
          {savings > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>You Save:</span>
              <span>${savings.toLocaleString()}</span>
            </div>
          )}
        </div>

        <Button
          onClick={handleBuyBundle}
          disabled={isBuying}
          className="w-full"
        >
          {isBuying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing
            </>
          ) : (
            `Buy Bundle - $${bundle.bundlePrice.toLocaleString()}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function BundleMarketplace({
  bundles = [],
  isLoading = false,
}: BundleMarketplaceProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bundles.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 text-center">
          <p className="text-muted-foreground">No bundles available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {bundles.map((bundle) => (
        <BundleListing key={bundle.id} bundle={bundle} />
      ))}
    </div>
  );
}

interface BundlePurchaseSuccessProps {
  bundleTitle: string;
  keysReceived: BundleKey[];
  transactionHash: string;
}

export function BundlePurchaseSuccess({
  bundleTitle,
  keysReceived,
  transactionHash,
}: BundlePurchaseSuccessProps) {
  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
              Purchase Successful
            </h3>
            <p className="text-sm text-green-700 dark:text-green-200">
              {bundleTitle} has been purchased
            </p>
          </div>
          <Badge className="bg-green-600">Completed</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">Keys Received</h4>
          <div className="space-y-2">
            {keysReceived.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between text-sm rounded bg-white dark:bg-slate-900 p-2"
              >
                <p>{key.title}</p>
                <p className="font-medium">+{key.quantity}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground break-all">
          <p className="font-medium mb-1">Transaction Hash:</p>
          <code className="block bg-muted p-2 rounded overflow-x-auto">
            {transactionHash}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
