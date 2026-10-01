import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

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
  it("returns 400 for Next-Action x without reaching the action handler", () => {
    const response = postWithAction("x");
    expect(response.status).toBe(400);
  });

  it("lets a well-formed server action id through", () => {
    const response = postWithAction("a".repeat(42));
    expect(response.status).toBe(200);
  });

  it("does not treat a normal POST as a server action", () => {
    const response = postWithAction(null);
    expect(response.status).toBe(200);
  });
});
