import React, { useEffect, useState } from "react";

const storageKey = "armine-react-tasks";

function readTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(saved)
      ? saved.filter(task => task && typeof task.id === "string" && typeof task.text === "string" && typeof task.done === "boolean").slice(0, 100)
      : [];
  } catch { return []; }
}

// A component receives data and actions through props.
function TaskItem({ task, onToggle, onDelete }) {
  return (
    <li className={task.done ? "completed" : ""}>
      <label>
        <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} />
        <span>{task.text}</span>
      </label>
      <button type="button" onClick={() => onDelete(task.id)} aria-label={`Ջնջել՝ ${task.text}`}>×</button>
    </li>
  );
}

export default function App() {
  // State stores values whose changes should update the page.
  const [tasks, setTasks] = useState(readTasks);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");

  // Effects synchronize React state with browser storage.
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(tasks)); setNotice(""); }
    catch { setNotice("Բրաուզերը չի թույլատրում պահպանումը․ ցանկը կմնա միայն այս էջում։"); }
  }, [tasks]);

  function addTask(event) {
    event.preventDefault();
    if (!text.trim() || tasks.length >= 100) return;
    setTasks(previous => [...previous, { id: crypto.randomUUID(), text: text.trim(), done: false }]);
    setText("");
    setFilter("all");
  }

  function toggleTask(id) {
    setTasks(previous => previous.map(task => task.id === id ? { ...task, done: !task.done } : task));
  }

  function deleteTask(id) {
    setTasks(previous => previous.filter(task => task.id !== id));
  }

  const completed = tasks.filter(task => task.done).length;
  const visible = tasks.filter(task => filter === "all" || (filter === "done" ? task.done : !task.done));

  return (
    <main>
      <a className="back-link" href="/index.html#projects">← Պորտֆոլիո</a>
      <p className="eyebrow">REACT · ՈՒՍՈՒՄՆԱԿԱՆ ՆԱԽԱԳԻԾ</p>
      <h1>Իմ առաջադրանքները</h1>
      <p>Ավելացրու, ավարտիր և պահպանիր առաջադրանքներդ։</p>
      <form onSubmit={addTask}>
        <label htmlFor="task-text" className="sr-only">Նոր առաջադրանք</label>
        <input id="task-text" value={text} onChange={event => setText(event.target.value)} placeholder="Ի՞նչ ես ուզում անել" maxLength={120} required />
        <button disabled={tasks.length >= 100}>Ավելացնել</button>
      </form>
      <div className="filters" aria-label="Առաջադրանքների զտիչներ">
        {[["all", "Բոլորը"], ["active", "Ընթացիկ"], ["done", "Ավարտված"]].map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>
      <p role="status">{completed} / {tasks.length} ավարտված</p>
      <progress value={completed} max={tasks.length || 1} aria-label="Ավարտված առաջադրանքներ" />
      <ul>{visible.map(task => <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />)}</ul>
      {visible.length === 0 && <p className="empty">Այս ցանկում առաջադրանքներ չկան։</p>}
      {notice && <p role="status">{notice}</p>}
    </main>
  );
}
