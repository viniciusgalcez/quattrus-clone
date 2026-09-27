import { beforeEach, describe, expect, it, vi } from "vitest";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import proxy from "./proxy";

vi.mock("next-auth/jwt", () => ({ getToken: vi.fn() }));

const getTokenMock = vi.mocked(getToken);

describe("authentication proxy", () => {
  beforeEach(() => {
    getTokenMock.mockReset();
  });

  it("redirects unauthenticated protected requests to login", async () => {
    getTokenMock.mockResolvedValue(null);

    const response = await proxy(new NextRequest("https://example.com/metas"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/login");
  });

  it("redirects inicio using the start page stored in the signed token", async () => {
    getTokenMock.mockResolvedValue({ id: "user-1", username: "ana", role: "ADMIN", startPage: "/farol" });

    const response = await proxy(new NextRequest("https://example.com/inicio"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/farol");
  });

  it("keeps login reachable for an existing token", async () => {
    getTokenMock.mockResolvedValue({ id: "user-1", username: "ana", role: "ADMIN", startPage: "/" });

    const response = await proxy(new NextRequest("https://example.com/login"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
