import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "./types.ts";

type CloudTask = Task & {deletedAt?: string};
type Row = {id:string;text:string;done:boolean;priority:Task["priority"];due:string|null;deleted_at:string|null;created_at:string};
const columns = "id,text,done,priority,due,deleted_at,created_at";
const decode = (row:Row):CloudTask => ({id:row.id,text:row.text,done:row.done,priority:row.priority,due:row.due || "",...(row.deleted_at ? {deletedAt:row.deleted_at} : {})});

export function selectCloudTasks(all:CloudTask[], params:URLSearchParams) {
  const trash=params.get("view")==="trash", q=(params.get("q") || "").trim().toLocaleLowerCase("hy");
  const today=params.get("today") || new Date().toLocaleDateString("en-CA");
  const active=all.filter(task=>!task.deletedAt), completed=active.filter(task=>task.done).length;
  let tasks=all.filter(task=>Boolean(task.deletedAt)===trash && task.text.toLocaleLowerCase("hy").includes(q));
  const status=params.get("status"), priority=params.get("priority"), deadline=params.get("deadline");
  if(status==="active" || status==="done")tasks=tasks.filter(task=>task.done===(status==="done"));
  if(priority && priority!=="all")tasks=tasks.filter(task=>task.priority===priority);
  if(deadline==="today")tasks=tasks.filter(task=>task.due===today);
  if(deadline==="overdue")tasks=tasks.filter(task=>!task.done && !!task.due && task.due<today);
  if(deadline==="none")tasks=tasks.filter(task=>!task.due);
  const sort=params.get("sort");
  if(sort==="oldest")tasks.reverse();
  if(sort==="priority") {const rank={high:0,medium:1,low:2};tasks.sort((a,b)=>rank[a.priority]-rank[b.priority]);}
  if(sort==="due")tasks.sort((a,b)=>(a.due || "9999-12-31").localeCompare(b.due || "9999-12-31"));
  const total=tasks.length, limit=5, pages=Math.max(1,Math.ceil(total/limit));
  const page=Math.min(Math.max(1,Number(params.get("page")) || 1),pages);
  return {tasks:tasks.slice((page-1)*limit,page*limit),pagination:{page,pages,limit,total},stats:{total:active.length,completed,active:active.length-completed,trashed:all.length-active.length}};
}

export function validateCloudBackup(input:unknown, userId:string) {
  const backup=input as {version?:number;view?:string;tasks?:unknown[]};
  if(!backup || backup.version!==1 || !["tasks","trash"].includes(backup.view || "") || !Array.isArray(backup.tasks) || backup.tasks.length>1000)throw new Error("Ընտրիր պլանավորիչից ներբեռնված JSON պատճենը։");
  const rows=backup.tasks.map(value=>{
    const task=value as CloudTask;
    if(!task || typeof task.id!=="string" || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(task.id) || typeof task.text!=="string" || !task.text.trim() || task.text.trim().length>120 || typeof task.done!=="boolean" || !["low","medium","high"].includes(task.priority))throw new Error("Պատճենում առաջադրանքի տվյալները սխալ են։");
    const due=task.due || "";
    if(typeof due!=="string" || (due && (!/^\d{4}-\d{2}-\d{2}$/.test(due) || Number.isNaN(Date.parse(due)) || new Date(due).toISOString().slice(0,10)!==due)))throw new Error("Պատճենի ամսաթիվը սխալ է։");
    if(backup.view==="trash" && (typeof task.deletedAt!=="string" || Number.isNaN(Date.parse(task.deletedAt))))throw new Error("Աղբարկղի ամսաթիվը սխալ է։");
    return {id:task.id,user_id:userId,text:task.text.trim(),done:task.done,priority:task.priority,due:due || null,deleted_at:backup.view==="trash" ? task.deletedAt! : null};
  });
  return {view:backup.view!,rows};
}

export function createCloudTaskApi(client:SupabaseClient) {
  async function owner() {
    const {data,error}=await client.auth.getSession();
    if(error || !data.session)throw new Error("Մուտք գործիր «Իմ հաշիվը» էջում՝ առաջադրանքներդ առցանց պահելու համար։");
    return data.session.user.id;
  }
  async function readAll(userId:string) {
    const tasks:CloudTask[]=[];
    for(let offset=0;;offset+=1000) {
      const {data,error}=await client.from("portfolio_tasks").select(columns).eq("user_id",userId).order("created_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+999);
      if(error)throw new Error(error.code==="PGRST205" ? "Առցանց առաջադրանքների աղյուսակը դեռ պատրաստ չէ։" : "Չհաջողվեց կարդալ առցանց առաջադրանքները։ Փորձիր կրկին։");
      tasks.push(...(data as Row[]).map(decode));
      if(data.length<1000)return tasks;
    }
  }
  return {
    async request(path="",method="GET",body?:unknown) {
      const userId=await owner();
      const url=new URL(path || "?", "https://tasks.invalid/");
      if(method==="GET")return selectCloudTasks(await readAll(userId),url.searchParams);
      if(path==="/import") {
        const {rows,view}=validateCloudBackup(body,userId);
        const existing=new Set((await readAll(userId)).map(task=>task.id));
        const unique=new Map(rows.filter(row=>!existing.has(row.id)).map(row=>[row.id,row]));
        if(!unique.size)return {imported:0,skipped:rows.length,view};
        // One INSERT transaction; conflicts never update existing rows.
        const {data,error}=await client.from("portfolio_tasks").upsert([...unique.values()],{onConflict:"id",ignoreDuplicates:true}).select("id");
        if(error)throw new Error("Ներմուծումը չհաջողվեց։ Ոչինչ չի փոխվել։");
        return {imported:data.length,skipped:rows.length-data.length,view};
      }
      const match=path.match(/^\/([\da-f-]+)(\/restore)?$/i);
      const input=body as Partial<Task> | undefined;
      if(method==="POST" && !path) {
        const {data,error}=await client.from("portfolio_tasks").insert({user_id:userId,text:input?.text?.trim(),priority:input?.priority || "medium",due:input?.due || null}).select(columns).single();
        if(error)throw new Error("Չհաջողվեց ավելացնել առաջադրանքը։ Ստուգիր տվյալներն ու կապը։");
        return {task:decode(data as Row)};
      }
      if(!match)throw new Error("Գործողության հասցեն սխալ է։");
      const changes:Record<string,unknown>={};
      if(method==="DELETE")changes.deleted_at=new Date().toISOString();
      else if(method==="POST" && match[2])changes.deleted_at=null;
      else if(method==="PATCH") {
        if(input?.text!==undefined)changes.text=input.text.trim();
        if(input?.done!==undefined)changes.done=input.done;
        if(input?.priority!==undefined)changes.priority=input.priority;
        if(input?.due!==undefined)changes.due=input.due || null;
      } else throw new Error("Գործողությունը չի թույլատրվում։");
      let query=client.from("portfolio_tasks").update(changes).eq("id",match[1]).eq("user_id",userId);
      query=match[2] ? query.not("deleted_at","is",null) : query.is("deleted_at",null);
      const {data,error}=await query.select(columns).single();
      if(error)throw new Error("Առաջադրանքը չի գտնվել կամ փոփոխությունը չպահպանվեց։ Թարմացրու ցանկը։");
      return {task:decode(data as Row)};
    },
    async download(format:"json"|"csv",view:string) {
      const tasks=(await readAll(await owner())).filter(task=>Boolean(task.deletedAt)===(view==="trash"));
      if(format==="json")return new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),view,tasks},null,2)],{type:"application/json"});
      const cell=(value:unknown)=>{let text=String(value ?? "");if(/^[\s]*[=+@-]|^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
      const rows=[["ID","Առաջադրանք","Ավարտված","Կարևորություն","Ժամկետ","Աղբարկղ տեղափոխված"],...tasks.map(task=>[task.id,task.text,task.done,task.priority,task.due,task.deletedAt || ""])];
      return new Blob(["\uFEFF"+rows.map(row=>row.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
    },
  };
}
