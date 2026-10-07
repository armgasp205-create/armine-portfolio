export const STORAGE_KEY = "armine-react-tasks";
export const MAX_TASKS = 100;
export const PRIORITIES = { low: "Ցածր", medium: "Միջին", high: "Բարձր" };

export function normalizeTasks(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter(task => task && typeof task.id === "string" && typeof task.text === "string" && task.text.trim() && typeof task.done === "boolean" && !seen.has(task.id) && seen.add(task.id))
    .slice(0, MAX_TASKS).map(task => ({ id: task.id, text: task.text.trim().slice(0, 120), done: task.done, priority: Object.hasOwn(PRIORITIES, task.priority) ? task.priority : "medium", due: typeof task.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.due) ? task.due : "", ...(Number.isInteger(task.sourceId) ? { sourceId: task.sourceId } : {}) }));
}

export function importTask(tasks, example, id) {
  if (tasks.length >= MAX_TASKS || tasks.some(task => task.sourceId === example.id)) return tasks;
  return [...tasks, { id, text: example.todo.slice(0, 120), done: example.completed, priority: "medium", due: "", sourceId: example.id }];
}

export async function fetchExampleTasks(signal, fetcher = fetch) {
  const response = await fetcher("https://dummyjson.com/todos?limit=6", { signal });
  if (!response.ok) throw new Error("Ծառայությունը չի պատասխանում։ Փորձիր կրկին։");
  const data = await response.json();
  if (!Array.isArray(data.todos)) throw new Error("API-ի պատասխանի ձևաչափը սխալ է։");
  const tasks = data.todos.filter(task => Number.isInteger(task.id) && typeof task.todo === "string" && task.todo.trim() && typeof task.completed === "boolean");
  if (!tasks.length) throw new Error("API-ն առաջադրանքներ չվերադարձրեց։");
  return tasks.slice(0, 6);
}
