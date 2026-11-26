import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { ensureSchema } from "./init";
import * as schema from "./schema";
import { resetDemoDatabase, seedDemoIfEmpty } from "./seed-data";

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>;

interface DbConnection {
  dbPath: string;
  sqlite: DatabaseSync;
  db: AppDatabase;
}

let cachedConnection: DbConnection | null = null;

function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    return path.resolve(process.cwd(), "data/app.db");
  }
  if (raw === ":memory:" || raw.startsWith("file::memory:")) {
    return ":memory:";
  }
  const cleaned = raw.startsWith("file:") ? raw.slice(5) : raw;
  return path.resolve(process.cwd(), cleaned);
}

function createConnection(dbPath: string): DbConnection {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const sqlite = new DatabaseSync(dbPath);
  ensureSchema(sqlite);
  seedDemoIfEmpty(sqlite);

  const db = drizzle(
    async (sql, params, method) => {
      const stmt = sqlite.prepare(sql);
      const boundParams = params as SQLInputValue[];
      if (method === "run") {
        stmt.run(...boundParams);
        return { rows: [] };
      }
      if (method === "get") {
        stmt.setReturnArrays(true);
        const row = stmt.get(...boundParams);
        return { rows: (row ?? undefined) as unknown as unknown[] };
      }
      stmt.setReturnArrays(true);
      return { rows: stmt.all(...boundParams) as unknown as unknown[][] };
    },
    { schema },
  );

  return { dbPath, sqlite, db };
}

export function getConnection(): DbConnection {
  const dbPath = resolveDbPath();
  if (!cachedConnection || cachedConnection.dbPath !== dbPath) {
    if (cachedConnection) {
      cachedConnection.sqlite.close();
    }
    cachedConnection = createConnection(dbPath);
  }
  return cachedConnection;
}

export function getDb(): AppDatabase {
  return getConnection().db;
}

export function getSqlite(): DatabaseSync {
  return getConnection().sqlite;
}

export function resetDemo(): void {
  resetDemoDatabase(getSqlite());
}

export function closeDbForTests(): void {
  if (cachedConnection) {
    cachedConnection.sqlite.close();
    cachedConnection = null;
  }
}
