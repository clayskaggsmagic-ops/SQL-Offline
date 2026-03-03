import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/**
 * Unescape literal \n, \t, \r stored as two-character sequences in the DB.
 */
function unescapeField(value: string | null): string | null {
  if (!value) return value;
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r');
}

export async function GET() {
  try {
    const client = await pool.connect();

    // Fetch all problems
    const problemsResult = await client.query(`SELECT id, category AS type, title, difficulty, description, initial_code, solution_code, context_sql, lesson_syntax, module_id, module_name, lesson_order, hint_1, hint_2, hint_3 FROM problems ORDER BY CASE WHEN module_id ~ '^[0-9]+$' THEN CAST(module_id AS INTEGER) ELSE 9999 END ASC, module_id ASC, CAST(lesson_order AS INTEGER) ASC`);

    // Fetch all test cases
    const testCasesResult = await client.query('SELECT id, problem_id, input_data, expected_output, is_hidden FROM test_cases ORDER BY problem_id, id');

    client.release();

    // Group test cases by problem_id
    const testCasesByProblem: Record<number, any[]> = {};
    for (const tc of testCasesResult.rows) {
      if (!testCasesByProblem[tc.problem_id]) {
        testCasesByProblem[tc.problem_id] = [];
      }
      testCasesByProblem[tc.problem_id].push({
        id: tc.id,
        input_data: tc.input_data,
        expected_output: tc.expected_output,
        is_hidden: tc.is_hidden,
      });
    }

    // Unescape code fields and attach test cases
    const problems = problemsResult.rows.map((row: any) => ({
      ...row,
      initial_code: unescapeField(row.initial_code),
      solution_code: unescapeField(row.solution_code),
      context_sql: unescapeField(row.context_sql),
      description: unescapeField(row.description),
      test_cases: testCasesByProblem[row.id] || [],
    }));

    return NextResponse.json(problems);
  } catch (error: any) {
    console.error("Database fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
