import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET() {
  try {
    const client = await pool.connect();

    // Fetch all problems
    const problemsResult = await client.query('SELECT * FROM problems ORDER BY id ASC');
    const problems = problemsResult.rows;

    client.release();

    return NextResponse.json(problems);
  } catch (error: any) {
    console.error("Database fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
