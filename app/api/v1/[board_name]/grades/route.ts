import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { rows: grades } = await sql`
      SELECT difficulty as difficulty_id, boulder_name as difficulty_name
      FROM difficulty_grades
      WHERE is_listed = true
      ORDER BY difficulty ASC
    `;
    return NextResponse.json(grades);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch grades" }, { status: 500 });
  }
}
