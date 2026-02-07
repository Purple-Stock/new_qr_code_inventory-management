import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";
import { successResponse } from "@/lib/api-route";

export async function POST() {
  const response = successResponse({ message: "Logout successful" }, 200);
  clearSessionCookie(response);
  return response;
}
