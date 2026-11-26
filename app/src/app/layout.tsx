import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorker } from "@/components/service-worker";
import { ZoomLock } from "@/components/zoom-lock";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", style: ["normal", "italic"], weight: ["600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Connect — Campus events & tickets", template: "%s · Connect" },
  description: "Discover what's happening at your university right now, get tickets in seconds, and walk in with a QR code.",
  applicationName: "Connect",
  // "black" = solid status bar: the page starts below the clock/battery instead of sliding under a blurred bar.
  appleWebApp: { capable: true, title: "Connect", statusBarStyle: "black" },
  formatDetection: { telephone: false },
  // Next only emits the newer generic tag; iOS needs Apple's own tag to open the home-screen icon full screen.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#07130c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // app-like: no pinch zoom (iOS Safari also needs <ZoomLock />)
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content", // keyboard shrinks the layout instead of covering inputs
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
        <ZoomLock />
      </body>
    </html>
  );
}
