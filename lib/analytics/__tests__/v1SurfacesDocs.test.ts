import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");
const contract = readFileSync(resolve(root, "docs/FRONTEND_V1_SURFACES.md"), "utf8");
const readme = readFileSync(resolve(root, "README.md"), "utf8");

describe("frontend V1 surface contract", () => {
  it("documents each issue section", () => {
    for (const section of [
      "#597 Portfolio concentration",
      "#596 Vault reconciliation",
      "#595 Issuer netting",
      "#594 Descending-rate auction",
      "#694 Issuer liquidity reserve target planner",
      "#695 Invoice dispute evidence timeline",
    ]) {
      expect(contract, section).toContain(section);
    }
  });

  it("documents the required API routes", () => {
    for (const route of [
      "/admin/vaults/reconciliation",
      "/issuer/netting/invoices",
      "/issuer/netting/agreements",
      "/rate-auction",
      "/issuer/reserves",
      "/invoices/:id/dispute",
    ]) {
      expect(contract, route).toContain(route);
    }
  });

  it("records the documented failure behavior", () => {
    expect(contract).toContain("There is no mock fallback");
    expect(contract).toContain("unavailable");
  });

  it("uses ASCII punctuation only in published prose", () => {
    expect(contract).not.toMatch(/[–—]/);
  });

  it("links the contract from the README with an existing target", () => {
    expect(readme).toContain("[docs/FRONTEND_V1_SURFACES.md](./docs/FRONTEND_V1_SURFACES.md)");
  });
});
