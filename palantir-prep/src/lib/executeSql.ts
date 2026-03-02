import initSqlJs, { Database, QueryExecResult } from 'sql.js';

let SQL: any = null;

export async function initSQL() {
  if (SQL) return SQL;
  try {
    SQL = await initSqlJs({
      locateFile: file => `/${file}` // Looks for sql-wasm.wasm in public folder
    });
    return SQL;
  } catch (error) {
    console.error("Failed to load SQL.js WASM module", error);
    throw error;
  }
}

export async function runSQL(query: string, contextSql?: string): Promise<{ columns: string[], values: any[][] }> {
  const sqljs = await initSQL();
  const db = new sqljs.Database();

  try {
    if (contextSql) {
      db.run(contextSql);
    }
    const res: QueryExecResult[] = db.exec(query);
    if (res.length > 0) {
      return { columns: res[0].columns, values: res[0].values };
    }
    return { columns: [], values: [] };
  } catch (err: any) {
    throw new Error(err.message || 'SQL Execution Error');
  } finally {
    db.close();
  }
}
