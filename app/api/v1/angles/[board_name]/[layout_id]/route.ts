import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { board_name, layout_id } = params;

  try {
    const { rows: angles } = await sql`
      SELECT angle
      FROM products_angles
      JOIN layouts ON layouts.product_id = products_angles.product_id
      WHERE layouts.id = ${layout_id}
      ORDER BY angle ASC
    `;
    return NextResponse.json(angles);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch angles" }, { status: 500 });
  }
}
