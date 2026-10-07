import React, { createContext, useContext, useEffect, useState } from "react";
import { STORAGE_KEY, MAX_TASKS, normalizeTasks, importTask } from "./task-data.js";

const PlannerContext = createContext(null);

export function PlannerProvider({ children }) {
  const [tasks, setTasks] = useState(() => {
    try { return normalizeTasks(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); }
    catch { return []; }
  });
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("react-planner-theme") === "light" ? "light" : "dark"; }
    catch { return "dark"; }
  });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); setNotice(""); }
    catch { setNotice("Պահպանումն անհասանելի է․ ցանկը կմնա միայն այս բացված էջում։"); }
  }, [tasks]);

  useEffect(() => {
    document.documentElement.dataset.plannerTheme = theme;
    try { localStorage.setItem("react-planner-theme", theme); } catch {}
    return () => { delete document.documentElement.dataset.plannerTheme; };
  }, [theme]);

  function addTask({ text, priority, due }) {
    if (!text.trim()) return;
    const task = { id: crypto.randomUUID(), text: text.trim().slice(0, 120), done: false, priority, due };
    setTasks(previous => previous.length < MAX_TASKS ? [...previous, task] : previous);
  }
  function toggleTask(id) { setTasks(previous => previous.map(task => task.id === id ? { ...task, done: !task.done } : task)); }
  function deleteTask(id) { setTasks(previous => previous.filter(task => task.id !== id)); }
  function importExample(example) { const id = crypto.randomUUID(); setTasks(previous => importTask(previous, example, id)); }

  return <PlannerContext.Provider value={{ tasks, theme, notice, addTask, toggleTask, deleteTask, importExample, toggleTheme: () => setTheme(value => value === "dark" ? "light" : "dark") }}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const value = useContext(PlannerContext);
  if (!value) throw new Error("usePlanner requires PlannerProvider");
  return value;
}
