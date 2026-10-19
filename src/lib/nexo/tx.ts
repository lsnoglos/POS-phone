import { dbSource, getPglite, type Sql } from "@/lib/db";

type Row = Record<string, unknown>;

function makeSql(run: (text: string, params: unknown[]) => Promise<Row[]>): Sql {
  const sql = (async <T = Row>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
    return run(text, values) as Promise<T[]>;
  }) as Sql;
  sql.query = (<T = Row>(text: string, params: unknown[] = []) => run(text, params) as Promise<T[]>) as Sql["query"];
  return sql;
}

let neonPool: import("pg").Pool | null = null;

async function pool() {
  if (neonPool) return neonPool;
  const { Pool, types } = await import("pg");
  types.setTypeParser(20, (v) => Number(v));
  types.setTypeParser(1082, (v) => v);
  types.setTypeParser(1186, (v) => v);
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL no está configurada");
  neonPool = new Pool({ connectionString });
  return neonPool;
}

/** Run `fn` in a single database transaction (PGLite preview or Neon). */
export async function withTx<T>(fn: (sql: Sql) => Promise<T>): Promise<T> {
  if (dbSource === "pglite") {
    const pg = await getPglite();
    return pg.transaction(async (tx) => {
      const sql = makeSql(async (text, params) => {
        const result = await tx.query<Row>(text, params);
        return result.rows;
      });
      return fn(sql);
    });
  }
  const client = await (await pool()).connect();
  try {
    await client.query("begin");
    const sql = makeSql(async (text, params) => {
      const result = await client.query(text, params);
      return result.rows as Row[];
    });
    const value = await fn(sql);
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
