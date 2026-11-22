/**
 * Transaction Replay & Audit Timeline Domain Logic (Issue #670)
 *
 * Provides full cross-layer traceability across UI, API, and Stellar/Soroban blockchain:
 * - 5 explicit stages: initiated, signed, submitted, confirmed, settled
 * - Dual timestamps: server and chain ledger sources
 * - Explorer hash linking to configured network
 * - Discrimination between transient pending retry and terminal failure
 * - Copyable support diagnostic IDs with strict secret exclusion
 */

export type TimelineStageName =
  | "initiated"
  | "signed"
  | "submitted"
  | "confirmed"
  | "settled";

export type StageStatus = "completed" | "in_progress" | "pending" | "failed";

export interface TimelineStage {
  name: TimelineStageName;
  label: string;
  status: StageStatus;
  timestampServer?: string; // Server ISO timestamp
  timestampChain?: string; // Ledger / Chain ISO timestamp
  hash?: string; // Transaction / envelope hash
  contractEventName?: string; // Soroban contract event (e.g. InvoiceSettled)
  sourceLayer: "UI" | "API" | "Horizon" | "Soroban RPC";
  failureReason?: string;
  isTerminalFailure?: boolean;
}

export interface TransactionAuditRecord {
  txId: string;
  diagnosticId: string; // Support diagnostic identifier
  network: "mainnet" | "testnet";
  overallStatus: "pending" | "completed" | "failed";
  stages: TimelineStage[];
  meta: {
    walletAddress: string;
    invoiceId?: string;
    amountFormatted?: string;
    ledgerSequence?: number;
    rawDiagnostics: Record<string, unknown>;
  };
}

export function buildExplorerTxUrl(hash: string, network: "mainnet" | "testnet" = "mainnet"): string {
  if (!hash || hash.trim() === "") return "";
  const netPath = network === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${netPath}/tx/${hash.trim()}`;
}

/**
 * Sanitizes diagnostic payloads to strictly exclude credentials, private keys, seeds, and bearer tokens.
 */
export function sanitizeDiagnostics(payload: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEYS = [
    "privatekey",
    "privkey",
    "secret",
    "seed",
    "mnemonic",
    "password",
    "authorization",
    "token",
    "jwt",
    "secretkey",
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      continue; // Exclude secrets
    }
    if (val && typeof val === "object" && !Array.isArray(val)) {
      sanitized[key] = sanitizeDiagnostics(val as Record<string, unknown>);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

export function evaluateTimelineProgress(stages: TimelineStage[]): {
  isComplete: boolean;
  hasFailed: boolean;
  isTerminal: boolean;
  currentStage: TimelineStageName;
} {
  const failedStage = stages.find((s) => s.status === "failed");
  if (failedStage) {
    return {
      isComplete: false,
      hasFailed: true,
      isTerminal: Boolean(failedStage.isTerminalFailure),
      currentStage: failedStage.name,
    };
  }

  const inProgressStage = stages.find((s) => s.status === "in_progress");
  if (inProgressStage) {
    return {
      isComplete: false,
      hasFailed: false,
      isTerminal: false,
      currentStage: inProgressStage.name,
    };
  }

  const allCompleted = stages.every((s) => s.status === "completed");
  return {
    isComplete: allCompleted,
    hasFailed: false,
    isTerminal: false,
    currentStage: allCompleted ? "settled" : "initiated",
  };
}

export const SAMPLE_COMPLETED_AUDIT: TransactionAuditRecord = {
  txId: "tx-settle-998811-alpha",
  diagnosticId: "DIAG-2026-REC-9988-ALPHA",
  network: "mainnet",
  overallStatus: "completed",
  stages: [
    {
      name: "initiated",
      label: "Intent Initiated",
      status: "completed",
      timestampServer: "2026-11-22T08:00:15.120Z",
      sourceLayer: "UI",
    },
    {
      name: "signed",
      label: "Client Wallet Signed",
      status: "completed",
      timestampServer: "2026-11-22T08:00:18.450Z",
      sourceLayer: "UI",
      hash: "7f8e9a2b4c1d3e5f6a0b8c9d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
    },
    {
      name: "submitted",
      label: "Submitted to Horizon",
      status: "completed",
      timestampServer: "2026-11-22T08:00:19.010Z",
      sourceLayer: "API",
      hash: "8a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef",
    },
    {
      name: "confirmed",
      label: "Ledger Ledger Consensus",
      status: "completed",
      timestampServer: "2026-11-22T08:00:23.200Z",
      timestampChain: "2026-11-22T08:00:23.000Z",
      sourceLayer: "Horizon",
      hash: "8a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef",
      contractEventName: "InvoiceSettled",
    },
    {
      name: "settled",
      label: "Protocol Funds Disbursed",
      status: "completed",
      timestampServer: "2026-11-22T08:00:24.050Z",
      timestampChain: "2026-11-22T08:00:24.000Z",
      sourceLayer: "Soroban RPC",
      contractEventName: "EscrowReleased",
    },
  ],
  meta: {
    walletAddress: "GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT",
    invoiceId: "INV-2026-11-4401",
    amountFormatted: "1,250,000.00 USDC",
    ledgerSequence: 52891402,
    rawDiagnostics: {
      clientVersion: "1.10.4",
      rpcHost: "soroban-mainnet.stellar.org",
      gasUsed: 142050,
      protocolFee: "0.0000100 XLM",
    },
  },
};

export const SAMPLE_PENDING_AUDIT: TransactionAuditRecord = {
  txId: "tx-settle-772104-pending",
  diagnosticId: "DIAG-2026-PENDING-7721",
  network: "mainnet",
  overallStatus: "pending",
  stages: [
    {
      name: "initiated",
      label: "Intent Initiated",
      status: "completed",
      timestampServer: "2026-11-22T08:10:00.000Z",
      sourceLayer: "UI",
    },
    {
      name: "signed",
      label: "Client Wallet Signed",
      status: "completed",
      timestampServer: "2026-11-22T08:10:04.000Z",
      sourceLayer: "UI",
      hash: "11223344556677889900aabbccddeeff0011223344556677889900aabbccddee",
    },
    {
      name: "submitted",
      label: "Awaiting Soroban Ingestion",
      status: "in_progress",
      timestampServer: "2026-11-22T08:10:05.100Z",
      sourceLayer: "API",
      hash: "aabbccddeeff001122334455667788990011223344556677889900aabbccddee",
    },
    {
      name: "confirmed",
      label: "Ledger Consensus",
      status: "pending",
      sourceLayer: "Horizon",
    },
    {
      name: "settled",
      label: "Protocol Funds Disbursed",
      status: "pending",
      sourceLayer: "Soroban RPC",
    },
  ],
  meta: {
    walletAddress: "GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT",
    invoiceId: "INV-2026-11-4402",
    amountFormatted: "500,000.00 USDC",
    rawDiagnostics: {
      clientVersion: "1.10.4",
      rpcHost: "soroban-mainnet.stellar.org",
    },
  },
};

export const SAMPLE_FAILED_AUDIT: TransactionAuditRecord = {
  txId: "tx-settle-334491-failed",
  diagnosticId: "DIAG-2026-FAIL-3344",
  network: "mainnet",
  overallStatus: "failed",
  stages: [
    {
      name: "initiated",
      label: "Intent Initiated",
      status: "completed",
      timestampServer: "2026-11-22T07:45:00.000Z",
      sourceLayer: "UI",
    },
    {
      name: "signed",
      label: "Client Wallet Signed",
      status: "completed",
      timestampServer: "2026-11-22T07:45:03.000Z",
      sourceLayer: "UI",
      hash: "4455667788990011223344556677889900aabbccddeeff001122334455667788",
    },
    {
      name: "submitted",
      label: "Submitted to Horizon",
      status: "completed",
      timestampServer: "2026-11-22T07:45:04.000Z",
      sourceLayer: "API",
      hash: "99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa",
    },
    {
      name: "confirmed",
      label: "Smart Contract Execution",
      status: "failed",
      timestampServer: "2026-11-22T07:45:08.500Z",
      timestampChain: "2026-11-22T07:45:08.000Z",
      sourceLayer: "Soroban RPC",
      contractEventName: "InvoicePaymentFailed",
      failureReason: "Contract Trapped: InsufficientEscrowAllowance (Error code 1082)",
      isTerminalFailure: true,
    },
    {
      name: "settled",
      label: "Protocol Funds Disbursed",
      status: "pending",
      sourceLayer: "Soroban RPC",
    },
  ],
  meta: {
    walletAddress: "GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT",
    invoiceId: "INV-2026-11-4403",
    amountFormatted: "750,000.00 USDC",
    rawDiagnostics: {
      clientVersion: "1.10.4",
      errorCode: 1082,
      errorSymbol: "InsufficientEscrowAllowance",
    },
  },
};
