/**
 * Rotating ticket codes (the "screenshot-proof ticket" pattern).
 * QR content is `CNCT1.<CODE>.<OTP>` where OTP = HMAC-SHA256(secret, timeWindow) → 6 digits.
 * A screenshot stops working after ~30 s. Works in the browser and in Node (Web Crypto).
 */
export const WINDOW_SECONDS = 15;
export const QR_PREFIX = "CNCT1";

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function currentWindow(nowMs = Date.now()) {
  return Math.floor(nowMs / 1000 / WINDOW_SECONDS);
}

export async function otpFor(secretHex: string, window: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", hexToBytes(secretHex), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const msg = new ArrayBuffer(8);
  new DataView(msg).setBigUint64(0, BigInt(window));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const offset = sig[sig.length - 1] & 0x0f;
  const bin = ((sig[offset] & 0x7f) << 24) | (sig[offset + 1] << 16) | (sig[offset + 2] << 8) | sig[offset + 3];
  return String(bin % 1_000_000).padStart(6, "0");
}

export async function buildPayload(code: string, secretHex: string, nowMs = Date.now()) {
  return `${QR_PREFIX}.${code}.${await otpFor(secretHex, currentWindow(nowMs))}`;
}

export function parsePayload(raw: string): { code: string; otp: string | null } | null {
  const text = raw.trim();
  const m = /^CNCT1\.([A-F0-9]{8,32})\.(\d{6})$/i.exec(text);
  if (m) return { code: m[1].toUpperCase(), otp: m[2] };
  // Manual entry of the printed ticket code.
  const cleaned = text.replace(/[\s-]/g, "");
  if (/^[A-F0-9]{8,32}$/i.test(cleaned)) return { code: cleaned.toUpperCase(), otp: null };
  return null;
}

/** Accepts the current window ± `drift` windows (default ±2 → ~30 s each way). */
export async function verifyOtp(secretHex: string, otp: string, drift = 2, nowMs = Date.now()) {
  const w = currentWindow(nowMs);
  for (let d = -drift; d <= drift; d++) {
    if ((await otpFor(secretHex, w + d)) === otp) return true;
  }
  return false;
}
