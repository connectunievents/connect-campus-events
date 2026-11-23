import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", style: ["normal", "italic"], weight: ["600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Connect — Campus events & tickets", template: "%s · Connect" },
  description: "Discover what's happening at your university right now, get tickets in seconds, and walk in with a QR code.",
  applicationName: "Connect",
  appleWebApp: { capable: true, title: "Connect", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#07130c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Every page reads the auth cookie, so render on each request.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${playfair.variable}`}>
      <body>
        {children}
        <Toaster theme="dark" position="top-center" richColors closeButton />
        <ServiceWorker />
      </body>
    </html>
  );
}
