import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  vector,
} from "drizzle-orm/pg-core";

/**
 * PostgreSQL + pgvector production schema.
 * Migration preamble:
 *   CREATE EXTENSION IF NOT EXISTS vector;
 *   CREATE INDEX IF NOT EXISTS tasks_embedding_hnsw_idx
 *     ON tasks USING hnsw (embedding vector_cosine_ops);
 * Semantic cosine similarity query:
 *   SELECT id, title, 1 - (embedding <=> $1::vector) AS similarity
 *   FROM tasks
 *   WHERE embedding IS NOT NULL
 *   ORDER BY embedding <=> $1::vector
 *   LIMIT 10;
 */

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarColor: text("avatar_color").notNull(),
});

export const boards = pgTable("boards", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  createdAt: text("created_at").notNull(),
});

export const columns = pgTable("columns", {
  id: text("id").primaryKey(),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: doublePrecision("position").notNull(),
  wipLimit: integer("wip_limit"),
});

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    columnId: text("column_id")
      .notNull()
      .references(() => columns.id, { onDelete: "cascade" }),
    assigneeId: text("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    priority: text("priority").notNull(),
    dueDate: text("due_date"),
    estimatedHours: doublePrecision("estimated_hours"),
    position: doublePrecision("position").notNull(),
    embedding: vector("embedding", { dimensions: 64 }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("tasks_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const subtasks = pgTable("subtasks", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
});

export const labels = pgTable("labels", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

export const taskLabels = pgTable(
  "task_labels",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    labelId: text("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.labelId] })],
);
