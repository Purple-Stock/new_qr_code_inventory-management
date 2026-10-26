import { NextRequest } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import {
  getUserIdFromSessionCookieEdge,
  getUserIdFromSessionTokenEdge,
} from "@/lib/session-edge";

describe("session-edge", () => {
  it("accepts a token created by the Node session signer", async () => {
    const token = createSessionToken(21);
    expect(await getUserIdFromSessionTokenEdge(token)).toBe(21);
  });

  it("rejects a forged cookie payload", async () => {
    const forged =
      "eyJ1c2VySWQiOjIxLCJleHAiOjk5OTk5OTk5OTl9.forged-signature";
    expect(await getUserIdFromSessionTokenEdge(forged)).toBeNull();
  });

  it("reads the session cookie from a NextRequest", async () => {
    const token = createSessionToken(21);
    const request = new NextRequest("https://staging.purplestock.com.br/teams/1", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });
    expect(await getUserIdFromSessionCookieEdge(request)).toBe(21);
  });
});
