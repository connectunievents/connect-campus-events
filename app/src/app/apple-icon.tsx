import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "#07130C" }}>
        <svg width="130" height="130" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="9" fill="#52D483" />
          <path d="M21.5 11.2a7 7 0 1 0 0 9.6" stroke="#07130C" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <circle cx="22" cy="16" r="2.3" fill="#07130C" />
        </svg>
      </div>
    ),
    size,
  );
}
