/**
 * Public trust and security data (issue #655).
 *
 * The trust page must render without a wallet or JWT, so it reads a public
 * config endpoint rather than the admin contract registry. Pure helpers live
 * here so the page can be tested without network access.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type TrustNetwork = "testnet" | "mainnet";

export interface TrustContract {
  name: string;
  network: TrustNetwork;
  address: string;
  version: string;
}

export interface TrustAudit {
  auditor: string;
  date: string;
  scope: string;
  reportUrl: string;
}

export interface TrustConfig {
  contracts: TrustContract[];
  audits: TrustAudit[];
  custody: string;
  kycAml: string;
  insurance: string;
  incidents: string;
}

export const DEFAULT_TRUST_CONFIG: TrustConfig = {
  contracts: [],
  audits: [],
  custody:
    "Investor funds are held in non-custodial smart contracts. StellarSettle never takes possession of investor principal.",
  kycAml:
    "Issuers complete KYC and sanctions screening before listing. Investor eligibility is checked before the first investment.",
  insurance:
    "Smart contract coverage details are published in the audit reports below.",
  incidents: "No unresolved security incidents are currently on record.",
};

function asNetwork(value: unknown): TrustNetwork {
  return value === "mainnet" ? "mainnet" : "testnet";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** Normalise a trust config response, dropping malformed entries. */
export function normalizeTrustConfig(raw: unknown): TrustConfig {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const contracts = Array.isArray(source.contracts)
    ? source.contracts.flatMap((item): TrustContract[] => {
        if (!item || typeof item !== "object") return [];
        const entry = item as Record<string, unknown>;
        const address = asString(entry.address);
        const name = asString(entry.name);
        if (!address || !name) return [];
        return [
          {
            name,
            address,
            network: asNetwork(entry.network),
            version: asString(entry.version, "1.0.0"),
          },
        ];
      })
    : [];
  const audits = Array.isArray(source.audits)
    ? source.audits.flatMap((item): TrustAudit[] => {
        if (!item || typeof item !== "object") return [];
        const entry = item as Record<string, unknown>;
        const auditor = asString(entry.auditor);
        const reportUrl = asString(entry.reportUrl ?? entry.report_url);
        if (!auditor || !reportUrl) return [];
        return [
          {
            auditor,
            reportUrl,
            date: asString(entry.date),
            scope: asString(entry.scope),
          },
        ];
      })
    : [];

  return {
    contracts,
    audits,
    custody: asString(source.custody, DEFAULT_TRUST_CONFIG.custody),
    kycAml: asString(source.kycAml ?? source.kyc_aml, DEFAULT_TRUST_CONFIG.kycAml),
    insurance: asString(source.insurance, DEFAULT_TRUST_CONFIG.insurance),
    incidents: asString(source.incidents, DEFAULT_TRUST_CONFIG.incidents),
  };
}

export async function fetchTrustConfig(signal?: AbortSignal): Promise<TrustConfig> {
  const res = await fetch(`${API_BASE}/config/trust`, { signal });
  if (!res.ok) throw new Error("Failed to load trust configuration");
  return normalizeTrustConfig(await res.json());
}

/** Stellar Expert contract page for a deployed contract address. */
export function contractExplorerUrl(address: string, network: TrustNetwork): string {
  const segment = network === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${segment}/contract/${address}`;
}
