import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetRateLimitStore,
  checkRateLimit,
  IMPORT_RATE_LIMIT,
} from "./rateLimit";

beforeEach(() => {
  _resetRateLimitStore();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("erlaubt Anfragen bis zum Limit", () => {
    const opts = { limit: 3, windowMs: 60_000 };
    expect(checkRateLimit("ip1", opts)).toEqual({ ok: true });
    expect(checkRateLimit("ip1", opts)).toEqual({ ok: true });
    expect(checkRateLimit("ip1", opts)).toEqual({ ok: true });
  });

  it("blockiert die Anfrage, die das Limit überschreitet", () => {
    const opts = { limit: 3, windowMs: 60_000 };
    checkRateLimit("ip2", opts);
    checkRateLimit("ip2", opts);
    checkRateLimit("ip2", opts);
    const result = checkRateLimit("ip2", opts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("gibt retryAfterSec von mindestens 1 zurück", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    checkRateLimit("ip3", opts);
    const result = checkRateLimit("ip3", opts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterSec).toBeGreaterThanOrEqual(1);
    }
  });

  it("erlaubt erneute Anfragen nach Ablauf des Fensters", () => {
    const opts = { limit: 2, windowMs: 10_000 };
    checkRateLimit("ip4", opts);
    checkRateLimit("ip4", opts);
    // Fenster abgelaufen lassen.
    vi.advanceTimersByTime(11_000);
    const result = checkRateLimit("ip4", opts);
    expect(result.ok).toBe(true);
  });

  it("isoliert verschiedene Keys voneinander", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    checkRateLimit("a", opts);
    // "a" ist ausgelastet, "b" ist frei.
    expect(checkRateLimit("a", opts).ok).toBe(false);
    expect(checkRateLimit("b", opts).ok).toBe(true);
  });

  it("berechnet retryAfterSec korrekt (Sliding Window)", () => {
    const opts = { limit: 1, windowMs: 30_000 };
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    checkRateLimit("ip5", opts);
    // 10 Sekunden später ist der Slot noch besetzt (20 s verbleiben).
    vi.advanceTimersByTime(10_000);
    const result = checkRateLimit("ip5", opts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Verbleibend: ~20 Sekunden.
      expect(result.retryAfterSec).toBeGreaterThanOrEqual(19);
      expect(result.retryAfterSec).toBeLessThanOrEqual(21);
    }
  });

  it("verwendet IMPORT_RATE_LIMIT als Standard", () => {
    expect(IMPORT_RATE_LIMIT.limit).toBe(30);
    expect(IMPORT_RATE_LIMIT.windowMs).toBe(60_000);
    // Erste Anfrage mit Standardoptionen muss durchkommen.
    expect(checkRateLimit("default-test")).toEqual({ ok: true });
  });

  it("setzt Timestamps nach Store-Reset zurück", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    checkRateLimit("reset-ip", opts);
    expect(checkRateLimit("reset-ip", opts).ok).toBe(false);
    _resetRateLimitStore();
    expect(checkRateLimit("reset-ip", opts).ok).toBe(true);
  });
});
