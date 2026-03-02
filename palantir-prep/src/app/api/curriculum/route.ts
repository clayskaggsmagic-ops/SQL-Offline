import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET() {
  try {
    const client = await pool.connect();

    // Fetch all lessons
    const lessonsResult = await client.query('SELECT * FROM lessons ORDER BY id ASC');
    const lessons = lessonsResult.rows;

    // Fetch all problems
    const problemsResult = await client.query('SELECT * FROM problems ORDER BY id ASC');
    const problems = problemsResult.rows;

    // Fetch all test cases
    const testCasesResult = await client.query('SELECT * FROM test_cases ORDER BY id ASC');
    const testCases = testCasesResult.rows;

    client.release();

    // Organize data into a structured curriculum
    const curriculum = lessons.map(lesson => ({
      ...lesson,
      problems: problems
        .filter(p => p.lesson_id === lesson.id)
        .map(p => ({
          ...p,
          testCases: testCases.filter(t => t.problem_id === p.id)
        }))
    }));

    return NextResponse.json({ success: true, curriculum });
  } catch (error: any) {
    console.error("Database fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
