import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { createUserBoardMapping, getUserBoardMappings } from "@/app/lib/auth/user-board-mappings";
import { BoardName } from "@/app/lib/types";
import { authOptions } from "@/app/lib/auth/auth-options";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { boardType, boardUserId, boardUsername } = body;

    if (!boardType || !boardUserId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await createUserBoardMapping(
      session.user.id,
      boardType as BoardName,
      parseInt(boardUserId),
      boardUsername
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to create board mapping:", error);
    return NextResponse.json(
      { error: "Failed to create board mapping" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mappings = await getUserBoardMappings(session.user.id);
    return NextResponse.json({ mappings });
  } catch (error) {
    console.error("Failed to get board mappings:", error);
    return NextResponse.json(
      { error: "Failed to get board mappings" },
      { status: 500 }
    );
  }
}