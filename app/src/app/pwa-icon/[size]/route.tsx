import { ImageResponse } from "next/og";

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = Math.min(Math.max(parseInt(raw, 10) || 192, 48), 1024);
  const maskable = new URL(req.url).searchParams.has("maskable");
  const inner = maskable ? size * 0.62 : size * 0.8;

  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#07130C" }}>
        <svg width={inner} height={inner} viewBox="0 0 32 32">
          <rect width="32" height="32" rx="9" fill="#52D483" />
          <path d="M21.5 11.2a7 7 0 1 0 0 9.6" stroke="#07130C" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <circle cx="22" cy="16" r="2.3" fill="#07130C" />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
