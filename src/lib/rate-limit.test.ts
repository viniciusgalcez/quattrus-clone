import { describe, it, expect, vi, afterEach } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit within the window", () => {
    const key = `key-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("test", key, { limit: 3, windowMs: 60_000 })).toBe(true);
    }
  });

  it("blocks once the limit is exceeded within the window", () => {
    const key = `key-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit("test", key, { limit: 3, windowMs: 60_000 });
    }
    expect(checkRateLimit("test", key, { limit: 3, windowMs: 60_000 })).toBe(false);
  });

  it("does not let one key's hits count against a different key", () => {
    const keyA = `key-a-${Math.random()}`;
    const keyB = `key-b-${Math.random()}`;
    for (let i = 0; i < 3; i++) checkRateLimit("test", keyA, { limit: 3, windowMs: 60_000 });
    expect(checkRateLimit("test", keyB, { limit: 3, windowMs: 60_000 })).toBe(true);
  });

  it("does not let one scope's hits count against a different scope for the same key", () => {
    const key = `key-${Math.random()}`;
    for (let i = 0; i < 3; i++) checkRateLimit("login", key, { limit: 3, windowMs: 60_000 });
    expect(checkRateLimit("import", key, { limit: 3, windowMs: 60_000 })).toBe(true);
  });

  it("resets once the window elapses", () => {
    vi.useFakeTimers();
    const key = `key-${Math.random()}`;
    for (let i = 0; i < 3; i++) checkRateLimit("test", key, { limit: 3, windowMs: 60_000 });
    expect(checkRateLimit("test", key, { limit: 3, windowMs: 60_000 })).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit("test", key, { limit: 3, windowMs: 60_000 })).toBe(true);
  });
});
