import initSqlJs, { Database, QueryExecResult } from 'sql.js';

let SQL: any = null;

export async function initSQL() {
  if (SQL) return SQL;
  try {
    SQL = await initSqlJs({
      locateFile: file => `/${file}`
    });
    return SQL;
  } catch (error) {
    console.error("Failed to load SQL.js WASM module", error);
    throw error;
  }
}

export interface SQLResult {
  columns: string[];
  values: any[][];
}

export interface SQLTestCaseResult {
  id: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  hidden: boolean;
}

/**
 * Extract columns from a sql.js result row.
 * The minified WASM build uses 'lc' instead of 'columns'.
 */
function getColumns(row: any): string[] {
  return row.columns || row.lc || [];
}

/**
 * Run a SQL query and return results.
 */
export async function runSQL(query: string, contextSql?: string): Promise<SQLResult> {
  const sqljs = await initSQL();
  const db = new sqljs.Database();

  try {
    if (contextSql) {
      db.run(contextSql);
    }
    const res: QueryExecResult[] = db.exec(query);
    if (res.length > 0) {
      return { columns: getColumns(res[0]), values: res[0].values };
    }
    return { columns: [], values: [] };
  } catch (err: any) {
    throw new Error(err.message || 'SQL Execution Error');
  } finally {
    db.close();
  }
}

export interface DatasetTable {
  name: string;
  columns: string[];
  rows: any[][];
}

/**
 * Parse context_sql, create the tables, then return all table data
 * for display in the Dataset Tables sidebar panel.
 */
export async function parseContextTables(contextSql: string): Promise<DatasetTable[]> {
  const sqljs = await initSQL();
  const db = new sqljs.Database();
  const tables: DatasetTable[] = [];

  try {
    db.run(contextSql);

    // Discover all user-created tables
    const tableNames: QueryExecResult[] = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );

    if (tableNames.length > 0 && tableNames[0].values) {
      for (const row of tableNames[0].values) {
        const tableName = row[0] as string;
        try {
          const data: QueryExecResult[] = db.exec(`SELECT * FROM "${tableName}"`);
          if (data.length > 0) {
            tables.push({
              name: tableName,
              columns: getColumns(data[0]),
              rows: data[0].values || [],
            });
          } else {
            // Table exists but is empty — still show columns
            const pragma: QueryExecResult[] = db.exec(`PRAGMA table_info("${tableName}")`);
            const cols = pragma.length > 0 ? pragma[0].values.map(r => r[1] as string) : [];
            tables.push({ name: tableName, columns: cols, rows: [] });
          }
        } catch {
          // Skip tables that can't be queried
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse context tables:', err);
  } finally {
    db.close();
  }

  return tables;
}


/**
 * Normalize a SQL result into a comparable string (sorted rows, trimmed values).
 */
function normalizeResult(result: SQLResult): string {
  if (!result || !result.columns || !result.columns.length) return '[]';
  if (!result.values || !result.values.length) return '[]';

  const rows = result.values.map(row =>
    result.columns.reduce((obj: Record<string, any>, col, i) => {
      obj[col] = row[i] !== null && row[i] !== undefined ? row[i] : null;
      return obj;
    }, {})
  );

  // Sort rows by all columns to avoid order-dependent comparison
  rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify(rows);
}

/**
 * Run user SQL, compare against expected output from the solution query.
 * For SQL problems, `expected_output` in test_cases is a JSON array like:
 *   [{"id":1,"title":"Toy Story",...}, ...]
 * We compare the user's result against this.
 */
export async function runSQLWithTests(
  userQuery: string,
  contextSql: string | null | undefined,
  testCases: Array<{ id: number; input_data: string; expected_output: string; is_hidden: boolean }>
): Promise<{ userResult: SQLResult; testResults: SQLTestCaseResult[] }> {
  const sqljs = await initSQL();

  // Run user query
  const userDb = new sqljs.Database();
  let userResult: SQLResult;
  try {
    if (contextSql) {
      userDb.run(contextSql);
    }
    const res: QueryExecResult[] = userDb.exec(userQuery);
    userResult = res && res.length > 0 && res[0]
      ? { columns: getColumns(res[0]), values: res[0].values || [] }
      : { columns: [], values: [] };
  } catch (err: any) {
    throw new Error(err.message || 'SQL Execution Error');
  } finally {
    userDb.close();
  }

  // If no test cases, just return the result
  if (!testCases || testCases.length === 0) {
    return { userResult, testResults: [] };
  }

  // Compare against each test case
  const testResults: SQLTestCaseResult[] = [];
  const userNormalized = normalizeResult(userResult);

  for (const tc of testCases) {
    try {
      // Parse expected output - it's a JSON array of row objects
      const expectedRows: Record<string, any>[] = JSON.parse(tc.expected_output);

      // Normalize expected for comparison
      const sortedExpected = [...expectedRows].sort((a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b))
      );
      const expectedNormalized = JSON.stringify(sortedExpected);

      const passed = userNormalized === expectedNormalized;

      const userCols = userResult.columns || [];
      const userVals = userResult.values || [];
      const userPreview = userVals.length > 0
        ? `${userCols.join(', ')} → ${userVals.length} row(s)`
        : '(no rows)';

      const expectedPreview = `${expectedRows.length} row(s) with columns: ${expectedRows.length > 0 ? Object.keys(expectedRows[0]).join(', ') : 'none'}`;

      testResults.push({
        id: tc.id,
        input: tc.is_hidden ? '(hidden)' : `Query: ${userQuery}`,
        expected: tc.is_hidden ? '(hidden)' : expectedPreview,
        actual: tc.is_hidden ? (passed ? '(correct)' : '(incorrect)') : userPreview,
        passed,
        hidden: tc.is_hidden,
      });
    } catch (e: any) {
      testResults.push({
        id: tc.id,
        input: tc.is_hidden ? '(hidden)' : `Query: ${userQuery}`,
        expected: tc.is_hidden ? '(hidden)' : tc.expected_output,
        actual: `Error comparing: ${e.message}`,
        passed: false,
        hidden: tc.is_hidden,
      });
    }
  }

  return { userResult, testResults };
}
