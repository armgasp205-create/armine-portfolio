import { normalizeTasks } from "./task-data.ts";
import type { Task } from "./types.ts";

export const dataKeys = ["armine-react-tasks", "armine-expenses-v1", "armine-monthly-budgets-v1"] as const;
interface Expense { id: string; title: string; amount: number; category: string; date: string }
export interface Snapshot { tasks: Task[]; expenses: Expense[]; budgets: Record<string, number> }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
export function validateSnapshot(value: unknown): Snapshot {
  if (!object(value) || !Array.isArray(value.tasks) || !Array.isArray(value.expenses) || !object(value.budgets)) throw new Error("Տվյալների ձևաչափը սխալ է։");
  const tasks = normalizeTasks(value.tasks);
  if (tasks.length !== value.tasks.length) throw new Error("Առաջադրանքների տվյալները վնասված են։");
  if (value.expenses.length > 1000) throw new Error("Ծախսերի քանակը գերազանցում է սահմանը։");
  const expenses: Expense[] = [];
  const ids = new Set<string>();
  for (const item of value.expenses) {
    if (!object(item) || typeof item.id !== "string" || ids.has(item.id) || typeof item.title !== "string" || !item.title.trim() || item.title.length > 120 || typeof item.amount !== "number" || !Number.isSafeInteger(item.amount) || item.amount <= 0 || item.amount > 100000000000 || typeof item.category !== "string" || !["Սնունդ", "Տրանսպորտ", "Գնումներ", "Այլ"].includes(item.category) || typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) throw new Error("Ծախսերի տվյալները վնասված են։");
    ids.add(item.id);
    expenses.push({ id: item.id, title: item.title, amount: item.amount, category: item.category, date: item.date });
  }
  const budgets: Record<string, number> = {};
  for (const [month, amount] of Object.entries(value.budgets)) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000000) throw new Error("Բյուջեի տվյալները վնասված են։");
    budgets[month] = amount;
  }
  return { tasks, expenses, budgets };
}
export function readSnapshot(storage: Pick<Storage, "getItem"> = localStorage): Snapshot {
  return validateSnapshot({ tasks: JSON.parse(storage.getItem(dataKeys[0]) || "[]"), expenses: JSON.parse(storage.getItem(dataKeys[1]) || "[]"), budgets: JSON.parse(storage.getItem(dataKeys[2]) || "{}") });
}
export function restoreSnapshot(snapshot: unknown, storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = localStorage): void {
  const data = validateSnapshot(snapshot);
  const previous = dataKeys.map(key => storage.getItem(key));
  try {
    [data.tasks, data.expenses, data.budgets].forEach((value, index) => storage.setItem(dataKeys[index], JSON.stringify(value)));
  } catch (error) {
    previous.forEach((value, index) => { if (value === null) storage.removeItem(dataKeys[index]); else storage.setItem(dataKeys[index], value); });
    throw error;
  }
}
