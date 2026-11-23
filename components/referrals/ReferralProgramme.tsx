"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Copy,
  Download,
  Facebook,
  Gift,
  Link2,
  Linkedin,
  Mail,
  Send,
  ShieldAlert,
  Twitter,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReferralTierPanel } from "@/components/referrals/ReferralTierPanel";
import { REFERRAL_TIER_QUERY_KEY } from "@/hooks/useReferralTier";
import { useWallet } from "@/context/WalletContext";
import {
  type AttributedReferral,
  type ReferralAccountStage,
  type ReferralRewardState,
  calculateReferralDashboardMetrics,
  generateInstitutionalReferralCsv,
  processRewardReversal,
  validateReferralAttribution,
} from "@/lib/referralAttribution";

const REWARD_PER_REFERRAL = 25;
const REWARD_CURRENCY = "XLM";

const INITIAL_ATTRIBUTED_REFERRALS: AttributedReferral[] = [
  {
    id: "ref-101",
    referralCode: "STELLAR-7K2Q9A",
    referrerWallet: "G_CURRENT_USER_WALLET",
    refereeWallet: "GDA4N3Z7257FAGI5L4U6OPQRV7W72A5U4W6L8F3X5Z2G8Q",
    refereeName: "Amara Okafor",
    stage: "retained",
    rewardState: "paid",
    investedAmount: 1500,
    reward: REWARD_PER_REFERRAL,
    attributedAt: "2026-08-12T10:00:00Z",
    qualifiedAt: "2026-08-13T11:00:00Z",
    fundedAt: "2026-08-14T12:00:00Z",
    retainedAt: "2026-09-15T10:00:00Z",
    privateEmail: "amara@example.com",
    privateKycDocId: "KYC-DOC-98213",
    privateIp: "192.168.1.101",
  },
  {
    id: "ref-102",
    referralCode: "STELLAR-7K2Q9A",
    referrerWallet: "G_CURRENT_USER_WALLET",
    refereeWallet: "GBV47289XNDS8372648719284729183748291029384729",
    refereeName: "Jonas Weber",
    stage: "qualified",
    rewardState: "pending",
    investedAmount: 0,
    reward: 0,
    attributedAt: "2026-09-02T14:30:00Z",
    qualifiedAt: "2026-09-03T16:00:00Z",
    privateEmail: "jonas@example.com",
    privateKycDocId: "KYC-DOC-11244",
    privateIp: "192.168.1.102",
  },
  {
    id: "ref-103",
    referralCode: "STELLAR-7K2Q9A",
    referrerWallet: "G_CURRENT_USER_WALLET",
    refereeWallet: "GCF982736451029384756102938475610293847561029",
    refereeName: "Priya Nair",
    stage: "funded",
    rewardState: "pending",
    investedAmount: 1200,
    reward: REWARD_PER_REFERRAL,
    attributedAt: "2026-09-18T09:15:00Z",
    qualifiedAt: "2026-09-18T10:00:00Z",
    fundedAt: "2026-09-19T14:00:00Z",
    privateEmail: "priya@example.com",
    privateKycDocId: "KYC-DOC-44781",
    privateIp: "192.168.1.103",
  },
  {
    id: "ref-104",
    referralCode: "STELLAR-7K2Q9A",
    referrerWallet: "G_CURRENT_USER_WALLET",
    refereeWallet: "GDF827361928475610293847561029384756102938475",
    refereeName: "Diego Santos",
    stage: "pending",
    rewardState: "pending",
    investedAmount: 0,
    reward: 0,
    attributedAt: "2026-09-25T11:45:00Z",
    privateEmail: "diego@example.com",
    privateKycDocId: "KYC-DOC-55102",
    privateIp: "192.168.1.104",
  },
  {
    id: "ref-105",
    referralCode: "STELLAR-7K2Q9A",
    referrerWallet: "G_CURRENT_USER_WALLET",
    refereeWallet: "GEX998877665544332211009988776655443322110099",
    refereeName: "Syndicate Bot Alpha",
    stage: "qualified",
    rewardState: "reversed",
    investedAmount: 500,
    reward: REWARD_PER_REFERRAL,
    attributedAt: "2026-09-28T08:00:00Z",
    qualifiedAt: "2026-09-28T08:30:00Z",
    reversedAt: "2026-09-30T10:00:00Z",
    reversalReason: "Compliance reversal: duplicate wallet cluster detected.",
    privateEmail: "bot@example.com",
    privateKycDocId: "KYC-DOC-99999",
    privateIp: "10.0.0.1",
  },
];

export function ReferralProgramme() {
  const { address } = useWallet();
  const currentWallet = address || "G_CURRENT_USER_WALLET";

  const [referralCode, setReferralCode] = useState("STELLAR-7K2Q9A");
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<AttributedReferral[]>(INITIAL_ATTRIBUTED_REFERRALS);
  const [filterTab, setFilterTab] = useState<string>("all");

  // Attribution test/creation inputs
  const [newRefereeWallet, setNewRefereeWallet] = useState("");
  const [attributionError, setAttributionError] = useState<string | null>(null);
  const [attributionSuccess, setAttributionSuccess] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const referralLink = useMemo(() => {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://stellarsettle.app";
    return `${base}/signup?ref=${referralCode}`;
  }, [referralCode]);

  const metrics = useMemo(
    () => calculateReferralDashboardMetrics(referrals),
    [referrals],
  );

  // Invalidate referral tier when paid rewards change
  const previousPaid = useRef(metrics.paidRewardsTotal);
  useEffect(() => {
    if (previousPaid.current === metrics.paidRewardsTotal) return;
    previousPaid.current = metrics.paidRewardsTotal;
    void queryClient.invalidateQueries({ queryKey: REFERRAL_TIER_QUERY_KEY });
  }, [queryClient, metrics.paidRewardsTotal]);

  const copyLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const el = document.getElementById("referral-link-input") as HTMLInputElement | null;
        el?.select();
        if (typeof document.execCommand === "function") {
          document.execCommand("copy");
        }
      }
    } catch {
      const el = document.getElementById("referral-link-input") as HTMLInputElement | null;
      el?.select();
      if (typeof document.execCommand === "function") {
        document.execCommand("copy");
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCsv = () => {
    const csvContent = generateInstitutionalReferralCsv(referrals);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `institutional_referrals_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAttributionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttributionError(null);
    setAttributionSuccess(null);

    const validation = validateReferralAttribution(
      currentWallet,
      newRefereeWallet,
      referrals,
    );

    if (!validation.valid) {
      setAttributionError(validation.error ?? "Failed to attribute referral.");
      return;
    }

    const newReferral: AttributedReferral = {
      id: `ref-${Date.now()}`,
      referralCode,
      referrerWallet: currentWallet,
      refereeWallet: newRefereeWallet.trim(),
      refereeName: `Investor ${newRefereeWallet.slice(0, 6)}...`,
      stage: "qualified",
      rewardState: "pending",
      investedAmount: 0,
      reward: 0,
      attributedAt: new Date().toISOString(),
      qualifiedAt: new Date().toISOString(),
      privateEmail: "confidential@example.com",
      privateKycDocId: "KYC-PRIVATE-001",
      privateIp: "127.0.0.1",
    };

    setReferrals((prev) => [newReferral, ...prev]);
    setNewRefereeWallet("");
    setAttributionSuccess("Referral successfully attributed and validated.");
  };

  const handleReverseReward = (id: string, reason: string) => {
    setReferrals((prev) =>
      prev.map((r) => (r.id === id ? processRewardReversal(r, reason) : r)),
    );
  };

  const filteredReferrals = useMemo(() => {
    if (filterTab === "all") return referrals;
    if (filterTab === "qualified") return referrals.filter((r) => r.stage === "qualified");
    if (filterTab === "funded") return referrals.filter((r) => r.stage === "funded");
    if (filterTab === "retained") return referrals.filter((r) => r.stage === "retained");
    if (filterTab === "reversed") return referrals.filter((r) => r.rewardState === "reversed");
    return referrals;
  }, [filterTab, referrals]);

  const shareTargets = [
    {
      label: "Share on X",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `Join me on StellarSettle and invest in tokenized invoices! ${referralLink}`
      )}`,
    },
    {
      label: "Share on Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    },
    {
      label: "Share on LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
    },
    {
      label: "Share via Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Join me on StellarSettle!")}`,
    },
    {
      label: "Share via email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent("Join me on StellarSettle")}&body=${encodeURIComponent(`Sign up with my referral link: ${referralLink}`)}`,
    },
  ];

  return (
    <div className="space-y-6" data-testid="referral-dashboard">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Referral Program Attribution Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Monitor verified referral attributions, track account qualification stages, and export institutional compliance reports.
          </p>
        </div>
        <Button
          onClick={handleExportCsv}
          variant="outline"
          className="gap-2 shrink-0"
          data-testid="export-institutional-csv-btn"
        >
          <Download className="h-4 w-4" /> Export Institutional CSV
        </Button>
      </div>

      {/* Account Stages Breakdown */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="referral-account-stages">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Qualified Accounts</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between" data-testid="qualified-count">
              {metrics.qualifiedCount}
              <UserCheck className="h-5 w-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Passed KYC and attribution criteria
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Funded Accounts</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between" data-testid="funded-count">
              {metrics.fundedCount}
              <Wallet className="h-5 w-5 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Completed initial investment
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Retained Accounts</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between" data-testid="retained-count">
              {metrics.retainedCount}
              <Users className="h-5 w-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Active position held &gt; 30 days
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Attributed</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between" data-testid="total-referrals-count">
              {metrics.totalCount}
              <BadgeCheck className="h-5 w-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Total unique referee accounts
          </CardContent>
        </Card>
      </div>

      {/* Rewards Status Summary: Pending, Paid, Reversed */}
      <div className="grid gap-4 sm:grid-cols-3" data-testid="rewards-attribution-states">
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-800 dark:text-amber-300">Pending Rewards</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-900 dark:text-amber-100" data-testid="pending-rewards-total">
              {metrics.pendingRewardsTotal} {REWARD_CURRENCY}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-amber-700 dark:text-amber-300">
            Awaiting retention threshold clearing
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-800 dark:text-emerald-300">Paid Rewards</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-900 dark:text-emerald-100" data-testid="paid-rewards-total">
              {metrics.paidRewardsTotal} {REWARD_CURRENCY}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-emerald-700 dark:text-emerald-300">
            Disbursed to connected wallet
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-rose-800 dark:text-rose-300">Reversed Rewards</CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-900 dark:text-rose-100" data-testid="reversed-rewards-total">
              {metrics.reversedRewardsTotal} {REWARD_CURRENCY}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-rose-700 dark:text-rose-300">
            Clawed back by fraud or audit policy
          </CardContent>
        </Card>
      </div>

      {/* Tier progress component */}
      <ReferralTierPanel />

      {/* Unique Referral Code and Link Settings */}
      <Card data-testid="referral-code-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="size-5" aria-hidden="true" /> Referral Code &amp; Link Settings
          </CardTitle>
          <CardDescription>
            Unique copyable link. Earn {REWARD_PER_REFERRAL} {REWARD_CURRENCY} per funded and retained referral.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="referral-link-input">Referral link</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="referral-link-input"
                type="text"
                value={referralLink}
                readOnly
                aria-describedby="referral-code-hint"
                onFocus={(e) => e.target.select()}
                data-testid="referral-link-input"
              />
              <Button
                type="button"
                onClick={copyLink}
                aria-live="polite"
                aria-label="Copy referral link to clipboard"
                data-testid="copy-referral-link-btn"
              >
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p id="referral-code-hint">
                Your unique referral code: <span className="font-mono font-medium text-foreground" data-testid="referral-code-display">{referralCode}</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReferralCode(`STELLAR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`)}
                className="text-xs h-7 text-primary"
                data-testid="regenerate-code-btn"
              >
                Generate New Code
              </Button>
            </div>
          </div>

          <div>
            <p id="share-label" className="mb-2 text-sm font-medium">
              Share via
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="share-label">
              {shareTargets.map(({ label, icon: Icon, href }) => (
                <Button key={label} type="button" variant="outline" size="icon" asChild>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
                    <Icon aria-hidden="true" />
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attribution & Fraud Prevention Form */}
      <Card data-testid="attribution-validator-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" /> Attribute &amp; Verify Referee Account
          </CardTitle>
          <CardDescription>
            Register referee wallet under your code. Self-referrals and duplicate accounts are strictly blocked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={handleAttributionSubmit} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="text"
              placeholder="Referee Stellar Wallet Address (G...)"
              value={newRefereeWallet}
              onChange={(e) => setNewRefereeWallet(e.target.value)}
              data-testid="referee-wallet-input"
              className="flex-1"
            />
            <Button type="submit" data-testid="attribute-referee-btn">
              Attribute Referral
            </Button>
          </form>

          {attributionError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" data-testid="attribution-error" role="alert">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{attributionError}</span>
            </div>
          )}

          {attributionSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100" data-testid="attribution-success">
              <Check className="h-4 w-4 shrink-0" />
              <span>{attributionSuccess}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attributed Accounts Table with Tab Filtering */}
      <Card data-testid="attributed-referrals-card">
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <CardTitle>Attributed Referral Accounts</CardTitle>
              <CardDescription>
                Audited list of referee accounts, qualification stages, and reward states.
              </CardDescription>
            </div>
            <Tabs value={filterTab} onValueChange={setFilterTab}>
              <TabsList aria-label="Filter accounts by stage" data-testid="referral-stage-tabs">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="qualified">Qualified</TabsTrigger>
                <TabsTrigger value="funded">Funded</TabsTrigger>
                <TabsTrigger value="retained">Retained</TabsTrigger>
                <TabsTrigger value="reversed">Reversed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Table aria-label="Attributed referral accounts" data-testid="attributed-referrals-table">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Referee Account</TableHead>
                <TableHead scope="col">Attribution Date</TableHead>
                <TableHead scope="col">Account Stage</TableHead>
                <TableHead scope="col">Reward State</TableHead>
                <TableHead scope="col" className="text-right">Volume</TableHead>
                <TableHead scope="col" className="text-right">Reward</TableHead>
                <TableHead scope="col" className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferrals.map((r) => (
                <TableRow key={r.id} data-testid={`referral-row-${r.id}`}>
                  <TableCell>
                    <div className="font-medium">{r.refereeName}</div>
                    <div className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">
                      {r.refereeWallet}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <time dateTime={r.attributedAt}>
                      {new Date(r.attributedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={r.stage === "retained" ? "default" : r.stage === "funded" ? "secondary" : "outline"}
                      className="capitalize"
                      data-testid={`stage-badge-${r.id}`}
                    >
                      {r.stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={r.rewardState === "paid" ? "default" : r.rewardState === "reversed" ? "destructive" : "secondary"}
                      className="capitalize"
                      data-testid={`reward-state-badge-${r.id}`}
                    >
                      {r.rewardState}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {r.investedAmount.toLocaleString()} XLM
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {r.rewardState === "reversed" ? (
                      <span className="text-destructive line-through">0 XLM</span>
                    ) : r.reward > 0 ? (
                      `+${r.reward} ${REWARD_CURRENCY}`
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.rewardState !== "reversed" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:bg-destructive/10 h-7"
                        onClick={() => handleReverseReward(r.id, "Administrative clawback")}
                        data-testid={`reverse-reward-btn-${r.id}`}
                      >
                        Reverse
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground italic" title={r.reversalReason}>
                        Reversed
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Institutional Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Institutional Compliance &amp; Attribution Rules</CardTitle>
          <CardDescription>Fraud protection, self-referral rejection, and settlement policies.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              <strong>Attribution Boundaries:</strong> Accounts are attributed strictly on first touch and qualified upon KYC approval.
            </li>
            <li>
              <strong>Anti-Fraud Protection:</strong> Self-referrals and accounts within the same ownership cluster are immediately rejected.
            </li>
            <li>
              <strong>Reversals &amp; Clawbacks:</strong> In the event of chargebacks, suspicious activity, or rapid capital withdrawal before retention periods, rewards transition to <em>reversed</em> status and are reconciled against ledger balances.
            </li>
            <li>
              <strong>Institutional CSV Exports:</strong> Sanitized audit files exclude private personal information (emails, doc IDs) for institutional compliance.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
