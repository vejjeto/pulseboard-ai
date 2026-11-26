import { logger } from "@/lib/logger";
import { closeDbForTests, getSqlite } from "./index";
import { ensureSchema } from "./init";
import { seedDemoIfEmpty } from "./seed-data";

function main(): void {
  const sqlite = getSqlite();
  ensureSchema(sqlite);
  const seeded = seedDemoIfEmpty(sqlite);
  logger.info(
    seeded
      ? "[db:seed] Demo board seeded successfully."
      : "[db:seed] Database already contains board data (skipped).",
  );
  closeDbForTests();
}

main();
