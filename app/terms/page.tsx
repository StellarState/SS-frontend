import { InformationalPage } from "@/components/common/InformationalPage";

export default function TermsPage() {
  return (
    <InformationalPage
      title="Terms of Service"
      description="The terms that govern use of the StellarSettle marketplace."
      sections={[
        {
          heading: "Use of the platform",
          body: "You must be eligible under the rules published for your jurisdiction before investing or listing an invoice. Do not use the platform with funds you cannot afford to lose.",
        },
        {
          heading: "Smart contract risk",
          body: "Invoices and settlements run on Stellar smart contracts. Review the audit reports and deployed contract addresses on the Trust and Security page before participating.",
        },
      ]}
    />
  );
}
