import React, { useState } from "react";
import { PRIORITIES } from "../task-data.js";

export default function TaskForm({ onAdd, disabled }) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("medium");
  const [due, setDue] = useState("");
  const [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    if (!text.trim()) { setError("Գրիր առաջադրանքի նկարագրությունը։"); return; }
    if (disabled) return;
    onAdd({ text, priority, due });
    setText(""); setDue(""); setPriority("medium"); setError("");
  }
  return <form className="task-form" onSubmit={submit}>
    <div className="field task-text-field"><label htmlFor="task-text">Առաջադրանք</label><input id="task-text" value={text} onChange={event => setText(event.target.value)} placeholder="Ի՞նչ ես ուզում անել" maxLength={120} required aria-describedby={error ? "form-error" : undefined} /></div>
    <div className="field"><label htmlFor="task-priority">Կարևորություն</label><select id="task-priority" value={priority} onChange={event => setPriority(event.target.value)}>{Object.entries(PRIORITIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div className="field"><label htmlFor="task-due">Ժամկետ՝ ըստ ցանկության</label><input id="task-due" type="date" value={due} onChange={event => setDue(event.target.value)} /></div>
    <button className="primary" disabled={disabled}>Ավելացնել</button>
    {error && <p id="form-error" role="alert">{error}</p>}
    {disabled && <p role="status">Հասել ես 100 առաջադրանքի սահմանին։</p>}
  </form>;
}
