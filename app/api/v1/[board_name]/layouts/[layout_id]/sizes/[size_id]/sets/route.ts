import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { board_name: string; layout_id: string; size_id: string } },
) {
  const { /*board_name,*/ layout_id, size_id } = params;

  try {
    const { rows: sets } = await sql`
      SELECT sets.id, sets.name
      FROM sets
      INNER JOIN product_sizes_layouts_sets psls 
      ON sets.id = psls.set_id
      WHERE psls.product_size_id = ${size_id}
      AND psls.layout_id = ${layout_id}
    `;

    return NextResponse.json(sets);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch sets" }, { status: 500 });
  }
}
