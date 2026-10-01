import { NextResponse, type NextRequest } from "next/server";
import { isValidServerActionId } from "@/lib/server-action-id";

export function middleware(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.next();
  }

  const actionId = request.headers.get("next-action");
  if (actionId == null || actionId === "") {
    return NextResponse.next();
  }

  if (!isValidServerActionId(actionId)) {
    return new NextResponse(null, { status: 400 });
  }

  return NextResponse.next();
}
