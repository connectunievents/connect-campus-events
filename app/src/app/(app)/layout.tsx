import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { SetupBanner } from "@/components/setup-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-nav md:max-w-2xl">
      <SetupBanner />
      {children}
      <InstallPrompt />
      <BottomNav />
    </div>
  );
}
