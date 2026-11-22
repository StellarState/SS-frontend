"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { contractExplorerUrl, type TrustContract } from "@/lib/trust";

interface ContractTableProps {
  contracts: TrustContract[];
  /** Injected for tests. Defaults to the browser clipboard. */
  copy?: (value: string) => Promise<void>;
}

function defaultCopy(value: string): Promise<void> {
  return navigator.clipboard.writeText(value);
}

/** Deployed contract addresses with copy and explorer links (issue #655). */
export function ContractTable({
  contracts,
  copy = defaultCopy,
}: ContractTableProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);

  const handleCopy = async (address: string) => {
    try {
      await copy(address);
      setCopied(address);
      setCopyError(false);
    } catch {
      setCopied(null);
      setCopyError(true);
    }
  };

  if (contracts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="contract-table-empty">
        Contract addresses are being published. Check back shortly.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="contract-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Network</TableHead>
            <TableHead>Contract</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Version</TableHead>
            <TableHead className="text-right">Explorer</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow key={`${contract.network}-${contract.name}`} data-testid="contract-row">
              <TableCell>
                <Badge variant={contract.network === "mainnet" ? "default" : "secondary"}>
                  {contract.network}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{contract.name}</TableCell>
              <TableCell>
                <code className="text-xs" data-testid="contract-address">
                  {contract.address}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-2"
                  aria-label={`Copy ${contract.name} contract address`}
                  data-testid="copy-contract-address"
                  onClick={() => void handleCopy(contract.address)}
                >
                  {copied === contract.address ? "Copied" : "Copy"}
                </Button>
              </TableCell>
              <TableCell>{contract.version}</TableCell>
              <TableCell className="text-right">
                <a
                  href={contractExplorerUrl(contract.address, contract.network)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline underline-offset-2"
                  data-testid="contract-explorer-link"
                >
                  View on explorer
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {copyError && (
        <p role="alert" className="mt-2 text-sm text-destructive" data-testid="copy-error">
          Could not copy the address. Select and copy it manually.
        </p>
      )}
    </div>
  );
}
