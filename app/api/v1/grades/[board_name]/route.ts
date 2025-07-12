import { sql } from '@/app/lib/db/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const grades = await sql`
      SELECT difficulty as difficulty_id, boulder_name as difficulty_name
      FROM kilter_difficulty_grades
      WHERE is_listed = true
      ORDER BY difficulty ASC
    `;
    return NextResponse.json(grades);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 500 });
  }
}
