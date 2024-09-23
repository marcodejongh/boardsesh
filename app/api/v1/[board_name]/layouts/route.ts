import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

// Correct typing for the parameters
export async function GET(req: Request, { params }: { params: { board_name: string } }) {
  const { board_name } = params;

  try {
    const { rows: layouts } = await sql`
      SELECT id, name
      FROM layouts
      WHERE is_listed = true
      AND password IS NULL
    `;

    return NextResponse.json(layouts);
  } catch (error) {
    console.error("Error fetching layouts:", error); // Log the error for debugging
    return NextResponse.json({ error: "Failed to fetch layouts" }, { status: 500 });
  }
}
