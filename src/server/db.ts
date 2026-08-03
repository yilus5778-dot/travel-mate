/**
 * 协作存储层：统一 D1 风格的数据库接口。
 *
 * - 部署到 Cloudflare / Lovable 托管时，使用 env.DB(D1 binding)。
 * - 自有服务器 / 本地开发时，回落到 Node 内置的 node:sqlite(需 Node 22+),
 *   数据文件位置由 COLLAB_DB_PATH 决定，默认 ./data/collaboration.sqlite。
 */

export type CollabResult = { meta?: { changes?: number } };

export type CollabStatement = {
  bind: (...values: unknown[]) => CollabStatement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
  run: () => Promise<CollabResult>;
};

export type CollabDb = {
  prepare: (sql: string) => CollabStatement;
  batch: (statements: CollabStatement[]) => Promise<CollabResult[]>;
};

type RuntimeEnv = { DB?: CollabDb };

type SqliteStatement = {
  get: (...values: unknown[]) => unknown;
  all: (...values: unknown[]) => unknown[];
  run: (...values: unknown[]) => { changes: number | bigint };
};

type SqliteDatabase = {
  prepare: (sql: string) => SqliteStatement;
  exec: (sql: string) => void;
};

/** 包装器上挂出惰性原生 statement + 绑定值,供 batch 事务使用 */
type BoundCollabStatement = CollabStatement & {
  __bound: { getStmt: () => SqliteStatement; values: unknown[] };
};

function normalizeSqliteValue(value: unknown) {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === null || typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "bigint" || value instanceof Uint8Array) return value;
  return String(value);
}

function wrapSqliteStatement(
  getStmt: () => SqliteStatement,
  values: unknown[] = [],
): BoundCollabStatement {
  return {
    __bound: { getStmt, values },
    bind: (...nextValues: unknown[]) => wrapSqliteStatement(getStmt, nextValues),
    first: async <T = Record<string, unknown>>() => {
      const row = getStmt().get(...values.map(normalizeSqliteValue));
      return (row ?? null) as T | null;
    },
    all: async <T = Record<string, unknown>>() => ({
      results: getStmt().all(...values.map(normalizeSqliteValue)) as T[],
    }),
    run: async () => {
      const info = getStmt().run(...values.map(normalizeSqliteValue));
      return { meta: { changes: Number(info.changes) } };
    },
  };
}

let nodeDbPromise: Promise<CollabDb> | undefined;

async function createNodeSqliteDb(): Promise<CollabDb> {
  const [{ DatabaseSync }, path, fs] = await Promise.all([
    import("node:sqlite"),
    import("node:path"),
    import("node:fs"),
  ]);
  const file = process.env.COLLAB_DB_PATH || "./data/collaboration.sqlite";
  const absolute = path.resolve(file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const db = new DatabaseSync(absolute) as unknown as SqliteDatabase;
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  return {
    prepare: (sql) => {
      // 惰性 prepare:DDL(如 CREATE INDEX)在 prepare 阶段就会校验表是否存在,
      // 推迟到执行时才能保证 batch 内前面的 CREATE TABLE 先生效
      let cached: SqliteStatement | undefined;
      const getStmt = () => (cached ??= db.prepare(sql));
      return wrapSqliteStatement(getStmt);
    },
    batch: async (statements) => {
      db.exec("BEGIN");
      try {
        const results: CollabResult[] = [];
        for (const statement of statements) {
          const { getStmt, values } = (statement as BoundCollabStatement).__bound;
          const info = getStmt().run(...values.map(normalizeSqliteValue));
          results.push({ meta: { changes: Number(info.changes) } });
        }
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

export async function getCollabDb(env: unknown): Promise<CollabDb> {
  const d1 = (env as RuntimeEnv | undefined)?.DB;
  if (d1) return d1;
  if (!nodeDbPromise) {
    nodeDbPromise = createNodeSqliteDb().catch((error) => {
      nodeDbPromise = undefined;
      throw error;
    });
  }
  return nodeDbPromise;
}
