import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getTeamItems } from "@/lib/db/items";
import { createTeamItem } from "@/lib/services/items";
import {
  authorizeTeamAccess,
  getUserIdFromRequest,
} from "@/lib/permissions";
import { ERROR_CODES, authErrorToCode, errorPayload } from "@/lib/errors";

// GET - List items for a team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "Invalid team ID"),
        { status: 400 }
      );
    }

    const auth = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json(
        errorPayload(authErrorToCode(auth.error), auth.error),
        { status: auth.status }
      );
    }

    const items = await getTeamItems(teamId);

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while fetching items"),
      { status: 500 }
    );
  }
}

// POST - Create a new item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "Invalid team ID"),
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = await createTeamItem({
      teamId,
      requestUserId: getUserIdFromRequest(request),
      payload: body,
    });
    if (!result.ok) {
      return NextResponse.json(
        errorPayload(result.error.errorCode, result.error.error),
        { status: result.error.status }
      );
    }

    revalidatePath(`/teams/${teamId}/items`);

    return NextResponse.json(
      {
        message: "Item created successfully",
        item: result.data.item,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating item:", error);

    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while creating the item"),
      { status: 500 }
    );
  }
}
