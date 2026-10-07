import React from "react";
import { PRIORITIES } from "../task-data.js";

export default function TaskItem({ task, onToggle, onDelete }) {
  return <li className={task.done ? "completed task-row" : "task-row"}>
    <label><input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} /><span className="task-text">{task.text}</span></label>
    <div className="task-meta"><span className={`priority priority-${task.priority}`}>{PRIORITIES[task.priority]}</span>{task.due && <time dateTime={task.due}>{new Date(task.due + "T12:00:00").toLocaleDateString("hy-AM")}</time>}</div>
    <button type="button" onClick={() => onDelete(task.id)} aria-label={`Ջնջել՝ ${task.text}`}>×</button>
  </li>;
}
