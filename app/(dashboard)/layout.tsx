import { CommandPalette } from "@/components/common/CommandPalette";
import { SandboxBanner } from "@/components/common/SandboxBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CommandPalette />
      <SandboxBanner />
      {children}
    </>
  );
}
