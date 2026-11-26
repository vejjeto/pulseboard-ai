import type { DatabaseSync } from "node:sqlite";
import { computeLocalEmbedding } from "@/core/semantic-search";
import type { Priority } from "./schema";

export const DEMO_BOARD_ID = "board-flowmind-q4";
export const DEMO_BOARD_SLUG = "flowmind-launch-q4";

interface SeedUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

interface SeedColumn {
  id: string;
  boardId: string;
  title: string;
  position: number;
  wipLimit: number | null;
}

interface SeedLabel {
  id: string;
  name: string;
  color: string;
}

interface SeedTask {
  id: string;
  columnId: string;
  assigneeId: string;
  title: string;
  description: string;
  priority: Priority;
  dayOffset: number;
  estimatedHours: number;
  position: number;
  labelIds: string[];
  subtasks: Array<{ title: string; completed: boolean }>;
}

const SEED_USERS: SeedUser[] = [
  {
    id: "user-ana",
    name: "Ana Sofía Vega",
    email: "ana@flowmind.ai",
    avatarColor: "#6366f1",
  },
  {
    id: "user-mateo",
    name: "Mateo Ríos",
    email: "mateo@flowmind.ai",
    avatarColor: "#0ea5e9",
  },
  {
    id: "user-lucia",
    name: "Lucía Herrera",
    email: "lucia@flowmind.ai",
    avatarColor: "#10b981",
  },
];

const SEED_COLUMNS: SeedColumn[] = [
  {
    id: "col-backlog",
    boardId: DEMO_BOARD_ID,
    title: "Backlog",
    position: 1024,
    wipLimit: null,
  },
  {
    id: "col-design",
    boardId: DEMO_BOARD_ID,
    title: "En Diseño",
    position: 2048,
    wipLimit: 3,
  },
  {
    id: "col-dev",
    boardId: DEMO_BOARD_ID,
    title: "En Desarrollo",
    position: 3072,
    wipLimit: 3,
  },
  {
    id: "col-done",
    boardId: DEMO_BOARD_ID,
    title: "Completado",
    position: 4096,
    wipLimit: null,
  },
];

const SEED_LABELS: SeedLabel[] = [
  { id: "lbl-ai", name: "AI Engine", color: "#8b5cf6" },
  { id: "lbl-frontend", name: "Frontend", color: "#0ea5e9" },
  { id: "lbl-backend", name: "Backend", color: "#10b981" },
  { id: "lbl-design", name: "UX / UI", color: "#ec4899" },
  { id: "lbl-infra", name: "Infra", color: "#f59e0b" },
  { id: "lbl-growth", name: "Launch", color: "#ef4444" },
];

function formatMonthDate(baseDate: Date, dayOffset: number): string {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const targetDay = Math.min(
    Math.max(baseDate.getDate() + dayOffset, 1),
    daysInMonth,
  );
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(targetDay).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

const SEED_TASKS: SeedTask[] = [
  {
    id: "task-1",
    columnId: "col-backlog",
    assigneeId: "user-mateo",
    title: "Configurar webhooks de Stripe Billing",
    description:
      "Implementar endpoint firmado para checkout.session.completed y customer.subscription.updated con reintentos idempotentes.",
    priority: "High",
    dayOffset: 5,
    estimatedHours: 6,
    position: 1024,
    labelIds: ["lbl-backend", "lbl-growth"],
    subtasks: [
      { title: "Verificar firma Stripe-Signature", completed: true },
      {
        title: "Persistir eventos procesados para idempotencia",
        completed: false,
      },
      { title: "Probar flujo de cancelación y upgrade", completed: false },
    ],
  },
  {
    id: "task-2",
    columnId: "col-backlog",
    assigneeId: "user-lucia",
    title: "Exportación CSV y JSON desde Vista Tabla",
    description:
      "Permitir descargar las tareas filtradas respetando prioridad, fecha límite y etiquetas activas.",
    priority: "Low",
    dayOffset: 8,
    estimatedHours: 3,
    position: 2048,
    labelIds: ["lbl-frontend"],
    subtasks: [
      { title: "Serializador CSV con escape UTF-8", completed: false },
      { title: "Botón de descarga accesible", completed: false },
    ],
  },
  {
    id: "task-3",
    columnId: "col-backlog",
    assigneeId: "user-ana",
    title: "Telemetría OpenTelemetry en rutas críticas",
    description:
      "Instrumentar latencia p95 en movimientos de tarjetas y endpoints de IA sin bloquear el hilo principal.",
    priority: "Medium",
    dayOffset: 6,
    estimatedHours: 4,
    position: 3072,
    labelIds: ["lbl-infra", "lbl-backend"],
    subtasks: [
      { title: "Trazar duración de rebalanceo SQLite", completed: false },
      { title: "Exponer métricas en /api/health", completed: false },
    ],
  },
  {
    id: "task-4",
    columnId: "col-design",
    assigneeId: "user-lucia",
    title: "Microinteracciones de drag & drop en móvil",
    description:
      "Ajustar sensores táctiles de @dnd-kit para evitar conflictos con scroll horizontal en pantallas de 375px.",
    priority: "High",
    dayOffset: 2,
    estimatedHours: 5,
    position: 1024,
    labelIds: ["lbl-design", "lbl-frontend"],
    subtasks: [
      { title: "Configurar TouchSensor con delay de 180ms", completed: true },
      { title: "Diseñar DragOverlay con sombra adaptativa", completed: true },
      { title: "Validar contraste en modo oscuro", completed: false },
    ],
  },
  {
    id: "task-5",
    columnId: "col-design",
    assigneeId: "user-lucia",
    title: "Sistema de tokens Dark/Light sin parpadeo",
    description:
      "Unificar variables CSS y paletas semánticas para tarjetas urgentes, límites WIP y estados vacíos.",
    priority: "Medium",
    dayOffset: 4,
    estimatedHours: 3.5,
    position: 2048,
    labelIds: ["lbl-design"],
    subtasks: [
      { title: "Definir paleta de superficie y bordes", completed: true },
      { title: "Revisar contraste WCAG AA en badges", completed: false },
    ],
  },
  {
    id: "task-6",
    columnId: "col-design",
    assigneeId: "user-ana",
    title: "Flujo de onboarding interactivo en Landing",
    description:
      "Diseñar vista previa de Kanban + AI Decompose que comunique el valor del producto en menos de 5 segundos.",
    priority: "High",
    dayOffset: -1,
    estimatedHours: 4,
    position: 3072,
    labelIds: ["lbl-design", "lbl-growth"],
    subtasks: [
      { title: "Hero con CTA directo a tablero demo", completed: true },
      { title: "Preview interactivo de métricas IA", completed: false },
    ],
  },
  {
    id: "task-7",
    columnId: "col-dev",
    assigneeId: "user-ana",
    title: "Motor de Fractional Indexing con rebalanceo local",
    description:
      "Garantizar escrituras O(1) en reordenamiento de tarjetas y rebalancear solo la columna afectada cuando gap < 1.",
    priority: "Urgent",
    dayOffset: -2,
    estimatedHours: 6,
    position: 1024,
    labelIds: ["lbl-backend"],
    subtasks: [
      { title: "Implementar computePosition(prev, next)", completed: true },
      { title: "Detectar colisiones con gap < 1", completed: true },
      { title: "Cubrir bisección repetida con tests", completed: false },
    ],
  },
  {
    id: "task-8",
    columnId: "col-dev",
    assigneeId: "user-mateo",
    title: "AI Decompose con validación Zod y fallback local",
    description:
      "Permitir desglosar objetivos en 4-6 tareas accionables usando LLM externo o heurística local sin API keys.",
    priority: "Urgent",
    dayOffset: 1,
    estimatedHours: 7,
    position: 2048,
    labelIds: ["lbl-ai", "lbl-backend"],
    subtasks: [
      { title: "Definir esquema Zod para tareas y subtareas", completed: true },
      { title: "Construir motor heurístico multidomino", completed: true },
      { title: "Añadir timeout AbortSignal de 8s", completed: false },
    ],
  },
  {
    id: "task-9",
    columnId: "col-dev",
    assigneeId: "user-mateo",
    title: "UI Optimista 0ms con Rollback ante fallos",
    description:
      "Actualizar estado inmediatamente al soltar tarjeta y revertir limpiamente con Toast si PATCH /move falla.",
    priority: "Urgent",
    dayOffset: -3,
    estimatedHours: 5,
    position: 3072,
    labelIds: ["lbl-frontend"],
    subtasks: [
      {
        title: "Snapshot de columnas y tareas previo al drag",
        completed: true,
      },
      { title: "Toggle 'Simular error de red' en toolbar", completed: false },
      { title: "Toast accesible con botón reintentar", completed: false },
    ],
  },
  {
    id: "task-10",
    columnId: "col-dev",
    assigneeId: "user-ana",
    title: "Vista Calendario mensual sincronizada",
    description:
      "Renderizar tareas por dueDate en cuadrícula mensual con navegación entre meses y drawer de edición rápida.",
    priority: "High",
    dayOffset: 3,
    estimatedHours: 5,
    position: 4096,
    labelIds: ["lbl-frontend", "lbl-design"],
    subtasks: [
      {
        title: "Construir grid de 7 columnas con padding de mes",
        completed: true,
      },
      {
        title: "Conectar click en tarjeta con TaskDetailDrawer",
        completed: false,
      },
    ],
  },
  {
    id: "task-11",
    columnId: "col-done",
    assigneeId: "user-mateo",
    title: "Esquema relacional SQLite + PostgreSQL Drizzle",
    description:
      "Modelar users, boards, columns, tasks, subtasks, labels y task_labels con llaves foráneas en cascada.",
    priority: "High",
    dayOffset: -4,
    estimatedHours: 4,
    position: 1024,
    labelIds: ["lbl-backend", "lbl-infra"],
    subtasks: [
      { title: "Definir schema.ts para SQLite", completed: true },
      { title: "Definir schema.pg.ts equivalente", completed: true },
    ],
  },
  {
    id: "task-12",
    columnId: "col-done",
    assigneeId: "user-ana",
    title: "Pipeline CI de verificación estática y tests",
    description:
      "Asegurar typecheck estricto, ESLint sin any y suite Vitest en memoria antes de cada release.",
    priority: "Medium",
    dayOffset: -5,
    estimatedHours: 3,
    position: 2048,
    labelIds: ["lbl-infra"],
    subtasks: [
      { title: "Configurar Vitest con alias @/", completed: true },
      { title: "Activar regla no-explicit-any", completed: true },
    ],
  },
];

export function insertDemoData(sqlite: DatabaseSync): void {
  const now = new Date();
  const createdAt = now.toISOString();

  const insertUser = sqlite.prepare(
    "INSERT OR IGNORE INTO users (id, name, email, avatar_color) VALUES (?, ?, ?, ?)",
  );
  for (const user of SEED_USERS) {
    insertUser.run(user.id, user.name, user.email, user.avatarColor);
  }

  sqlite
    .prepare(
      "INSERT OR IGNORE INTO boards (id, slug, title, description, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(
      DEMO_BOARD_ID,
      DEMO_BOARD_SLUG,
      "FlowMind Product Launch Q4",
      "Lanzamiento integral de FlowMind Kanban AI: arquitectura O(1), desglose con IA y vistas sincronizadas.",
      createdAt,
    );

  const insertColumn = sqlite.prepare(
    "INSERT OR IGNORE INTO columns (id, board_id, title, position, wip_limit) VALUES (?, ?, ?, ?, ?)",
  );
  for (const col of SEED_COLUMNS) {
    insertColumn.run(
      col.id,
      col.boardId,
      col.title,
      col.position,
      col.wipLimit,
    );
  }

  const insertLabel = sqlite.prepare(
    "INSERT OR IGNORE INTO labels (id, name, color) VALUES (?, ?, ?)",
  );
  for (const lbl of SEED_LABELS) {
    insertLabel.run(lbl.id, lbl.name, lbl.color);
  }

  const insertTask = sqlite.prepare(
    `INSERT OR IGNORE INTO tasks
      (id, board_id, column_id, assignee_id, title, description, priority, due_date, estimated_hours, position, embedding_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertSubtask = sqlite.prepare(
    "INSERT OR IGNORE INTO subtasks (id, task_id, title, completed) VALUES (?, ?, ?, ?)",
  );
  const insertTaskLabel = sqlite.prepare(
    "INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)",
  );

  for (const task of SEED_TASKS) {
    const dueDate = formatMonthDate(now, task.dayOffset);
    const embeddingJson = JSON.stringify(
      computeLocalEmbedding(`${task.title} ${task.description}`),
    );
    insertTask.run(
      task.id,
      DEMO_BOARD_ID,
      task.columnId,
      task.assigneeId,
      task.title,
      task.description,
      task.priority,
      dueDate,
      task.estimatedHours,
      task.position,
      embeddingJson,
      createdAt,
    );

    task.subtasks.forEach((sub, idx) => {
      insertSubtask.run(
        `${task.id}-sub-${idx + 1}`,
        task.id,
        sub.title,
        sub.completed ? 1 : 0,
      );
    });

    for (const labelId of task.labelIds) {
      insertTaskLabel.run(task.id, labelId);
    }
  }
}

export function seedDemoIfEmpty(sqlite: DatabaseSync): boolean {
  const row = sqlite.prepare("SELECT COUNT(*) as cnt FROM boards").get() as
    | { cnt?: number | bigint }
    | undefined;
  const count = Number(row?.cnt ?? 0);
  if (count > 0) {
    return false;
  }
  insertDemoData(sqlite);
  return true;
}

export function resetDemoDatabase(sqlite: DatabaseSync): void {
  sqlite.exec("BEGIN TRANSACTION;");
  try {
    sqlite.exec(`
      DELETE FROM task_labels;
      DELETE FROM subtasks;
      DELETE FROM tasks;
      DELETE FROM columns;
      DELETE FROM boards;
      DELETE FROM labels;
      DELETE FROM users;
    `);
    insertDemoData(sqlite);
    sqlite.exec("COMMIT;");
  } catch (err) {
    sqlite.exec("ROLLBACK;");
    throw err;
  }
}
