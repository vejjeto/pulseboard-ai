import type { Priority } from "@/db/schema";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

export interface LabelDTO {
  id: string;
  name: string;
  color: string;
}

export interface SubtaskDTO {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
}

export interface ColumnDTO {
  id: string;
  boardId: string;
  title: string;
  position: number;
  wipLimit: number | null;
}

export interface TaskDTO {
  id: string;
  boardId: string;
  columnId: string;
  assigneeId: string | null;
  assignee: UserDTO | null;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  estimatedHours: number | null;
  position: number;
  createdAt: string;
  subtasks: SubtaskDTO[];
  labels: LabelDTO[];
}

export interface BoardDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface BoardPayload {
  board: BoardDTO;
  users: UserDTO[];
  labels: LabelDTO[];
  columns: ColumnDTO[];
  tasks: TaskDTO[];
}
