import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  const { board_name, layout_id, size_id, set_ids } = params;

  // Split comma-separated set_ids
  const setIdsArray = set_ids.split(",");
  console.log(setIdsArray);
  try {
    // Collect data for each set_id
    const imagesToHolds = {};

    for (const set_id of setIdsArray) {
      // Get image filename
      const { rows } = await sql`
        SELECT image_filename
        FROM product_sizes_layouts_sets
        WHERE layout_id = ${layout_id}
        AND product_size_id = ${size_id}
        AND set_id = ${set_id}
      `;
      console.log(`
        SELECT image_filename
        FROM product_sizes_layouts_sets
        WHERE layout_id = ${layout_id}
        AND product_size_id = ${size_id}
        AND set_id = ${set_id}
      `);
      console.log(rows)
      if (rows.length === 0) continue;
      
      const imageFilename = rows[0].image_filename;

      // Extract image filename
      const image_url = imageFilename[0].image_filename.split("/")[1];

      // Get holds data
      const { rows: holds } = await sql`
        SELECT placements.id, mirrored_placements.id, holes.x, holes.y
        FROM holes
        INNER JOIN placements ON placements.hole_id = holes.id
        AND placements.set_id = ${set_id}
        AND placements.layout_id = ${layout_id}
        LEFT JOIN placements mirrored_placements ON mirrored_placements.hole_id = holes.mirrored_hole_id
        AND mirrored_placements.set_id = ${set_id}
        AND mirrored_placements.layout_id = ${layout_id}
      `;
      console.log(`
        SELECT placements.id, mirrored_placements.id, holes.x, holes.y
        FROM holes
        INNER JOIN placements ON placements.hole_id = holes.id
        AND placements.set_id = ${set_id}
        AND placements.layout_id = ${layout_id}
        LEFT JOIN placements mirrored_placements ON mirrored_placements.hole_id = holes.mirrored_hole_id
        AND mirrored_placements.set_id = ${set_id}
        AND mirrored_placements.layout_id = ${layout_id}
      `);

      if (holds.length > 0) {
        imagesToHolds[image_url] = holds;
      }
    }

    // Get size dimensions
    const { rows: sizeDimensions } = await sql`
      SELECT edge_left, edge_right, edge_bottom, edge_top
      FROM product_sizes
      WHERE id = ${size_id}
    `;

    if (sizeDimensions.length === 0) {
      return NextResponse.json({ error: "Size dimensions not found" }, { status: 404 });
    }

    // Return the combined result
    return NextResponse.json({
      images_to_holds: imagesToHolds,
      edge_left: sizeDimensions[0].edge_left,
      edge_right: sizeDimensions[0].edge_right,
      edge_bottom: sizeDimensions[0].edge_bottom,
      edge_top: sizeDimensions[0].edge_top,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch board details" }, { status: 500 });
  }
}
