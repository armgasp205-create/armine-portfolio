import React, { useState } from "react";
import { usePlanner } from "../PlannerContext.jsx";
import { MAX_TASKS, PRIORITIES } from "../task-data.js";
import TaskForm from "../components/TaskForm.jsx";
import TaskItem from "../components/TaskItem.jsx";

export default function TasksPage() {
  const { tasks, addTask, toggleTask, deleteTask } = usePlanner();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const completed = tasks.filter(task => task.done).length;
  const visible = tasks.filter(task => (filter === "all" || (filter === "done" ? task.done : !task.done)) && (priority === "all" || task.priority === priority) && task.text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <section>
    <h1>Իմ առաջադրանքները</h1><p>Պլանավորիր, ընտրիր կարևորությունը և հետևիր առաջընթացին։</p>
    <TaskForm disabled={tasks.length >= MAX_TASKS} onAdd={task => { addTask(task); setFilter("all"); setPriority("all"); setQuery(""); }} />
    <div className="filters" aria-label="Առաջադրանքների զտիչներ">{[["all", "Բոլորը"], ["active", "Ընթացիկ"], ["done", "Ավարտված"]].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <div className="search-tools"><input type="search" aria-label="Որոնել առաջադրանքներ" placeholder="Որոնել առաջադրանքներ…" value={query} onChange={event => setQuery(event.target.value)} /><select aria-label="Զտել ըստ կարևորության" value={priority} onChange={event => setPriority(event.target.value)}><option value="all">Բոլոր կարևորությունները</option>{Object.entries(PRIORITIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <p role="status">{completed} / {tasks.length} ավարտված · ցուցադրված՝ {visible.length}</p><progress value={completed} max={tasks.length || 1} aria-label="Ավարտված առաջադրանքներ" />
    <ul>{visible.map(task => <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />)}</ul>
    {!visible.length && <p className="empty">Այս ցանկում առաջադրանքներ չկան։</p>}
  </section>;
}
