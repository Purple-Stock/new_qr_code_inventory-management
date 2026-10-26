import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { ERROR_CODES } from "@/lib/errors";

function postWithAction(actionId: string | null) {
  const headers = new Headers();
  if (actionId != null) {
    headers.set("Next-Action", actionId);
  }
  return middleware(
    new NextRequest("https://staging.purplestock.com.br/", {
      method: "POST",
      headers,
    })
  );
}

describe("middleware invalid server action ids", () => {
  it("returns 400 for Next-Action x without reaching the action handler", async () => {
    const response = await postWithAction("x");
    expect(response.status).toBe(400);
  });

  it("lets a well-formed server action id through", async () => {
    const response = await postWithAction("a".repeat(42));
    expect(response.status).toBe(200);
  });

  it("does not treat a normal POST as a server action", async () => {
    const response = await postWithAction(null);
    expect(response.status).toBe(200);
  });
});

describe("middleware session gate", () => {
  it("redirects unauthenticated HTML team pages to login", async () => {
    const response = await middleware(
      new NextRequest(
        "https://staging.purplestock.com.br/teams/1/items/1/edit"
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://staging.purplestock.com.br/"
    );
  });

  it("returns 401 JSON for unauthenticated team API reads", async () => {
    const response = await middleware(
      new NextRequest("https://staging.purplestock.com.br/api/teams/1/items/1")
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "User not authenticated",
      errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
    });
  });

  it("lets the login page through without a session", async () => {
    const response = await middleware(
      new NextRequest("https://staging.purplestock.com.br/")
    );

    expect(response.status).toBe(200);
  });

  it("lets authenticated team HTML through", async () => {
    const response = await middleware(
      new NextRequest("https://staging.purplestock.com.br/teams/1/items", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${createSessionToken(21)}`,
        },
      })
    );

    expect(response.status).toBe(200);
  });

  it("rejects a forged session cookie on team HTML", async () => {
    const response = await middleware(
      new NextRequest("https://staging.purplestock.com.br/teams/1/items", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=eyJ1c2VySWQiOjIxLCJleHAiOjk5OTk5OTk5OTl9.forged`,
        },
      })
    );

    expect(response.status).toBe(307);
  });

  it("lets auth and stripe webhook APIs through without a session", async () => {
    const login = await middleware(
      new NextRequest("https://staging.purplestock.com.br/api/auth/login", {
        method: "POST",
      })
    );
    const webhook = await middleware(
      new NextRequest("https://staging.purplestock.com.br/api/stripe/webhook", {
        method: "POST",
      })
    );

    expect(login.status).toBe(200);
    expect(webhook.status).toBe(200);
  });
});
