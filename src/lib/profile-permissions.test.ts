import { describe, expect, it } from "vitest";
import { normalizeProfilePermissions } from "@/lib/profile-permissions";

describe("normalizeProfilePermissions", () => {
  it("keeps only explicit known module keys", () => {
    expect(normalizeProfilePermissions(["dashboard", "users", "role=ADMIN", 1, null])).toEqual(["dashboard", "users"]);
  });

  it("fails closed for malformed JSON values", () => {
    expect(normalizeProfilePermissions({ dashboard: true })).toEqual([]);
  });
});
