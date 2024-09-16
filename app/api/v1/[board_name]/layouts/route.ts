import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { board_name } = params;

  try {
    const { rows: layouts } = await sql`
      SELECT id, name
      FROM layouts
      WHERE is_listed = 1
      AND password IS NULL
    `;

    return NextResponse.json(layouts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch layouts" }, { status: 500 });
  }
}
