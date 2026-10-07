import type { ExampleTask, Priority, Task } from "./types.ts";

export const STORAGE_KEY: string = "armine-react-tasks";
export const MAX_TASKS: number = 100;
export const PRIORITIES: Record<Priority, string> = { low: "Ցածր", medium: "Միջին", high: "Բարձր" };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isPriority(value: unknown): value is Priority {
  return value === "low" || value === "medium" || value === "high";
}

// Saved and API data remain unknown until validated at runtime.
export function normalizeTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) return [];
  const tasks: Task[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!isObject(item) || typeof item.id !== "string" || typeof item.text !== "string" || !item.text.trim() || typeof item.done !== "boolean" || seen.has(item.id)) continue;
    seen.add(item.id);
    const task: Task = { id: item.id, text: item.text.trim().slice(0, 120), done: item.done, priority: isPriority(item.priority) ? item.priority : "medium", due: typeof item.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.due) ? item.due : "" };
    if (typeof item.sourceId === "number" && Number.isInteger(item.sourceId)) task.sourceId = item.sourceId;
    tasks.push(task);
    if (tasks.length >= MAX_TASKS) break;
  }
  return tasks;
}

export function importTask(tasks: Task[], example: ExampleTask, id: string): Task[] {
  if (tasks.length >= MAX_TASKS || tasks.some(task => task.sourceId === example.id)) return tasks;
  return [...tasks, { id, text: example.todo.slice(0, 120), done: example.completed, priority: "medium", due: "", sourceId: example.id }];
}

export async function fetchExampleTasks(signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<ExampleTask[]> {
  const response = await fetcher("https://dummyjson.com/todos?limit=6", { signal });
  if (!response.ok) throw new Error("Ծառայությունը չի պատասխանում։ Փորձիր կրկին։");
  const data: unknown = await response.json();
  if (!isObject(data) || !Array.isArray(data.todos)) throw new Error("API-ի պատասխանի ձևաչափը սխալ է։");
  const tasks: ExampleTask[] = [];
  for (const item of data.todos) {
    if (isObject(item) && typeof item.id === "number" && Number.isInteger(item.id) && typeof item.todo === "string" && item.todo.trim() && typeof item.completed === "boolean") tasks.push({ id: item.id, todo: item.todo, completed: item.completed });
  }
  if (!tasks.length) throw new Error("API-ն առաջադրանքներ չվերադարձրեց։");
  return tasks.slice(0, 6);
}
