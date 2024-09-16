import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { rows: grades } = await sql`
      SELECT difficulty, boulder_name
      FROM difficulty_grades
      WHERE is_listed = 1
      ORDER BY difficulty ASC
    `;
    return NextResponse.json(grades);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch grades" }, { status: 500 });
  }
}
