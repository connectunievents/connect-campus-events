"use client";
import { useEffect } from "react";

/**
 * iOS Safari ignores `user-scalable=no`, so block its pinch gestures directly.
 * (Double-tap zoom is disabled in CSS with `touch-action`.)
 */
export function ZoomLock() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const pinch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    document.addEventListener("gestureend", stop, { passive: false });
    document.addEventListener("touchmove", pinch, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("gestureend", stop);
      document.removeEventListener("touchmove", pinch);
    };
  }, []);
  return null;
}
