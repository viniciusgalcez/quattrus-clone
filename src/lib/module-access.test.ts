import { describe, expect, it, vi } from "vitest";
import { notFound } from "next/navigation";
import { assertPageModule, hasModuleAccess } from "@/lib/module-access";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));

describe("assertPageModule", () => {
  it("exposes a boolean check for API routes", () => {
    expect(hasModuleAccess({ permissions: ["imports"] }, "imports")).toBe(true);
    expect(hasModuleAccess({ permissions: ["dashboard"] }, "imports")).toBe(false);
    expect(hasModuleAccess({}, "imports")).toBe(false);
  });

  it("allows a route when the profile contains the module", () => {
    expect(() => assertPageModule({ permissions: ["dashboard"] }, "dashboard")).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("fails closed when the profile does not contain the module", () => {
    expect(() => assertPageModule({ permissions: ["tasks"] }, "dashboard")).toThrow("not-found");
    expect(notFound).toHaveBeenCalled();
  });

  it("fails closed when permissions are absent", () => {
    expect(() => assertPageModule({}, "dashboard")).toThrow("not-found");
  });
});
