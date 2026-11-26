import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { SetupBanner } from "@/components/setup-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl pb-nav">
      <SetupBanner />
      {children}
      <InstallPrompt />
      <BottomNav />
    </div>
  );
}
