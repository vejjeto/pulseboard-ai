import { logger } from "@/lib/logger";
import { closeDbForTests, getSqlite } from "./index";
import { ensureSchema } from "./init";

function main(): void {
  const sqlite = getSqlite();
  ensureSchema(sqlite);
  logger.info("[db:migrate] SQLite schema initialized successfully.");
  closeDbForTests();
}

main();
