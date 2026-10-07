import React, { useEffect, useState } from "react";
import { usePlanner } from "../PlannerContext.tsx";
import { fetchExampleTasks, MAX_TASKS } from "../task-data.ts";
import type { ApiResult } from "../types.ts";

export default function ExamplesPage() {
  const { tasks, importExample } = usePlanner();
  const [attempt, setAttempt] = useState<number>(0);
  const [result, setResult] = useState<ApiResult>({ status: "idle" });
  useEffect(() => {
    if (!attempt) return;
    const controller = new AbortController();
    let active: boolean = true, timedOut: boolean = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
    setResult({ status: "loading" });
    fetchExampleTasks(controller.signal).then(items => { if (active) setResult({ status: "success", items }); })
      .catch((error: unknown) => {
        if (!active) return;
        const message = timedOut ? "Հարցումը երկար տևեց։ Փորձիր կրկին։" : error instanceof TypeError ? "Կապի խնդիր կա։ Ստուգիր ինտերնետը և փորձիր կրկին։" : error instanceof Error ? error.message : "Անսպասելի սխալ։ Փորձիր կրկին։";
        setResult({ status: "error", message });
      }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  const loading: boolean = result.status === "loading";
  return <section><h1>Առաջադրանքների օրինակներ</h1><p>Բեռնիր անգլերեն ցուցադրական առաջադրանքներ DummyJSON-ից։ Ընտրված օրինակը կավելանա քո տեղական ցանկին։ Քո առաջադրանքներն այս ծառայությանը չեն ուղարկվում։</p>
    <button className="primary" disabled={loading} onClick={() => setAttempt(value => value + 1)}>{loading ? "Բեռնվում է…" : attempt ? "Բեռնել կրկին" : "Բեռնել օրինակներ"}</button>
    <div role="status">{loading && <p>Սպասիր՝ օրինակները բեռնվում են։</p>}{result.status === "error" && <p className="error">{result.message}</p>}</div>
    <ul aria-busy={loading}>{result.status === "success" && result.items.map(example => {
      const imported = tasks.some(task => task.sourceId === example.id);
      return <li key={example.id}><span className="example-text">{example.todo}</span><button disabled={imported || tasks.length >= MAX_TASKS} onClick={() => importExample(example)}>{imported ? "Ավելացված է" : "Ավելացնել իմ ցանկին"}</button></li>;
    })}</ul>
    {tasks.length >= MAX_TASKS && <p role="status">Հասել ես 100 առաջադրանքի սահմանին։</p>}
  </section>;
}