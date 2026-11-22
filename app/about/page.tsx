import { InformationalPage } from "@/components/common/InformationalPage";

export default function AboutPage() {
  return (
    <InformationalPage
      title="About StellarSettle"
      description="Open invoice financing on Stellar, with transparent fees and verifiable contracts."
      sections={[
        {
          heading: "What we do",
          body: "StellarSettle connects businesses with investors by tokenising invoices as fractions on Stellar. Settlement is enforced by smart contracts rather than by a custodian.",
        },
        {
          heading: "Why transparency matters",
          body: "Every fee, contract deployment and audit report is published so investors can verify the platform before they fund an invoice.",
        },
      ]}
    />
  );
}
