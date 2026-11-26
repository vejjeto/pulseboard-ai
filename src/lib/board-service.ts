import crypto from "node:crypto";
import {
  type SemanticTaskInput,
  computeLocalEmbedding,
} from "@/core/semantic-search";
import { getDb, getSqlite, resetDemo } from "@/db";
import {
  PRIORITY_VALUES,
  type Priority,
  boards,
  columns,
  labels,
  subtasks,
  taskLabels,
  tasks,
  users,
} from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  INDEX_STEP,
  computePosition,
  rebalancePositions,
} from "./fractional-index";
import type {
  BoardPayload,
  ColumnDTO,
  LabelDTO,
  SubtaskDTO,
  TaskDTO,
  UserDTO,
} from "./types";

export const CreateTaskSchema = z.object({
  boardId: z.string().min(1),
  columnId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().default(""),
  priority: z.enum(PRIORITY_VALUES).optional().default("Medium"),
  assigneeId: z.string().nullable().optional().default(null),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .default(null),
  estimatedHours: z
    .number()
    .min(0.5)
    .max(200)
    .nullable()
    .optional()
    .default(null),
  labelIds: z.array(z.string()).optional().default([]),
  subtasks: z.array(z.string().trim().min(1).max(160)).optional().default([]),
});

export const UpdateTaskSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(PRIORITY_VALUES).optional(),
  columnId: z.string().min(1).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  estimatedHours: z.number().min(0.5).max(200).nullable().optional(),
  labelIds: z.array(z.string()).optional(),
});

export const MoveTaskSchema = z.object({
  targetColumnId: z.string().min(1),
  prevTaskId: z.string().nullable().optional().default(null),
  nextTaskId: z.string().nullable().optional().default(null),
  simulateError: z.boolean().optional().default(false),
});

export const MoveColumnSchema = z.object({
  prevColumnId: z.string().nullable().optional().default(null),
  nextColumnId: z.string().nullable().optional().default(null),
  simulateError: z.boolean().optional().default(false),
});

export async function listSemanticTasks(
  boardIdOrSlug?: string,
): Promise<Array<SemanticTaskInput & { columnId: string; priority: string }>> {
  const db = getDb();
  const [board] = boardIdOrSlug
    ? await db
        .select()
        .from(boards)
        .where(eq(boards.id, boardIdOrSlug))
        .limit(1)
    : await db.select().from(boards).limit(1);

  const resolvedBoard =
    board ??
    (boardIdOrSlug
      ? (
          await db
            .select()
            .from(boards)
            .where(eq(boards.slug, boardIdOrSlug))
            .limit(1)
        )[0]
      : undefined);

  if (!resolvedBoard) {
    throw new Error("Board not found");
  }

  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      embeddingJson: tasks.embeddingJson,
      columnId: tasks.columnId,
      priority: tasks.priority,
    })
    .from(tasks)
    .where(eq(tasks.boardId, resolvedBoard.id))
    .orderBy(asc(tasks.position));
}

export async function getBoardData(
  boardIdOrSlug?: string,
): Promise<BoardPayload> {
  const db = getDb();
  const [board] = boardIdOrSlug
    ? await db
        .select()
        .from(boards)
        .where(eq(boards.id, boardIdOrSlug))
        .limit(1)
    : await db.select().from(boards).limit(1);

  const resolvedBoard =
    board ??
    (boardIdOrSlug
      ? (
          await db
            .select()
            .from(boards)
            .where(eq(boards.slug, boardIdOrSlug))
            .limit(1)
        )[0]
      : undefined);

  if (!resolvedBoard) {
    throw new Error("Board not found");
  }

  const [allUsers, allLabels, boardColumns, boardTasks] = await Promise.all([
    db.select().from(users).orderBy(asc(users.name)),
    db.select().from(labels).orderBy(asc(labels.name)),
    db
      .select()
      .from(columns)
      .where(eq(columns.boardId, resolvedBoard.id))
      .orderBy(asc(columns.position)),
    db
      .select()
      .from(tasks)
      .where(eq(tasks.boardId, resolvedBoard.id))
      .orderBy(asc(tasks.position)),
  ]);

  const [allSubtasks, allTaskLabels] = await Promise.all([
    db.select().from(subtasks),
    db.select().from(taskLabels),
  ]);

  const userMap = new Map<string, UserDTO>(allUsers.map((u) => [u.id, u]));
  const labelMap = new Map<string, LabelDTO>(allLabels.map((l) => [l.id, l]));

  const subtasksByTask = new Map<string, SubtaskDTO[]>();
  for (const sub of allSubtasks) {
    const list = subtasksByTask.get(sub.taskId) ?? [];
    list.push({
      id: sub.id,
      taskId: sub.taskId,
      title: sub.title,
      completed: Boolean(sub.completed),
    });
    subtasksByTask.set(sub.taskId, list);
  }

  const labelsByTask = new Map<string, LabelDTO[]>();
  for (const tl of allTaskLabels) {
    const lbl = labelMap.get(tl.labelId);
    if (!lbl) continue;
    const list = labelsByTask.get(tl.taskId) ?? [];
    list.push(lbl);
    labelsByTask.set(tl.taskId, list);
  }

  const enrichedTasks: TaskDTO[] = boardTasks.map((task) => ({
    id: task.id,
    boardId: task.boardId,
    columnId: task.columnId,
    assigneeId: task.assigneeId,
    assignee: task.assigneeId ? (userMap.get(task.assigneeId) ?? null) : null,
    title: task.title,
    description: task.description,
    priority: task.priority as Priority,
    dueDate: task.dueDate,
    estimatedHours: task.estimatedHours,
    position: task.position,
    createdAt: task.createdAt,
    subtasks: subtasksByTask.get(task.id) ?? [],
    labels: labelsByTask.get(task.id) ?? [],
  }));

  return {
    board: resolvedBoard,
    users: allUsers,
    labels: allLabels,
    columns: boardColumns,
    tasks: enrichedTasks,
  };
}

async function getTaskById(taskId: string): Promise<TaskDTO | null> {
  const db = getDb();
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) return null;

  const [taskSubtasks, taskLbls, allLabels, assigneeRows] = await Promise.all([
    db.select().from(subtasks).where(eq(subtasks.taskId, taskId)),
    db.select().from(taskLabels).where(eq(taskLabels.taskId, taskId)),
    db.select().from(labels),
    task.assigneeId
      ? db.select().from(users).where(eq(users.id, task.assigneeId)).limit(1)
      : Promise.resolve([]),
  ]);

  const labelMap = new Map(allLabels.map((l) => [l.id, l]));
  return {
    id: task.id,
    boardId: task.boardId,
    columnId: task.columnId,
    assigneeId: task.assigneeId,
    assignee: assigneeRows[0] ?? null,
    title: task.title,
    description: task.description,
    priority: task.priority as Priority,
    dueDate: task.dueDate,
    estimatedHours: task.estimatedHours,
    position: task.position,
    createdAt: task.createdAt,
    subtasks: taskSubtasks.map((s) => ({
      id: s.id,
      taskId: s.taskId,
      title: s.title,
      completed: Boolean(s.completed),
    })),
    labels: taskLbls
      .map((tl) => labelMap.get(tl.labelId))
      .filter((l): l is LabelDTO => Boolean(l)),
  };
}

export async function createTask(
  rawInput: z.input<typeof CreateTaskSchema>,
): Promise<TaskDTO> {
  const input = CreateTaskSchema.parse(rawInput);
  const db = getDb();

  const existingInCol = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(eq(tasks.columnId, input.columnId))
    .orderBy(asc(tasks.position));

  const lastPosition = existingInCol.at(-1)?.position ?? null;
  const { position } = computePosition(lastPosition, null);

  const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  const embeddingJson = JSON.stringify(
    computeLocalEmbedding(`${input.title} ${input.description}`),
  );

  await db.insert(tasks).values({
    id: taskId,
    boardId: input.boardId,
    columnId: input.columnId,
    assigneeId: input.assigneeId,
    title: input.title,
    description: input.description,
    priority: input.priority,
    dueDate: input.dueDate,
    estimatedHours: input.estimatedHours,
    position,
    embeddingJson,
    createdAt,
  });

  if (input.subtasks.length > 0) {
    await db.insert(subtasks).values(
      input.subtasks.map((title) => ({
        id: `sub-${crypto.randomUUID().slice(0, 8)}`,
        taskId,
        title,
        completed: false,
      })),
    );
  }

  if (input.labelIds.length > 0) {
    await db.insert(taskLabels).values(
      input.labelIds.map((labelId) => ({
        taskId,
        labelId,
      })),
    );
  }

  const created = await getTaskById(taskId);
  if (!created) throw new Error("Failed to load created task");
  return created;
}

export async function updateTask(
  taskId: string,
  rawInput: z.input<typeof UpdateTaskSchema>,
): Promise<TaskDTO | null> {
  const input = UpdateTaskSchema.parse(rawInput);
  const db = getDb();

  const [existing] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!existing) return null;

  let nextPosition = existing.position;
  if (input.columnId && input.columnId !== existing.columnId) {
    const colTasks = await db
      .select({ position: tasks.position })
      .from(tasks)
      .where(eq(tasks.columnId, input.columnId))
      .orderBy(asc(tasks.position));
    const lastPos = colTasks.at(-1)?.position ?? null;
    nextPosition = computePosition(lastPos, null).position;
  }

  const nextTitle = input.title ?? existing.title;
  const nextDescription = input.description ?? existing.description;
  const embeddingJson =
    input.title !== undefined || input.description !== undefined
      ? JSON.stringify(computeLocalEmbedding(`${nextTitle} ${nextDescription}`))
      : existing.embeddingJson;

  await db
    .update(tasks)
    .set({
      title: nextTitle,
      description: nextDescription,
      priority: input.priority ?? existing.priority,
      columnId: input.columnId ?? existing.columnId,
      assigneeId:
        input.assigneeId !== undefined ? input.assigneeId : existing.assigneeId,
      dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
      estimatedHours:
        input.estimatedHours !== undefined
          ? input.estimatedHours
          : existing.estimatedHours,
      position: nextPosition,
      embeddingJson,
    })
    .where(eq(tasks.id, taskId));

  if (input.labelIds !== undefined) {
    await db.delete(taskLabels).where(eq(taskLabels.taskId, taskId));
    if (input.labelIds.length > 0) {
      await db.insert(taskLabels).values(
        input.labelIds.map((labelId) => ({
          taskId,
          labelId,
        })),
      );
    }
  }

  return getTaskById(taskId);
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const db = getDb();
  const [existing] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!existing) return false;
  await db.delete(tasks).where(eq(tasks.id, taskId));
  return true;
}

function buildOrderedIdsWithInsert(
  existingIds: string[],
  movingId: string,
  prevId: string | null,
  nextId: string | null,
): string[] {
  const filtered = existingIds.filter((id) => id !== movingId);
  if (prevId) {
    const idx = filtered.indexOf(prevId);
    if (idx !== -1) {
      filtered.splice(idx + 1, 0, movingId);
      return filtered;
    }
  }
  if (nextId) {
    const idx = filtered.indexOf(nextId);
    if (idx !== -1) {
      filtered.splice(idx, 0, movingId);
      return filtered;
    }
  }
  if (prevId === null && nextId === null && filtered.length > 0) {
    filtered.push(movingId);
    return filtered;
  }
  filtered.unshift(movingId);
  return filtered;
}

export interface MoveTaskResult {
  task: TaskDTO;
  rebalanced: boolean;
  updatedRowsCount: number;
  previousColumnId: string;
  columnTitle: string;
}

export async function moveTask(
  taskId: string,
  rawInput: z.input<typeof MoveTaskSchema>,
): Promise<MoveTaskResult> {
  const input = MoveTaskSchema.parse(rawInput);
  const db = getDb();

  const [movingTask] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!movingTask) {
    throw new Error("Task not found");
  }

  const [targetCol] = await db
    .select()
    .from(columns)
    .where(eq(columns.id, input.targetColumnId))
    .limit(1);
  if (!targetCol) {
    throw new Error("Target column not found");
  }

  const colTasks = (
    await db
      .select({ id: tasks.id, position: tasks.position })
      .from(tasks)
      .where(eq(tasks.columnId, input.targetColumnId))
      .orderBy(asc(tasks.position))
  ).filter((t) => t.id !== taskId);

  const prevRow = input.prevTaskId
    ? (colTasks.find((t) => t.id === input.prevTaskId) ?? null)
    : null;
  const nextRow = input.nextTaskId
    ? (colTasks.find((t) => t.id === input.nextTaskId) ?? null)
    : null;

  const isAppendWithoutRefs =
    input.prevTaskId === null &&
    input.nextTaskId === null &&
    colTasks.length > 0;

  const prevPos = isAppendWithoutRefs
    ? (colTasks.at(-1)?.position ?? null)
    : (prevRow?.position ?? null);
  const nextPos = isAppendWithoutRefs ? null : (nextRow?.position ?? null);

  const { position, needsRebalance } = computePosition(prevPos, nextPos);

  if (!needsRebalance) {
    await db
      .update(tasks)
      .set({ columnId: input.targetColumnId, position })
      .where(eq(tasks.id, taskId));
    const updated = await getTaskById(taskId);
    if (!updated) throw new Error("Failed to load moved task");
    return {
      task: updated,
      rebalanced: false,
      updatedRowsCount: 1,
      previousColumnId: movingTask.columnId,
      columnTitle: targetCol.title,
    };
  }

  const orderedIds = buildOrderedIdsWithInsert(
    colTasks.map((t) => t.id),
    taskId,
    input.prevTaskId,
    input.nextTaskId,
  );
  const rebalancedList = rebalancePositions(orderedIds);
  const sqlite = getSqlite();

  sqlite.exec("BEGIN TRANSACTION;");
  try {
    sqlite
      .prepare("UPDATE tasks SET column_id = ? WHERE id = ?")
      .run(input.targetColumnId, taskId);
    const updatePosStmt = sqlite.prepare(
      "UPDATE tasks SET position = ? WHERE id = ?",
    );
    for (const item of rebalancedList) {
      updatePosStmt.run(item.position, item.id);
    }
    sqlite.exec("COMMIT;");
  } catch (err) {
    sqlite.exec("ROLLBACK;");
    throw err;
  }

  const updated = await getTaskById(taskId);
  if (!updated) throw new Error("Failed to load rebalanced task");
  return {
    task: updated,
    rebalanced: true,
    updatedRowsCount: rebalancedList.length,
    previousColumnId: movingTask.columnId,
    columnTitle: targetCol.title,
  };
}

export interface MoveColumnResult {
  column: ColumnDTO;
  rebalanced: boolean;
}

export async function moveColumn(
  columnId: string,
  rawInput: z.input<typeof MoveColumnSchema>,
): Promise<MoveColumnResult> {
  const input = MoveColumnSchema.parse(rawInput);
  const db = getDb();

  const [movingCol] = await db
    .select()
    .from(columns)
    .where(eq(columns.id, columnId))
    .limit(1);
  if (!movingCol) {
    throw new Error("Column not found");
  }

  const siblingCols = (
    await db
      .select()
      .from(columns)
      .where(eq(columns.boardId, movingCol.boardId))
      .orderBy(asc(columns.position))
  ).filter((c) => c.id !== columnId);

  const prevCol = input.prevColumnId
    ? (siblingCols.find((c) => c.id === input.prevColumnId) ?? null)
    : null;
  const nextCol = input.nextColumnId
    ? (siblingCols.find((c) => c.id === input.nextColumnId) ?? null)
    : null;

  const isAppendWithoutRefs =
    input.prevColumnId === null &&
    input.nextColumnId === null &&
    siblingCols.length > 0;
  const prevPos = isAppendWithoutRefs
    ? (siblingCols.at(-1)?.position ?? null)
    : (prevCol?.position ?? null);
  const nextPos = isAppendWithoutRefs ? null : (nextCol?.position ?? null);

  const { position, needsRebalance } = computePosition(prevPos, nextPos);

  if (!needsRebalance) {
    await db.update(columns).set({ position }).where(eq(columns.id, columnId));
    const [updated] = await db
      .select()
      .from(columns)
      .where(eq(columns.id, columnId))
      .limit(1);
    if (!updated) throw new Error("Failed to load moved column");
    return { column: updated, rebalanced: false };
  }

  const orderedIds = buildOrderedIdsWithInsert(
    siblingCols.map((c) => c.id),
    columnId,
    input.prevColumnId,
    input.nextColumnId,
  );
  const rebalancedList = rebalancePositions(orderedIds);
  const sqlite = getSqlite();

  sqlite.exec("BEGIN TRANSACTION;");
  try {
    const stmt = sqlite.prepare("UPDATE columns SET position = ? WHERE id = ?");
    for (const item of rebalancedList) {
      stmt.run(item.position, item.id);
    }
    sqlite.exec("COMMIT;");
  } catch (err) {
    sqlite.exec("ROLLBACK;");
    throw err;
  }

  const [updated] = await db
    .select()
    .from(columns)
    .where(eq(columns.id, columnId))
    .limit(1);
  if (!updated) throw new Error("Failed to load rebalanced column");
  return { column: updated, rebalanced: true };
}

export async function addSubtask(
  taskId: string,
  title: string,
): Promise<SubtaskDTO> {
  const db = getDb();
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Subtask title cannot be empty");
  const id = `sub-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(subtasks).values({
    id,
    taskId,
    title: trimmed,
    completed: false,
  });
  return { id, taskId, title: trimmed, completed: false };
}

export async function updateSubtask(
  subtaskId: string,
  patch: { completed?: boolean; title?: string },
): Promise<SubtaskDTO | null> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(subtasks)
    .where(eq(subtasks.id, subtaskId))
    .limit(1);
  if (!existing) return null;

  const nextCompleted =
    patch.completed !== undefined
      ? patch.completed
      : Boolean(existing.completed);
  const nextTitle =
    patch.title !== undefined ? patch.title.trim() : existing.title;

  await db
    .update(subtasks)
    .set({ completed: nextCompleted, title: nextTitle })
    .where(eq(subtasks.id, subtaskId));

  return {
    id: existing.id,
    taskId: existing.taskId,
    title: nextTitle,
    completed: nextCompleted,
  };
}

export async function deleteSubtask(subtaskId: string): Promise<boolean> {
  const db = getDb();
  const [existing] = await db
    .select({ id: subtasks.id })
    .from(subtasks)
    .where(eq(subtasks.id, subtaskId))
    .limit(1);
  if (!existing) return false;
  await db.delete(subtasks).where(eq(subtasks.id, subtaskId));
  return true;
}

export async function resetDemoBoard(): Promise<BoardPayload> {
  resetDemo();
  return getBoardData();
}

export { INDEX_STEP };
