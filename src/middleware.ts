import { NextResponse, type NextRequest } from "next/server";
import { ERROR_CODES } from "@/lib/errors";
import { isValidServerActionId } from "@/lib/server-action-id";
import { getUserIdFromSessionCookieEdge } from "@/lib/session-edge";

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/teams") ||
    pathname.startsWith("/team_selection") ||
    pathname.startsWith("/api/teams") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/users")
  );
}

export async function middleware(request: NextRequest) {
  if (request.method === "POST") {
    const actionId = request.headers.get("next-action");
    if (actionId != null && actionId !== "") {
      if (!isValidServerActionId(actionId)) {
        return new NextResponse(null, { status: 400 });
      }
    }
  }

  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (await getUserIdFromSessionCookieEdge(request)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: "User not authenticated",
        errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
      },
      { status: 401 }
    );
  }

  return NextResponse.redirect(new URL("/", request.url));
}
