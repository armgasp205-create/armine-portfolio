import React, { useEffect, useState } from "react";
import { usePlanner } from "../PlannerContext.jsx";
import { fetchExampleTasks, MAX_TASKS } from "../task-data.js";

export default function ExamplesPage() {
  const { tasks, importExample } = usePlanner();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ loading: false, error: "", items: [] });
  useEffect(() => {
    if (!attempt) return;
    const controller = new AbortController();
    let active = true, timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
    setResult({ loading: true, error: "", items: [] });
    fetchExampleTasks(controller.signal).then(items => { if (active) setResult({ loading: false, error: "", items }); })
      .catch(error => { if (active) setResult({ loading: false, items: [], error: timedOut ? "Հարցումը երկար տևեց։ Փորձիր կրկին։" : error.name === "TypeError" ? "Կապի խնդիր կա։ Ստուգիր ինտերնետը և փորձիր կրկին։" : error.message }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  return <section><h1>Առաջադրանքների օրինակներ</h1><p>Բեռնիր անգլերեն ցուցադրական առաջադրանքներ DummyJSON-ից։ Ընտրված օրինակը կավելանա քո տեղական ցանկին։ Քո առաջադրանքներն այս ծառայությանը չեն ուղարկվում։</p>
    <button className="primary" disabled={result.loading} onClick={() => setAttempt(value => value + 1)}>{result.loading ? "Բեռնվում է…" : attempt ? "Բեռնել կրկին" : "Բեռնել օրինակներ"}</button>
    <div role="status">{result.loading && <p>Սպասիր՝ օրինակները բեռնվում են։</p>}{result.error && <p className="error">{result.error}</p>}</div>
    <ul aria-busy={result.loading}>{result.items.map(example => {
      const imported = tasks.some(task => task.sourceId === example.id);
      return <li key={example.id}><span className="example-text">{example.todo}</span><button disabled={imported || tasks.length >= MAX_TASKS} onClick={() => importExample(example)}>{imported ? "Ավելացված է" : "Ավելացնել իմ ցանկին"}</button></li>;
    })}</ul>
    {tasks.length >= MAX_TASKS && <p role="status">Հասել ես 100 առաջադրանքի սահմանին։</p>}
  </section>;
}
