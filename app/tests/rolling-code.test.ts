import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPayload, parsePayload, verifyOtp, otpFor, currentWindow, WINDOW_SECONDS } from "../src/lib/rolling-code.ts";

const secret = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";

test("payload round-trips and verifies now", async () => {
  const p = await buildPayload("8F3A91C27D04", secret);
  const parsed = parsePayload(p);
  assert.equal(parsed?.code, "8F3A91C27D04");
  assert.ok(await verifyOtp(secret, parsed!.otp!));
});

test("old screenshot (2 minutes) is rejected", async () => {
  const old = await otpFor(secret, currentWindow(Date.now() - 120_000));
  assert.equal(await verifyOtp(secret, old), false);
});

test("small clock drift is accepted", async () => {
  const drift = await otpFor(secret, currentWindow(Date.now() - WINDOW_SECONDS * 1000));
  assert.ok(await verifyOtp(secret, drift));
});

test("wrong secret fails, manual codes parse, junk rejected", async () => {
  const p = parsePayload(await buildPayload("ABCDEF123456", secret))!;
  assert.equal(await verifyOtp("00".repeat(20), p.otp!), false);
  assert.deepEqual(parsePayload("abcd ef12 3456"), { code: "ABCDEF123456", otp: null });
  assert.equal(parsePayload("https://evil.example"), null);
});
