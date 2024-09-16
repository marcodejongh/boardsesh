import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

// Dynamic handler for fetching sizes related to a specific layout
export async function GET(req: Request, { params }: { params: { board_name: string; layout_id: string } }) {
  const { /*board_name,*/ layout_id } = params;

  try {
    // Fetch sizes based on layout_id
    const result = await sql`
      SELECT product_sizes.id, product_sizes.name, product_sizes.description
      FROM product_sizes
      INNER JOIN layouts ON product_sizes.product_id = layouts.product_id
      WHERE layouts.id = ${layout_id}
    `;

    // Return the sizes as JSON response
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching sizes:", error);
    return NextResponse.json({ error: "Failed to fetch sizes" }, { status: 500 });
  }
}
