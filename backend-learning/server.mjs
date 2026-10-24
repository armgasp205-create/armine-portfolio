import { AsyncLocalStorage } from "node:async_hooks";
import { createAuth } from "./auth.mjs";
﻿import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createPortfolioApi } from "./portfolio-api.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const failure = (status, message) => Object.assign(new Error(message), {status});

async function readBackup(request) {
    if(request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") throw failure(415,"Ուղարկիր application/json տվյալներ։");
    const chunks=[];let size=0;
    for await(const chunk of request) {size+=chunk.length;if(size>1024*1024)throw failure(413,"Ֆայլը չպետք է գերազանցի 1 ՄԲ-ը։");chunks.push(chunk);}
    try {return JSON.parse(Buffer.concat(chunks).toString("utf8").replace(/^\uFEFF/,""));}
    catch {throw failure(400,"JSON-ի ձևաչափը սխալ է։");}
}

function validate(input, partial = false) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw failure(400, "Տվյալների ձևաչափը սխալ է։");
    const data = {};
    if (!partial || Object.hasOwn(input, "text")) {
        if (typeof input.text !== "string" || !input.text.trim() || input.text.trim().length > 120) throw failure(400, "Առաջադրանքը պետք է լինի 1–120 նիշ։");
        data.text = input.text.trim();
    }
    if (!partial || Object.hasOwn(input, "priority")) {
        data.priority = input.priority ?? "medium";
        if (!["low", "medium", "high"].includes(data.priority)) throw failure(400, "Կարևորությունը՝ low, medium կամ high։");
    }
    if (partial && Object.hasOwn(input, "done")) {
        if (typeof input.done !== "boolean") throw failure(400, "Կարգավիճակը պետք է լինի true կամ false։");
        data.done = input.done;
    }
    if (!partial || Object.hasOwn(input,"due")) {
        data.due = input.due ?? "";
        if (typeof data.due !== "string" || (data.due !== "" && (!/^\d{4}-\d{2}-\d{2}$/.test(data.due) || data.due < "0001-01-01" || Number.isNaN(Date.parse(data.due)) || new Date(data.due).toISOString().slice(0,10) !== data.due))) throw failure(400,"Ժամկետի ամսաթիվը սխալ է։");
    }
    if (partial && !Object.keys(data).length) throw failure(400, "Նշիր փոփոխվող տեքստը, կարևորությունը կամ կարգավիճակը։");
    return data;
}

export function createTaskServer({ databasePath = ":memory:", staticRoot = resolve(projectRoot, ".site-dist"), verifyIdentity, publicOrigin = "" } = {}) {
    if(publicOrigin && (new URL(publicOrigin).origin !== publicOrigin || !publicOrigin.startsWith("https://"))) throw new Error("PUBLIC_ORIGIN must be an HTTPS origin without a trailing slash.");
    if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), {recursive:true});
    const database = new DatabaseSync(databasePath);
    const portfolioApi=createPortfolioApi(database, publicOrigin);
    const auth = createAuth(verifyIdentity, publicOrigin);
    const identity = new AsyncLocalStorage();
    database.function("current_owner", () => identity.getStore()?.id || "");
    database.exec("CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, text TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, priority TEXT NOT NULL, due TEXT NOT NULL DEFAULT '')");
    if (!database.prepare("PRAGMA table_info(tasks)").all().some(column => column.name === "deleted_at")) database.exec("ALTER TABLE tasks ADD COLUMN deleted_at TEXT DEFAULT NULL");
    if (!database.prepare("PRAGMA table_info(tasks)").all().some(column => column.name === "owner_id")) database.exec("ALTER TABLE tasks ADD COLUMN owner_id TEXT DEFAULT NULL");
    const decode = ({deleted_at,owner_id,...task}) => ({...task,done:Boolean(task.done),...(deleted_at ? {deletedAt:deleted_at} : {})});
    const readTasks = () => database.prepare("SELECT * FROM tasks WHERE owner_id=current_owner() AND deleted_at IS NULL ORDER BY rowid DESC").all().map(decode);
    database.function("casefold", value => String(value).toLocaleLowerCase("hy"));
    function queryTasks(params) {
        const search = (params.get("q") || "").trim();
        const view = params.get("view") || "tasks";
        if (!["tasks","trash"].includes(view)) throw failure(400,"Ցանկի տեսակը սխալ է։");
        const status = params.get("status") || "all";
        const priority = params.get("priority") || "all";
        const sort = params.get("sort") || "newest";
        const deadline = params.get("deadline") || "all";
        const today = params.get("today") || new Date().toLocaleDateString("en-CA",{timeZone:"Europe/Moscow"});
        if (!["all","today","overdue","none"].includes(deadline) || !/^\d{4}-\d{2}-\d{2}$/.test(today) || Number.isNaN(Date.parse(today)) || new Date(today).toISOString().slice(0,10)!==today) throw failure(400,"Ժամկետի զտիչը սխալ է։");
        const pageValue = params.get("page") || "1";
        const limitValue = params.get("limit") || "5";
        const ordering = {newest:"rowid DESC",oldest:"rowid ASC",priority:"CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, rowid DESC",due:"CASE WHEN due='' THEN 1 ELSE 0 END, due ASC, rowid DESC"};
        if (search.length > 120 || !["all","active","done"].includes(status) || !["all","low","medium","high"].includes(priority) || !Object.hasOwn(ordering,sort) || !/^[1-9]\d{0,5}$/.test(pageValue) || !/^[1-9]\d?$/.test(limitValue) || Number(limitValue)>50) throw failure(400,"Որոնման կամ զտիչների արժեքները սխալ են։");
        const conditions = ["owner_id=current_owner()", view === "trash" ? "deleted_at IS NOT NULL" : "deleted_at IS NULL"], values = [];
        if (search) {conditions.push("instr(casefold(text),casefold(?)) > 0");values.push(search);}
        if (status !== "all") {conditions.push("done = ?");values.push(status === "done" ? 1 : 0);}
        if (priority !== "all") {conditions.push("priority = ?");values.push(priority);}
        if (deadline === "overdue") {conditions.push("done=0 AND due<>'' AND due<?");values.push(today);}
        if (deadline === "today") {conditions.push("due=?");values.push(today);}
        if (deadline === "none") conditions.push("due=''");
        const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
        const total = database.prepare("SELECT count(*) AS total FROM tasks"+where).get(...values).total;
        const limit = Number(limitValue), pages = Math.max(1,Math.ceil(total/limit)), page = Math.min(Number(pageValue),pages);
        const tasks = database.prepare("SELECT * FROM tasks"+where+" ORDER BY "+ordering[sort]+" LIMIT ? OFFSET ?").all(...values,limit,(page-1)*limit).map(decode);
        const stats = database.prepare("SELECT count(*) AS total, coalesce(sum(done),0) AS completed FROM tasks WHERE owner_id=current_owner() AND deleted_at IS NULL").get();
        const trashed = database.prepare("SELECT count(*) AS total FROM tasks WHERE owner_id=current_owner() AND deleted_at IS NOT NULL").get().total;
        return {tasks,pagination:{page,pages,limit,total},stats:{...stats,active:stats.total-stats.completed,trashed}};
    }
    const root = resolve(staticRoot);

    const server = createServer((request, response) => identity.run({}, async () => {
        const send = (status, data) => {
            response.writeHead(status, {"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff"});
            response.end(JSON.stringify(data));
        };
        try {
            const url = new URL(request.url, "http://localhost");
            if(url.pathname === "/healthz" && request.method === "GET") {database.prepare("SELECT 1").get();send(200,{status:"ok"});return;}
            const host = request.headers.host;
            if(publicOrigin ? host !== new URL(publicOrigin).host : !["localhost","127.0.0.1"].includes(new URL("http://"+host).hostname))throw failure(403,"Օգտագործիր կայքի հիմնական հասցեն։");
            if(url.pathname.startsWith("/api/") && ["POST","PATCH","DELETE"].includes(request.method)) {
                response.once("finish",()=>{
                    if(response.statusCode>=200 && response.statusCode<300) {
                        try {database.prepare("INSERT INTO activity (method,path,status,created_at) VALUES (?,?,?,?)").run(request.method,url.pathname,response.statusCode,new Date().toISOString());}
                        catch {console.error("Գործողության պատմությունը չհաջողվեց պահպանել։");}
                    }
                });
            }
            if(await auth.handle(request,response,url,send))return;
            const taskRoute = /^\/api\/tasks(?:\/|$)/.test(url.pathname);
            const adminRoute = ["/api/health","/api/activity"].includes(url.pathname)
                || (/^\/api\/(orders|messages)(?:\/|$)/.test(url.pathname) && request.method !== "POST")
                || (/^\/api\/(products|posts)(?:\/|$)/.test(url.pathname) && request.method !== "GET");
            if(taskRoute || adminRoute) {
                const user = await auth.authenticate(request);
                Object.assign(identity.getStore(), user);
                if(adminRoute && user.role !== "admin") throw failure(403,"Այս գործողությունը հասանելի է միայն ադմինին։");
                if(taskRoute && user.role === "admin") database.prepare("UPDATE tasks SET owner_id=? WHERE owner_id IS NULL").run(user.id);
            }
            if(await portfolioApi(request,response,url,send))return;
            if (url.pathname === "/api/tasks/import") {
                if(request.method !== "POST") {response.setHeader("Allow","POST");throw failure(405,"Ներմուծման համար օգտագործիր POST։");}
                if(request.headers.origin && request.headers.origin!==(publicOrigin || "http://"+request.headers.host)) throw failure(403,"Հարցման աղբյուրը թույլատրված չէ։");
                const backup=await readBackup(request);
                if(!backup || backup.version!==1 || !["tasks","trash"].includes(backup.view) || !Array.isArray(backup.tasks) || backup.tasks.length>1000) throw failure(400,"Ընտրիր պլանավորիչից ներբեռնված JSON պատճենը (version: 1)։");
                // Validate all rows before writing anything, including existing IDs.
                const candidates=backup.tasks.map(item=>{
                    const data=validate(item);
                    if(typeof item.id!=="string" || !item.id.trim() || item.id.length>100 || typeof item.done!=="boolean") throw failure(400,"Ֆայլի առաջադրանքներից մեկի ID-ն կամ կարգավիճակը սխալ է։");
                    let deletedAt=null;
                    if(backup.view==="trash") {
                        if(typeof item.deletedAt!=="string" || Number.isNaN(Date.parse(item.deletedAt)) || new Date(item.deletedAt).toISOString()!==item.deletedAt) throw failure(400,"Աղբարկղի ամսաթիվը սխալ է։");
                        deletedAt=item.deletedAt;
                    }
                    return {...data,id:item.id,done:item.done,deletedAt};
                });
                const existing=new Set(database.prepare("SELECT id FROM tasks WHERE owner_id=current_owner()").all().map(task=>task.id));
                const additions=[];let skipped=0;
                for(const task of candidates) {if(existing.has(task.id)){skipped++;continue;}existing.add(task.id);additions.push(task);}
                if(backup.view==="tasks" && readTasks().length+additions.length>100) throw failure(409,"Ներմուծումից հետո կգերազանցվի 100 առաջադրանքի սահմանը։ Ոչինչ չի փոխվել։");
                database.exec("BEGIN IMMEDIATE");
                try {
                    const insert=database.prepare("INSERT INTO tasks (id,text,priority,due,done,deleted_at,owner_id) VALUES (?,?,?,?,?,?,current_owner())");
                    for(const task of additions) { if(database.prepare("SELECT id FROM tasks WHERE id=?").get(task.id)) throw failure(409,"Պատճենի ID-ն արդեն օգտագործվում է։ Ոչինչ չի փոխվել։"); insert.run(task.id,task.text,task.priority,task.due,Number(task.done),task.deletedAt); }
                    database.exec("COMMIT");
                } catch(error) {database.exec("ROLLBACK");throw error;}
                send(200,{imported:additions.length,skipped,view:backup.view});return;
            }
            if (url.pathname === "/api/tasks/export") {
                if(request.method !== "GET") {response.setHeader("Allow","GET");throw failure(405,"Ներբեռնելու համար օգտագործիր GET։");}
                const format = url.searchParams.get("format") || "json";
                const view = url.searchParams.get("view") || "tasks";
                if(!["json","csv"].includes(format) || !["tasks","trash"].includes(view)) throw failure(400,"Ներբեռնման ձևաչափը սխալ է։");
                const tasks = database.prepare("SELECT * FROM tasks WHERE owner_id=current_owner() AND deleted_at IS "+(view === "trash" ? "NOT NULL" : "NULL")+" ORDER BY rowid DESC").all().map(decode);
                let content;
                if(format === "json") content=JSON.stringify({version:1,exportedAt:new Date().toISOString(),view,tasks},null,2);
                else {
                    const cell=value=>{
                        let text=String(value ?? "");
                        // Prevent spreadsheet formulas when opening user-provided task text.
                        if(/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text="'"+text;
                        return '"'+text.replaceAll('"','""')+'"';
                    };
                    content="\uFEFF"+[["ID","Առաջադրանք","Ավարտված","Կարևորություն","Ժամկետ","Աղբարկղ տեղափոխված"],...tasks.map(task=>[task.id,task.text,task.done ? "Այո" : "Ոչ",task.priority,task.due,task.deletedAt || ""])].map(row=>row.map(cell).join(",")).join("\r\n");
                }
                response.writeHead(200,{"Content-Type":format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8","Content-Disposition":`attachment; filename="planner-${view}.${format}"`,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
                response.end(content);return;
            }
            const match = url.pathname.match(/^\/api\/tasks(?:\/([^/]+)(\/restore)?)?$/);
            if (match) {
                if (request.headers.origin && ![(publicOrigin || "http://"+request.headers.host)].includes(request.headers.origin)) throw failure(403,"Հարցման աղբյուրը թույլատրված չէ։");
                const id = match[1];
                if (match[2]) {
                    if(request.method !== "POST") {response.setHeader("Allow","POST");throw failure(405,"Վերականգնման համար օգտագործիր POST։");}
                    if(readTasks().length >= 100) throw failure(409,"Ակտիվ ցանկում տեղ չկա։ Նախ տեղափոխիր առաջադրանքներից մեկը աղբարկղ։");
                    const result = database.prepare("UPDATE tasks SET deleted_at=NULL WHERE owner_id=current_owner() AND id=? AND deleted_at IS NOT NULL").run(id);
                    if(!result.changes) throw failure(404,"Աղբարկղում առաջադրանքը չի գտնվել։");
                    send(200,{task:readTasks().find(task=>task.id===id)});return;
                }
                if (request.method === "GET" && !id) { send(200,url.search ? queryTasks(url.searchParams) : {tasks:readTasks()}); return; }
                if (request.method === "DELETE" && id) {
                    const result = database.prepare("UPDATE tasks SET deleted_at=? WHERE owner_id=current_owner() AND id=? AND deleted_at IS NULL").run(new Date().toISOString(),id);
                    if (!result.changes) throw failure(404,"Առաջադրանքը չի գտնվել։");
                    send(200,{deleted:id}); return;
                }
                if (!(request.method === "POST" && !id) && !(request.method === "PATCH" && id)) {
                    response.setHeader("Allow", id ? "PATCH, DELETE" : "GET, POST");
                    throw failure(405,"Այս հասցեում գործողությունը չի թույլատրվում։");
                }
                if (request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") throw failure(415,"Ուղարկիր application/json տվյալներ։");
                const chunks = []; let size = 0;
                for await (const chunk of request) {
                    size += chunk.length;
                    if (size > 4096) throw failure(413,"Հարցումը չափազանց մեծ է։");
                    chunks.push(chunk);
                }
                let input;
                try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
                catch { throw failure(400,"JSON-ի ձևաչափը սխալ է։"); }
                const changes = validate(input, request.method === "PATCH");
                if (request.method === "POST") {
                    if (readTasks().length >= 100) throw failure(409,"Հասել ես 100 առաջադրանքի սահմանին։");
                    const task = {id:randomUUID(),text:changes.text,priority:changes.priority,done:false,due:changes.due};
                    database.prepare("INSERT INTO tasks (id,text,priority,due,owner_id) VALUES (?,?,?,?,current_owner())").run(task.id,task.text,task.priority,task.due);
                    send(201,{task}); return;
                }
                const previous = readTasks().find(task => task.id === id);
                if (!previous) throw failure(404,"Առաջադրանքը չի գտնվել։");
                const task = {...previous,...changes};
                database.prepare("UPDATE tasks SET text=?, priority=?, done=?, due=? WHERE owner_id=current_owner() AND id=?").run(task.text,task.priority,Number(task.done),task.due,id);
                send(200,{task}); return;
            }
            if (url.pathname.startsWith("/api/")) throw failure(404,"API-ի հասցեն չի գտնվել։");
            if (!["GET","HEAD"].includes(request.method)) throw failure(405,"Գործողությունը չի թույլատրվում։");
            if (url.pathname === "/") { response.writeHead(302,{Location:publicOrigin ? "/index.html" : "/react-planner/#/backend"}); response.end(); return; }
            // Serve only prepared public assets; database and source files stay outside this root.
            let path = resolve(root,"."+decodeURIComponent(url.pathname));
            if (path !== root && !path.startsWith(root+sep)) throw failure(403,"Հասցեն չի թույլատրվում։");
            try { if ((await stat(path)).isDirectory()) path = resolve(path,"index.html"); }
            catch { throw failure(404,"Էջը չի գտնվել։ Կառուցիր React հավելվածը։"); }
            let body = await readFile(path);
            if(extname(path)===".html")body=Buffer.from(body.toString("utf8").replace("</head>",'<meta name="portfolio-backend" content="enabled"></head>'));
            const types = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp"};
            response.writeHead(200,{"Content-Type":types[extname(path)] || "application/octet-stream","Cache-Control":"no-cache","X-Content-Type-Options":"nosniff"});
            response.end(request.method === "HEAD" ? undefined : body);
        } catch(error) {
            if (!response.headersSent) send(error.status || 500,{error:error.status ? error.message : "Սերվերի սխալ։ Փորձիր կրկին։"});
        }
    }));
    server.on("close", () => database.close());
    return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const publicOrigin = process.env.PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL || "";
    if(process.env.NODE_ENV === "production" && (!publicOrigin || !process.env.DATABASE_PATH)) throw new Error("Production requires PUBLIC_ORIGIN and DATABASE_PATH on persistent storage.");
    const server = createTaskServer({publicOrigin,databasePath:process.env.DATABASE_PATH || resolve(projectRoot,"backend-learning/data/tasks.sqlite")});
    for(const signal of ["SIGTERM","SIGINT"]) process.once(signal,()=>server.close());
    server.on("error", error => { console.error(error.message); process.exitCode=1; });
    server.listen(Number(process.env.PORT || 3002),process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1"), () => console.log("Պլանավորիչ + backend՝ http://127.0.0.1:3002/react-planner/#/backend"));
}
