import React from "react";
import { usePlanner } from "../PlannerContext.tsx";

export default function StatsPage() {
  const { tasks } = usePlanner();
  const completed = tasks.filter(task => task.done).length;
  const important = tasks.filter(task => !task.done && task.priority === "high").length;
  return <section><h1>Իմ առաջընթացը</h1><p>Ցուցանիշները հաշվարկվում են քո առաջադրանքներից և անմիջապես թարմացվում են։</p>
    <div className="stats-grid">{[["Բոլոր առաջադրանքները", tasks.length], ["Ավարտված", completed], ["Ընթացիկ", tasks.length - completed], ["Բարձր կարևորությամբ անելիքներ", important]].map(([label, count]) => <article className="metric" key={label}><strong>{count}</strong><p>{label}</p></article>)}</div>
    <p>Ավարտված է՝ {tasks.length ? Math.round(completed / tasks.length * 100) : 0}%</p><progress value={completed} max={tasks.length || 1} aria-label="Ընդհանուր առաջընթաց" />
  </section>;
}
