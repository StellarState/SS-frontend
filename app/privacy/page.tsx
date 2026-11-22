import { InformationalPage } from "@/components/common/InformationalPage";

export default function PrivacyPage() {
  return (
    <InformationalPage
      title="Privacy Policy"
      description="How StellarSettle handles the information you provide."
      sections={[
        {
          heading: "Information we store",
          body: "We store only the account, KYC and notification details needed to operate the marketplace. Wallet addresses are public on Stellar and are not treated as private data.",
        },
        {
          heading: "Your controls",
          body: "Notification preferences and email verification can be managed from account settings. Contact support to request removal of optional profile data.",
        },
      ]}
    />
  );
}
