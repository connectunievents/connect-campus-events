import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Connect — Campus events & tickets",
    short_name: "Connect",
    description: "University events, tickets and QR entry.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07130c",
    theme_color: "#07130c",
    categories: ["events", "education", "lifestyle"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My tickets", url: "/tickets" },
      { name: "Scan tickets", url: "/scan" },
    ],
  };
}
