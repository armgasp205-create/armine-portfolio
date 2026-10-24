import { backendHeaders } from "../backend-session.ts";
import { useAuth } from "../AuthContext.tsx";
import { supabase } from "../supabase.ts";
import { createCloudTaskApi } from "../cloud-tasks.ts";
﻿import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Task, Priority } from "../types.ts";

const priorities: Record<Priority,string> = {low:"Ցածր",medium:"Միջին",high:"Բարձր"};
const backendUrl = "http://127.0.0.1:3002/react-planner/#/backend";
const localBackend = !!document.querySelector('meta[name="portfolio-backend"]');
const cloud = !localBackend && supabase ? createCloudTaskApi(supabase) : null;
type BackendTask = Task & {deletedAt?:string};
type TaskList = {tasks:BackendTask[];pagination:{page:number;pages:number;limit:number;total:number};stats:{total:number;completed:number;active:number;trashed:number}};
async function api(path = "", method = "GET", body?: unknown) {
  if(cloud)return cloud.request(path,method,body);
  const response = await fetch(`/api/tasks${path}`, {method,headers:{...await backendHeaders(),...(body === undefined ? {} : {"Content-Type":"application/json"})},body:body === undefined ? undefined : JSON.stringify(body),signal:AbortSignal.timeout(10000),cache:"no-store"});
  if (!response.headers.get("content-type")?.includes("application/json")) {
    if (["localhost","127.0.0.1"].includes(window.location.hostname) && window.location.port !== "3002") window.location.replace(backendUrl);
    throw new Error("Այս տարբերակին Node.js սերվերը միացված չէ։");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Հարցումը չհաջողվեց։");
  return data;
}
export default function BackendPage() {
  const {session,loading:authLoading} = useAuth();
  const [tasks,setTasks] = useState<BackendTask[]>([]);
  const [view,setView] = useState("tasks");
  const [text,setText] = useState("");
  const [priority,setPriority] = useState<Priority>("medium");
  const [due,setDue] = useState("");
  const [deadline,setDeadline] = useState("all");
  const today = new Date().toLocaleDateString("en-CA");
  const [editing,setEditing] = useState<string | null>(null);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [connected,setConnected] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [query,setQuery] = useState("");
  const [status,setStatus] = useState("all");
  const [importance,setImportance] = useState("all");
  const [sort,setSort] = useState("newest");
  const [page,setPage] = useState(1);
  const [pagination,setPagination] = useState({page:1,pages:1,limit:5,total:0});
  const [stats,setStats] = useState({total:0,completed:0,active:0,trashed:0});
  const input = useRef<HTMLInputElement>(null);
  const requestNumber = useRef(0);
  const [importFile,setImportFile] = useState<File | null>(null);
  const fileInput=useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    const request = ++requestNumber.current;
    if(cloud && (authLoading || !session)) {setLoading(false);setConnected(false);return;}
    setLoading(true);setError("");
    const params = new URLSearchParams({q:query,status,priority:importance,sort,deadline,today,view,page:String(page),limit:"5"});
    try {
      const data:TaskList = await api(`?${params}`);
      if (request !== requestNumber.current) return;
      setTasks(data.tasks);setStats(data.stats);setPagination(data.pagination);setConnected(true);
      if(data.pagination.page !== page) setPage(data.pagination.page);
    } catch(error) {
      if(request !== requestNumber.current) return;
      setConnected(false);setError(error instanceof Error ? error.message : "Սերվերին միանալ չհաջողվեց։");
    } finally {if(request === requestNumber.current) setLoading(false);}
  },[query,status,importance,sort,deadline,today,page,view,session?.access_token,authLoading]);
  useEffect(() => { setTasks([]); setStats({total:0,completed:0,active:0,trashed:0}); setText(""); setEditing(null); },[session?.user.id]);
  useEffect(() => {
    // Ignore old responses as soon as search/filter selection changes.
    requestNumber.current += 1;
    setLoading(true);
    const timer = setTimeout(() => void load(),250);
    return () => {clearTimeout(timer);requestNumber.current += 1;};
  },[load]);
  async function mutate(path:string,method:string,body:unknown,success:string) {
    setBusy(true);setError("");setMessage("");
    try {
      await api(path,method,body);
      setMessage(success);
      await load();return true;
    } catch(error) {setError(error instanceof Error ? error.message : "Գործողությունը չհաջողվեց։");return false;}
    finally {setBusy(false);}
  }
  function resetFilters() {setQuery("");setStatus("all");setImportance("all");setSort("newest");setDeadline("all");setPage(1);}
  async function submit(event:FormEvent) {
    event.preventDefault();if(!text.trim() || busy) return;
    if(await mutate(editing ? `/${editing}` : "",editing ? "PATCH" : "POST",{text:text.trim(),priority,due},"Առաջադրանքը պահպանվել է սերվերում։")) {
      if(!editing) resetFilters();
      setText("");setPriority("medium");setDue("");setEditing(null);input.current?.focus();
    }
  }
  async function download(format:"json"|"csv") {
    setBusy(true);setError("");
    try {
      let blob:Blob;
      if(cloud)blob=await cloud.download(format,view);
      else {
        const response=await fetch(`/api/tasks/export?${new URLSearchParams({format,view})}`,{headers:await backendHeaders(),signal:AbortSignal.timeout(10000),cache:"no-store"});
        if(!response.ok) throw new Error("Չհաջողվեց ներբեռնել տվյալները։ Փորձիր կրկին։");
        blob=await response.blob();
      }
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");link.href=url;link.download=`planner-${view}.${format}`;
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage("Ներբեռնումը պատրաստ է։ Ֆայլը պարունակում է ընտրված բաժնի ամբողջ ցանկը։");
    } catch(error) {setError(error instanceof Error ? error.message : "Ներբեռնումը չհաջողվեց։");}
    finally {setBusy(false);}
  }
  async function importBackup(event:FormEvent) {
    event.preventDefault();if(!importFile || busy) return;
    setBusy(true);setError("");setMessage("");
    try {
      if(importFile.size>1024*1024) throw new Error("Ֆայլը չպետք է գերազանցի 1 ՄԲ-ը։");
      let backup:unknown;
      try {backup=JSON.parse((await importFile.text()).replace(/^\uFEFF/,""));}
      catch {throw new Error("Ֆայլը վավեր JSON չէ։ Ընտրիր ներբեռնված պատճենը։");}
      const result=await api("/import","POST",backup);
      setMessage(`Ներմուծվել է ${result.imported} առաջադրանք։ Կրկնության պատճառով բաց է թողնվել ${result.skipped}։`);
      setView(result.view);resetFilters();
      setImportFile(null);if(fileInput.current)fileInput.current.value="";
      await load();
    } catch(error) {setError(error instanceof Error ? error.message : "Ներմուծումը չհաջողվեց։");}
    finally {setBusy(false);}
  }
  if(cloud && (authLoading || !session))return <section><h1>Առցանց առաջադրանքներ</h1>{authLoading ? <p role="status">Ստուգվում է մուտքը…</p> : <><p>Մուտք գործիր կամ գրանցվիր՝ քո առաջադրանքները պահպանելու և այլ սարքից բացելու համար։</p><a href="#/account">Բացել իմ հաշիվը →</a></>}</section>;
  return <section>
    <p><a href="#/account">Մուտք / Իմ հաշիվը</a>{localBackend && <> · <a href="/backend-admin.html">Կառավարում</a></>}</p>
    <p className="eyebrow">{localBackend ? "NODE.JS + SQLITE" : "SUPABASE · ԱՌՑԱՆՑ ՊԱՀՊԱՆՈՒՄ"}</p>
    <h1>Սերվերում պահվող առաջադրանքներ</h1>
    <p className="page-description">Ավելացրածդ պահվում է {localBackend ? "տեղական" : "առցանց"} տվյալների բազայում։ {localBackend ? "Որոնումն ու զտումը նույնպես կատարում է սերվերը։" : "Քո հաշվի առաջադրանքները կարող ես բացել նաև այլ սարքից։"}</p>
    <div className="backend-connection"><strong>{loading ? "Բեռնվում է…" : connected ? "● Սերվերին միացված է" : "Սերվերի կապը հասանելի չէ"}</strong><button disabled={loading || busy} onClick={() => void load()}>Թարմացնել ցանկը</button></div>
    <section className="backend-export" aria-labelledby="export-title"><h2 id="export-title">Ներբեռնել տվյալները</h2><p>Ներբեռնում է {view === "trash" ? "աղբարկղի" : "հիմնական բաժնի"} ամբողջ ցանկը՝ անկախ որոնումից և էջից։ JSON-ը տվյալների պատճենն է, CSV-ն՝ աղյուսակի համար։</p><div className="filters"><button disabled={!connected || loading || busy} onClick={()=>void download("json")}>Ներբեռնել JSON</button><button disabled={!connected || loading || busy} onClick={()=>void download("csv")}>Ներբեռնել CSV</button></div></section>
    <div className="stats-grid backend-stats"><article className="metric"><strong>{stats.total}</strong><p>Բոլոր առաջադրանքները</p></article><article className="metric"><strong>{stats.active}</strong><p>Ընթացիկ</p></article><article className="metric"><strong>{stats.completed}</strong><p>Ավարտված</p></article></div>
    <section className="backend-export" aria-labelledby="import-title"><h2 id="import-title">Վերադարձնել JSON պատճենը</h2><p>Նոր առաջադրանքներն ավելացվում են իրենց հիմնական բաժին կամ աղբարկղ։ Նույն ID-ով առաջադրանքները բաց են թողնվում․ եղած տվյալները չեն փոխարինվում։</p><form onSubmit={importBackup} aria-busy={busy}><div className="field"><label htmlFor="backend-import">Ընտրել JSON ֆայլ (մինչև 1 ՄԲ)</label><input id="backend-import" ref={fileInput} type="file" accept=".json,application/json" disabled={busy} onChange={event=>setImportFile(event.target.files?.[0] || null)}/></div><button className="primary" disabled={!connected || loading || busy || !importFile}>Ներմուծել պատճենը</button></form></section>
    <div className="filters" role="group" aria-label="Առաջադրանքներ և աղբարկղ"><button disabled={busy} aria-pressed={view === "tasks"} onClick={() => {setView("tasks");resetFilters();}}>Առաջադրանքներ ({stats.total})</button><button disabled={busy} aria-pressed={view === "trash"} onClick={() => {setView("trash");resetFilters();setEditing(null);setText("");}}>Աղբարկղ ({stats.trashed})</button></div>
    {view === "trash" && <p className="page-description">Ջնջված առաջադրանքները պահվում են այստեղ։ Վերականգնելիս կվերադառնան իրենց տեքստով, ժամկետով և կարգավիճակով։</p>}
    <div role="status" aria-live="polite">{message && <p>{message}</p>}</div>
    {error && <div role="alert"><p className="error">{error}</p>{localBackend ? <a href={backendUrl}>Բացել տեղական պլանավորիչը →</a> : <a href="#/account">Ստուգել մուտքը →</a>}</div>}
    {view === "tasks" && <form className="task-form" onSubmit={submit} aria-busy={busy}>
      <div className="field task-text-field"><label htmlFor="backend-text">{editing ? "Խմբագրել առաջադրանքը" : "Նոր առաջադրանք"}</label><input id="backend-text" ref={input} value={text} onChange={event => setText(event.target.value)} required maxLength={120} placeholder="Օրինակ՝ սովորել backend" disabled={!connected || busy}/></div>
      <div className="field"><label htmlFor="backend-priority">Կարևորություն</label><select id="backend-priority" value={priority} onChange={event => setPriority(event.target.value as Priority)} disabled={!connected || busy}>{Object.entries(priorities).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="field"><label htmlFor="backend-due">Ժամկետ (ոչ պարտադիր)</label><input id="backend-due" type="date" value={due} disabled={!connected || busy} onChange={event => setDue(event.target.value)}/></div>
      <button className="primary" disabled={!connected || busy || !text.trim()}>{busy ? "Պահպանվում է…" : editing ? "Պահպանել փոփոխությունը" : "Ավելացնել սերվերում"}</button>
      {editing && <button type="button" disabled={busy} onClick={() => {setEditing(null);setText("");}}>Չեղարկել</button>}
    </form>}
    <div className="backend-tools">
      <div className="field"><label htmlFor="backend-search">Որոնել սերվերում</label><input id="backend-search" type="search" maxLength={120} value={query} disabled={busy} onChange={event => {setQuery(event.target.value);setPage(1);}} placeholder="Գրիր առաջադրանքի անունը"/></div>
      <div className="field"><label htmlFor="backend-status">Կարգավիճակ</label><select id="backend-status" disabled={busy} value={status} onChange={event => {setStatus(event.target.value);setPage(1);}}><option value="all">Բոլորը</option><option value="active">Ընթացիկ</option><option value="done">Ավարտված</option></select></div>
      <div className="field"><label htmlFor="backend-importance">Կարևորության զտիչ</label><select id="backend-importance" disabled={busy} value={importance} onChange={event => {setImportance(event.target.value);setPage(1);}}><option value="all">Բոլորը</option>{Object.entries(priorities).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="field"><label htmlFor="backend-sort">Դասավորել</label><select id="backend-sort" disabled={busy} value={sort} onChange={event => {setSort(event.target.value);setPage(1);}}><option value="newest">Նորերը սկզբում</option><option value="oldest">Հները սկզբում</option><option value="priority">Կարևորները սկզբում</option><option value="due">Մոտակա ժամկետը սկզբում</option></select></div>
      <div className="field"><label htmlFor="backend-deadline">Ըստ ժամկետի</label><select id="backend-deadline" value={deadline} disabled={busy} onChange={event => {setDeadline(event.target.value);setPage(1);}}><option value="all">Բոլորը</option><option value="today">Այսօր</option><option value="overdue">Ուշացած</option><option value="none">Առանց ժամկետի</option></select></div>
      <button disabled={busy} onClick={resetFilters}>Մաքրել զտիչները</button>
    </div>
    <p role="status">{loading ? "Ցանկը թարմացվում է…" : `Գտնվել է ${pagination.total} առաջադրանք`}</p>
    <ul className="backend-list" aria-busy={loading || busy}>{tasks.map(task => <li key={task.id} className={task.done ? "completed" : ""}>
      <label><input type="checkbox" checked={task.done} disabled={busy || loading || view === "trash"} onChange={() => void mutate(`/${task.id}`,"PATCH",{done:!task.done},"Կարգավիճակը պահպանվել է սերվերում։")}/><span className="task-text">{task.text}</span></label>
      <span className={!task.done && task.due && task.due < today ? "backend-overdue" : "backend-due"}>{task.due ? `${!task.done && task.due < today ? "Ուշացած · " : "Ժամկետ՝ "}${task.due}` : "Առանց ժամկետի"}</span>
      <span className={`priority priority-${task.priority}`}>{priorities[task.priority]}</span>
      {view === "trash" ? <><span className="backend-due">Տեղափոխված՝ {task.deletedAt ? new Date(task.deletedAt).toLocaleDateString("hy-AM") : ""}</span><button disabled={busy || loading} aria-label={`Վերականգնել՝ ${task.text}`} onClick={() => void mutate(`/${task.id}/restore`,"POST",undefined,"Առաջադրանքը վերականգնվել է։ Բացիր «Առաջադրանքներ» ցանկը։")}>Վերականգնել</button></> : <>
        <button disabled={busy || loading} aria-label={`Խմբագրել՝ ${task.text}`} onClick={() => {setEditing(task.id);setText(task.text);setPriority(task.priority);setDue(task.due);input.current?.focus();}}>Խմբագրել</button>
        <button disabled={busy || loading} aria-label={`Ջնջել՝ ${task.text}`} onClick={async () => {if(await mutate(`/${task.id}`,"DELETE",undefined,"Առաջադրանքը տեղափոխվել է աղբարկղ։ Այն կարող ես վերականգնել։")){if(editing===task.id){setEditing(null);setText("");}input.current?.focus();}}}>Ջնջել</button>
      </>}
    </li>)}</ul>
    {connected && !loading && !tasks.length && <p className="empty">{view === "trash" && !stats.trashed ? "Աղբարկղը դատարկ է։" : (view === "trash" ? stats.trashed : stats.total) ? "Համապատասխան առաջադրանք չկա։ Փոխիր որոնումը կամ զտիչները։" : "Ցանկը դատարկ է։ Ավելացրու առաջին առաջադրանքը վերևի ձևով։"}</p>}
    <div className="backend-pagination"><button disabled={loading || busy || page<=1} onClick={() => setPage(value => value-1)}>← Նախորդը</button><span>Էջ {pagination.page} / {pagination.pages}</span><button disabled={loading || busy || page>=pagination.pages} onClick={() => setPage(value => value+1)}>Հաջորդը →</button></div>
  </section>;
}
