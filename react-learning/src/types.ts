// Union types: values must be one of these named options.
export type Priority = "low" | "medium" | "high";
export type TaskFilter = "all" | "active" | "done";
export type PriorityFilter = Priority | "all";
export type Theme = "light" | "dark";

// Interfaces describe objects. Task[] is an array of these objects.
export interface Task {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  due: string;
  sourceId?: number; // Optional: only imported tasks have a source ID.
}

export type NewTask = Pick<Task, "text" | "priority" | "due">;

export interface ExampleTask {
  id: number;
  todo: string;
  completed: boolean;
}

// A discriminated union describes valid API states.
export type ApiResult =
  | { status: "idle" | "loading" }
  | { status: "success"; items: ExampleTask[] }
  | { status: "error"; message: string };

export interface PlannerContextValue {
  tasks: Task[];
  theme: Theme;
  notice: string;
  addTask: (task: NewTask) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  importExample: (task: ExampleTask) => void;
  toggleTheme: () => void;
}
