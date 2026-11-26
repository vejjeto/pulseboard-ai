import { PRIORITY_VALUES } from "@/db/schema";
import { z } from "zod";
import { createTask, getBoardData } from "./board-service";
import type { BoardPayload, TaskDTO } from "./types";

export const AiModeSchema = z.enum(["OpenAI", "Gemini", "Demo AI local"]);
export type AiMode = z.infer<typeof AiModeSchema>;

export const DecomposeRequestSchema = z.object({
  boardId: z.string().min(1).optional(),
  goal: z
    .string()
    .trim()
    .min(3, "El objetivo debe tener al menos 3 caracteres")
    .max(400),
  columnId: z.string().min(1).optional(),
  persist: z.boolean().optional().default(false),
});

export const DecomposedTaskItemSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(5).max(800),
  priority: z.enum(PRIORITY_VALUES),
  estimatedHours: z.number().min(0.5).max(80),
  subtasks: z.array(z.string().min(2).max(160)).min(2).max(5),
});

export const DecomposeResultSchema = z.object({
  mode: AiModeSchema,
  goal: z.string(),
  summary: z.string(),
  tasks: z.array(DecomposedTaskItemSchema).min(4).max(6),
  persisted: z.boolean().default(false),
  createdTaskIds: z.array(z.string()).default([]),
});

export type DecomposeResult = z.infer<typeof DecomposeResultSchema>;

export const BoardInsightsRequestSchema = z.object({
  boardId: z.string().min(1).optional(),
});

export const BoardInsightsResultSchema = z.object({
  mode: AiModeSchema,
  healthScore: z.number().int().min(0).max(100),
  summary: z.string(),
  overloadedColumns: z.array(
    z.object({
      columnId: z.string(),
      title: z.string(),
      taskCount: z.number().int().nonnegative(),
      wipLimit: z.number().int().nullable(),
      reason: z.string(),
    }),
  ),
  overdueTasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      dueDate: z.string(),
      priority: z.enum(PRIORITY_VALUES),
      daysOverdue: z.number().int().nonnegative(),
    }),
  ),
  dueSoonTasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      dueDate: z.string(),
      priority: z.enum(PRIORITY_VALUES),
      daysRemaining: z.number().int().nonnegative(),
    }),
  ),
  priorityBottlenecks: z.array(
    z.object({
      priority: z.enum(PRIORITY_VALUES),
      count: z.number().int().nonnegative(),
      columnTitle: z.string(),
    }),
  ),
  recommendations: z.array(z.string()).min(2).max(6),
  metrics: z.object({
    totalTasks: z.number().int().nonnegative(),
    completedTasks: z.number().int().nonnegative(),
    totalEstimatedHoursRemaining: z.number().nonnegative(),
    urgentOrHighOpen: z.number().int().nonnegative(),
  }),
});

export type BoardInsightsResult = z.infer<typeof BoardInsightsResultSchema>;

const LlmDecomposePayloadSchema = z.object({
  summary: z.string().min(5),
  tasks: z.array(DecomposedTaskItemSchema).min(4).max(6),
});

interface HeuristicRule {
  keywords: string[];
  summary: string;
  tasks: Array<z.infer<typeof DecomposedTaskItemSchema>>;
}

const HEURISTIC_RULES: HeuristicRule[] = [
  {
    keywords: ["stripe", "pago", "pagos", "billing", "checkout", "suscrip"],
    summary:
      "Plan técnico en 5 entregables para habilitar cobros seguros con Stripe, webhooks idempotentes y pruebas end-to-end.",
    tasks: [
      {
        title: "Modelar planes, precios y tabla de suscripciones",
        description:
          "Definir productos en Stripe Dashboard y mapear customerId, subscriptionStatus y periodEnd en base de datos.",
        priority: "High",
        estimatedHours: 4,
        subtasks: [
          "Crear productos Monthly/Annual en modo test",
          "Agregar columnas billing en esquema de usuarios",
          "Documentar estados trialing, active y past_due",
        ],
      },
      {
        title: "Implementar endpoint POST /api/billing/checkout",
        description:
          "Generar Checkout Session autenticada con success_url, cancel_url y metadata del tenant.",
        priority: "Urgent",
        estimatedHours: 5,
        subtasks: [
          "Validar payload con Zod",
          "Reutilizar Stripe Customer si ya existe",
          "Redirigir desde UI con estado loading",
        ],
      },
      {
        title: "Webhook firmado e idempotente de Stripe",
        description:
          "Verificar cabecera Stripe-Signature y procesar checkout.session.completed e invoice.payment_failed.",
        priority: "Urgent",
        estimatedHours: 6,
        subtasks: [
          "Leer raw body sin alterar firma criptográfica",
          "Registrar event.id para evitar reprocesos",
          "Actualizar permisos de plan en transacción",
        ],
      },
      {
        title: "Portal de facturación y gestión de cancelación",
        description:
          "Permitir actualizar tarjeta, descargar facturas PDF y cancelar o reactivar suscripción.",
        priority: "Medium",
        estimatedHours: 3.5,
        subtasks: [
          "Crear sesión de Stripe Billing Portal",
          "Mostrar banner preventivo ante pagos fallidos",
        ],
      },
      {
        title: "Suite de pruebas con Stripe CLI y casos borde",
        description:
          "Simular webhooks duplicados, firmas inválidas y expiración de tarjeta antes de producción.",
        priority: "High",
        estimatedHours: 4,
        subtasks: [
          "Test unitario de verificación de firma",
          "Test de idempotencia ante eventos repetidos",
          "Checklist de variables live vs test",
        ],
      },
    ],
  },
  {
    keywords: [
      "auth",
      "login",
      "oauth",
      "seguridad",
      "jwt",
      "sesión",
      "sesion",
    ],
    summary:
      "Desglose enfocado en autenticación robusta, control de sesiones, RBAC y endurecimiento OWASP.",
    tasks: [
      {
        title: "Diseñar flujo de autenticación y esquema de sesiones",
        description:
          "Definir tokens HttpOnly, rotación de refresh tokens y expiración controlada por dispositivo.",
        priority: "Urgent",
        estimatedHours: 5,
        subtasks: [
          "Configurar cookies Secure, HttpOnly y SameSite=Lax",
          "Implementar revocación en cierre de sesión",
        ],
      },
      {
        title: "Integrar proveedor OAuth2 + fallback credenciales",
        description:
          "Habilitar login social con verificación PKCE y hash Argon2/bcrypt para contraseñas locales.",
        priority: "High",
        estimatedHours: 6,
        subtasks: [
          "Validar state anti-CSRF en callback OAuth",
          "Normalizar emails y vincular cuentas existentes",
        ],
      },
      {
        title: "Middleware de autorización y roles (RBAC)",
        description:
          "Proteger rutas API y server actions verificando pertenencia al workspace antes de mutar datos.",
        priority: "Urgent",
        estimatedHours: 4,
        subtasks: [
          "Centralizar guard requireWorkspaceRole()",
          "Responder 403 consistente sin filtrar detalles",
        ],
      },
      {
        title: "Rate limiting y auditoría de intentos fallidos",
        description:
          "Mitigar fuerza bruta en endpoints de acceso con backoff progresivo y logs estructurados.",
        priority: "Medium",
        estimatedHours: 3,
        subtasks: [
          "Limitar intentos por IP + cuenta",
          "Añadir tests de bloqueo temporal",
        ],
      },
    ],
  },
  {
    keywords: ["ia", "ai", "llm", "agente", "rag", "prompt", "modelo"],
    summary:
      "Arquitectura de capacidades de IA con validación estricta de contratos JSON, timeouts y fallback determinista.",
    tasks: [
      {
        title: "Definir contratos Zod de entrada y salida estructurada",
        description:
          "Garantizar respuestas tipadas del modelo sin alucinaciones de formato ni campos nulos inesperados.",
        priority: "Urgent",
        estimatedHours: 3.5,
        subtasks: [
          "Crear schemas Zod con límites min/max",
          "Mapear errores de validación a fallback seguro",
        ],
      },
      {
        title: "Cliente multi-proveedor con timeout AbortSignal",
        description:
          "Soportar OpenAI y Gemini con timeout de 8s, manejo de rate limits y degradación elegante.",
        priority: "High",
        estimatedHours: 5,
        subtasks: [
          "Configurar AbortSignal.timeout(8000)",
          "Detectar proveedor activo según variables de entorno",
        ],
      },
      {
        title: "Motor heurístico local para modo demo sin API key",
        description:
          "Asegurar experiencia interactiva inmediata offline con respuestas contextuales de alta calidad.",
        priority: "High",
        estimatedHours: 4,
        subtasks: [
          "Implementar clasificación por dominio",
          "Mostrar badge transparente de modo activo en UI",
        ],
      },
      {
        title: "Evaluación de calidad y pruebas de regresión",
        description:
          "Verificar con Vitest que tanto salidas LLM simuladas como heurísticas cumplen el esquema.",
        priority: "Medium",
        estimatedHours: 3,
        subtasks: [
          "Testear respuestas malformadas del proveedor",
          "Validar latencia y consistencia de métricas",
        ],
      },
    ],
  },
];

function buildGenericDecomposition(goal: string): {
  summary: string;
  tasks: Array<z.infer<typeof DecomposedTaskItemSchema>>;
} {
  const cleanGoal = goal.trim();
  return {
    summary: `Desglose operativo en 5 fases para ejecutar "${cleanGoal}" de forma incremental y verificable.`,
    tasks: [
      {
        title: `Definir alcance técnico y criterios de éxito: ${cleanGoal.slice(0, 60)}`,
        description:
          "Aterrizar requisitos funcionales, contratos de API, bordes de error y métricas de aceptación antes de codificar.",
        priority: "High",
        estimatedHours: 3,
        subtasks: [
          "Documentar casos límite y dependencias",
          "Validar diseño con el equipo de producto",
        ],
      },
      {
        title: "Modelar persistencia y validaciones de entrada (Zod)",
        description:
          "Extender esquema de datos e invariantes de integridad asegurando compatibilidad hacia atrás.",
        priority: "Urgent",
        estimatedHours: 4.5,
        subtasks: [
          "Actualizar esquema y migración idempotente",
          "Agregar validación estricta en capa de servicio",
          "Verificar índices y consultas críticas",
        ],
      },
      {
        title: "Implementar lógica de negocio y endpoints principales",
        description:
          "Construir rutas API desacopladas con manejo explícito de errores y respuestas predecibles.",
        priority: "Urgent",
        estimatedHours: 6,
        subtasks: [
          "Implementar handler principal",
          "Añadir estados HTTP y mensajes accionables",
        ],
      },
      {
        title: "Construir interfaz reactiva accesible (Dark/Light)",
        description:
          "Conectar vistas con estados de carga, feedback optimista, accesibilidad ARIA y soporte móvil 375px.",
        priority: "High",
        estimatedHours: 5,
        subtasks: [
          "Crear componentes reutilizables con skeletons",
          "Verificar navegación por teclado y contraste",
        ],
      },
      {
        title: "Pruebas automatizadas y verificación pre-release",
        description:
          "Cubrir casos felices, bordes y regresiones con Vitest, typecheck estricto y build de producción.",
        priority: "Medium",
        estimatedHours: 3.5,
        subtasks: [
          "Escribir tests unitarios e integración",
          "Ejecutar typecheck, lint y build final",
        ],
      },
    ],
  };
}

function runLocalDecomposeHeuristic(goal: string): {
  summary: string;
  tasks: Array<z.infer<typeof DecomposedTaskItemSchema>>;
} {
  const normalized = goal.toLowerCase();
  const matched = HEURISTIC_RULES.find((rule) =>
    rule.keywords.some((kw) => normalized.includes(kw)),
  );
  if (matched) {
    return { summary: matched.summary, tasks: matched.tasks };
  }
  return buildGenericDecomposition(goal);
}

async function callOpenAiJson(prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Eres un Staff Product Engineer. Responde únicamente JSON válido en español.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? null;
}

async function callGeminiJson(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function tryExternalLlmDecompose(goal: string): Promise<{
  mode: "OpenAI" | "Gemini";
  summary: string;
  tasks: Array<z.infer<typeof DecomposedTaskItemSchema>>;
} | null> {
  const prompt = `Descompón este objetivo de producto en 4 a 6 tareas concretas de Kanban: "${goal}".
Devuelve JSON exacto con:
{
  "summary": "resumen ejecutivo breve",
  "tasks": [
    {
      "title": "...",
      "description": "...",
      "priority": "Urgent" | "High" | "Medium" | "Low",
      "estimatedHours": number,
      "subtasks": ["...", "..."]
    }
  ]
}`;

  try {
    if (process.env.OPENAI_API_KEY?.trim()) {
      const raw = await callOpenAiJson(prompt);
      if (raw) {
        const parsed = LlmDecomposePayloadSchema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          return { mode: "OpenAI", ...parsed.data };
        }
      }
    }
    if (process.env.GEMINI_API_KEY?.trim()) {
      const raw = await callGeminiJson(prompt);
      if (raw) {
        const parsed = LlmDecomposePayloadSchema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          return { mode: "Gemini", ...parsed.data };
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function decomposeGoal(
  rawInput: z.input<typeof DecomposeRequestSchema>,
): Promise<DecomposeResult> {
  const input = DecomposeRequestSchema.parse(rawInput);
  const external = await tryExternalLlmDecompose(input.goal);
  const mode: AiMode = external ? external.mode : "Demo AI local";
  const payload = external ?? runLocalDecomposeHeuristic(input.goal);

  const createdTaskIds: string[] = [];
  if (input.persist) {
    const boardData = await getBoardData(input.boardId);
    const targetColumnId =
      input.columnId && boardData.columns.some((c) => c.id === input.columnId)
        ? input.columnId
        : boardData.columns[0]?.id;

    if (!targetColumnId) {
      throw new Error("No target column available on board");
    }

    for (const item of payload.tasks) {
      const created = await createTask({
        boardId: boardData.board.id,
        columnId: targetColumnId,
        title: item.title,
        description: item.description,
        priority: item.priority,
        estimatedHours: item.estimatedHours,
        subtasks: item.subtasks,
      });
      createdTaskIds.push(created.id);
    }
  }

  return DecomposeResultSchema.parse({
    mode,
    goal: input.goal,
    summary: payload.summary,
    tasks: payload.tasks,
    persisted: input.persist,
    createdTaskIds,
  });
}

function diffDaysIso(laterIso: string, earlierIso: string): number {
  const a = new Date(`${laterIso}T00:00:00Z`).getTime();
  const b = new Date(`${earlierIso}T00:00:00Z`).getTime();
  return Math.round((a - b) / 86_400_000);
}

function isDoneColumn(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes("complet") ||
    lower.includes("done") ||
    lower.includes("terminad")
  );
}

function computeInsightsFromBoard(
  boardData: BoardPayload,
  referenceDateIso: string,
): Omit<BoardInsightsResult, "mode"> {
  const tasksByColumn = new Map<string, TaskDTO[]>();
  for (const col of boardData.columns) {
    tasksByColumn.set(col.id, []);
  }
  for (const task of boardData.tasks) {
    const list = tasksByColumn.get(task.columnId);
    if (list) list.push(task);
  }

  const overloadedColumns = boardData.columns
    .map((col) => {
      const count = tasksByColumn.get(col.id)?.length ?? 0;
      const exceedsWip = col.wipLimit !== null && count > col.wipLimit;
      const exceedsSoftCap = !isDoneColumn(col.title) && count > 4;
      if (!exceedsWip && !exceedsSoftCap) return null;
      const reason = exceedsWip
        ? `Supera límite WIP (${count}/${col.wipLimit})`
        : `Acumulación alta (${count} tareas activas)`;
      return {
        columnId: col.id,
        title: col.title,
        taskCount: count,
        wipLimit: col.wipLimit,
        reason,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const doneColIds = new Set(
    boardData.columns.filter((c) => isDoneColumn(c.title)).map((c) => c.id),
  );
  const colTitleMap = new Map(boardData.columns.map((c) => [c.id, c.title]));

  const overdueTasks: BoardInsightsResult["overdueTasks"] = [];
  const dueSoonTasks: BoardInsightsResult["dueSoonTasks"] = [];
  let totalEstimatedHoursRemaining = 0;
  let urgentOrHighOpen = 0;

  for (const task of boardData.tasks) {
    const isDone = doneColIds.has(task.columnId);
    if (isDone) continue;

    totalEstimatedHoursRemaining += task.estimatedHours ?? 0;
    if (task.priority === "Urgent" || task.priority === "High") {
      urgentOrHighOpen += 1;
    }

    if (!task.dueDate) continue;
    const delta = diffDaysIso(task.dueDate, referenceDateIso);
    if (delta < 0) {
      overdueTasks.push({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        priority: task.priority,
        daysOverdue: Math.abs(delta),
      });
    } else if (delta <= 3) {
      dueSoonTasks.push({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        priority: task.priority,
        daysRemaining: delta,
      });
    }
  }

  const priorityBottlenecks: BoardInsightsResult["priorityBottlenecks"] = [];
  for (const col of boardData.columns) {
    if (doneColIds.has(col.id)) continue;
    const colTasks = tasksByColumn.get(col.id) ?? [];
    const urgentCount = colTasks.filter((t) => t.priority === "Urgent").length;
    if (urgentCount >= 2) {
      priorityBottlenecks.push({
        priority: "Urgent",
        count: urgentCount,
        columnTitle: colTitleMap.get(col.id) ?? col.title,
      });
    }
  }

  const completedTasks = boardData.tasks.filter((t) =>
    doneColIds.has(t.columnId),
  ).length;
  const penalty =
    overloadedColumns.length * 14 +
    overdueTasks.length * 9 +
    priorityBottlenecks.length * 10;
  const healthScore = Math.max(25, Math.min(100, 96 - penalty));

  const recommendations: string[] = [];
  const topOverloaded = overloadedColumns[0];
  if (topOverloaded) {
    recommendations.push(
      `Descongestiona "${topOverloaded.title}" (${topOverloaded.reason}) moviendo tareas bloqueadas o cerrando subtareas pendientes.`,
    );
  }
  const firstOverdue = overdueTasks[0];
  if (firstOverdue) {
    recommendations.push(
      `Prioriza las ${overdueTasks.length} tareas vencidas, empezando por "${firstOverdue.title}".`,
    );
  }
  const topBottleneck = priorityBottlenecks[0];
  if (topBottleneck) {
    recommendations.push(
      `Divide o reasigna las ${topBottleneck.count} tareas Urgent concentradas en "${topBottleneck.columnTitle}" para evitar cuello de botella.`,
    );
  }
  if (dueSoonTasks.length > 0) {
    recommendations.push(
      `Revisa hoy ${dueSoonTasks.length} entregables con vencimiento en los próximos 3 días.`,
    );
  }
  if (recommendations.length < 2) {
    recommendations.push(
      "Mantén el límite WIP activo por columna para sostener el ritmo de entregas semanales.",
      "Usa 'Desglosar con IA' sobre épicas grandes del Backlog para mantener estimaciones <= 8h.",
    );
  }

  const summary = `Tablero "${boardData.board.title}" al ${Math.round((completedTasks / Math.max(1, boardData.tasks.length)) * 100)}% completado (${completedTasks}/${boardData.tasks.length} tareas). Detectadas ${overloadedColumns.length} columna(s) sobrecargada(s), ${overdueTasks.length} vencida(s) y ${totalEstimatedHoursRemaining.toFixed(1)}h restantes.`;

  return {
    healthScore,
    summary,
    overloadedColumns,
    overdueTasks,
    dueSoonTasks,
    priorityBottlenecks,
    recommendations: recommendations.slice(0, 5),
    metrics: {
      totalTasks: boardData.tasks.length,
      completedTasks,
      totalEstimatedHoursRemaining: Number(
        totalEstimatedHoursRemaining.toFixed(1),
      ),
      urgentOrHighOpen,
    },
  };
}

export async function generateBoardInsights(
  boardId?: string,
  referenceDateIso = new Date().toISOString().slice(0, 10),
): Promise<BoardInsightsResult> {
  const boardData = await getBoardData(boardId);
  const deterministic = computeInsightsFromBoard(boardData, referenceDateIso);

  let mode: AiMode = "Demo AI local";
  let summary = deterministic.summary;

  if (
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim()
  ) {
    const prompt = `Redacta un resumen ejecutivo conciso (máximo 2 frases) en español para este tablero Kanban:
${JSON.stringify({
  board: boardData.board.title,
  metrics: deterministic.metrics,
  overloadedColumns: deterministic.overloadedColumns,
  overdueCount: deterministic.overdueTasks.length,
})}
Responde JSON: { "summary": "..." }`;
    try {
      const raw = process.env.OPENAI_API_KEY?.trim()
        ? await callOpenAiJson(prompt)
        : await callGeminiJson(prompt);
      if (raw) {
        const parsed = z
          .object({ summary: z.string().min(10) })
          .safeParse(JSON.parse(raw));
        if (parsed.success) {
          mode = process.env.OPENAI_API_KEY?.trim() ? "OpenAI" : "Gemini";
          summary = parsed.data.summary;
        }
      }
    } catch {
      // Keep deterministic local summary on timeout or provider error.
    }
  }

  return BoardInsightsResultSchema.parse({
    ...deterministic,
    mode,
    summary,
  });
}
