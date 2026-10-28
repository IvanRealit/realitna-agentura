import { describe, it, expect, vi, afterEach } from "vitest";
import {
  readBodyLimited,
  readJson,
  sameOrigin,
  owns,
  canManage,
  hashToken,
  cookieOptions,
} from "../src/lib/security";
describe("security boundaries", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("forces secure cookies for HTTPS even with a mistaken local override", () => {
    vi.stubEnv("SITE_URL", "https://agency.example");
    vi.stubEnv("COOKIE_SECURE", "false");
    expect(cookieOptions().secure).toBe(true);
    expect(cookieOptions().httpOnly).toBe(true);
  });
  it("rejects streamed oversized payloads without content-length", async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(201));
        c.close();
      },
    });
    const req = new Request("http://localhost:3000/api/test", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readBodyLimited(req, 200)).rejects.toMatchObject({
      status: 413,
    });
  });
  it("rejects malformed JSON and accepts valid JSON", async () => {
    await expect(
      readJson(new Request("http://localhost", { method: "POST", body: "{" })),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      readJson(
        new Request("http://localhost", {
          method: "POST",
          body: '{"ok":true}',
        }),
      ),
    ).resolves.toEqual({ ok: true });
  });
  it("requires exact origin and rejects missing origins", () => {
    expect(
      sameOrigin(
        new Request("http://localhost", {
          headers: { Origin: "https://evil.invalid" },
        }),
      ),
    ).toBe(false);
    expect(sameOrigin(new Request("http://localhost"))).toBe(false);
  });
  it("enforces ownership for agents and management roles", () => {
    expect(owns("AGENT", "a", "b")).toBe(false);
    expect(owns("AGENT", "a", "a")).toBe(true);
    expect(owns("MANAGER", "a", "b")).toBe(true);
    expect(canManage("AGENT")).toBe(false);
  });
  it("stores fixed length irreversible session identifiers", () => {
    expect(hashToken("secret")).toHaveLength(64);
    expect(hashToken("secret")).not.toContain("secret");
  });
});
