import { test } from "node:test";
import assert from "node:assert/strict";
import { createTaskServer } from "./test-server.mjs";
import { mkdtemp, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

test("API creates, validates and reads tasks without trusting client IDs or completion", async () => {
    const server = createTaskServer();
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = body => fetch(`${base}/api/tasks`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    try {
        assert.deepEqual(await (await fetch(`${base}/api/tasks`)).json(), {tasks:[]});
        const invalid = await post({text:"   "});
        assert.equal(invalid.status,400);
        assert.equal((await post({text:"Task",priority:"urgent"})).status,400);
        const created = await post({text:"  Սովորել backend  ",id:"client-id",done:true});
        assert.equal(created.status,201);
        const {task} = await created.json();
        assert.equal(task.text,"Սովորել backend");
        assert.equal(task.done,false);
        assert.notEqual(task.id,"client-id");
        assert.deepEqual(await (await fetch(`${base}/api/tasks`)).json(),{tasks:[task]});
        assert.equal((await fetch(`${base}/missing`)).status,404);
        assert.equal((await fetch(`${base}/api/tasks`,{method:"DELETE"})).status,405);
        assert.equal((await fetch(`${base}/api/tasks`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{"})).status,400);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});

test("SQLite retains updates after restart and deleted tasks leave the active list", async () => {
    const directory = await mkdtemp(join(tmpdir(),"planner-api-"));
    const databasePath = join(directory,"tasks.sqlite");
    let server;
    async function start() {
        server = createTaskServer({databasePath});
        await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
        return `http://127.0.0.1:${server.address().port}/api/tasks`;
    }
    try {
        let base = await start();
        const created = await fetch(base,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"Հայերեն առաջադրանք"})});
        const {task} = await created.json();
        const updated = await fetch(`${base}/${task.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"Փոփոխված",done:true,priority:"high"})});
        assert.equal(updated.status,200);
        assert.equal((await fetch(base,{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://untrusted.example"},body:'{"text":"Blocked"}'})).status,403);
        await new Promise(resolve => server.close(resolve));
        base = await start();
        const {tasks} = await (await fetch(base)).json();
        assert.equal(tasks.length,1);
        assert.equal(tasks[0].text,"Փոփոխված");
        assert.equal(tasks[0].done,true);
        assert.equal(tasks[0].priority,"high");
        assert.equal((await fetch(`${base}/${task.id}`,{method:"DELETE"})).status,200);
        assert.deepEqual(await (await fetch(base)).json(),{tasks:[]});
    } finally {
        if(server?.listening) await new Promise(resolve => server.close(resolve));
        await unlink(databasePath);
        await rmdir(directory);
    }
});

test("existing database migrates without losing saved tasks",async()=>{
    const directory=await mkdtemp(join(tmpdir(),"planner-migration-"));
    const databasePath=join(directory,"tasks.sqlite");
    const legacy=new DatabaseSync(databasePath);
    legacy.exec("CREATE TABLE tasks (id TEXT PRIMARY KEY,text TEXT NOT NULL,done INTEGER NOT NULL,priority TEXT NOT NULL,due TEXT NOT NULL)");
    legacy.prepare("INSERT INTO tasks VALUES (?,?,?,?,?)").run("existing","Հին առաջադրանք",1,"high","2027-01-01");
    legacy.close();
    const server=createTaskServer({databasePath});
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    try {
        const data=await (await fetch(`http://127.0.0.1:${server.address().port}/api/tasks`)).json();
        assert.deepEqual(data.tasks,[{id:"existing",text:"Հին առաջադրանք",done:true,priority:"high",due:"2027-01-01"}]);
    } finally {await new Promise(resolve=>server.close(resolve));await unlink(databasePath);await rmdir(directory);}
});

test("server search, filters, sorting and pagination combine safely", async () => {
    const server = createTaskServer();
    await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/tasks`;
    try {
        const ids=[];
        for(let index=0;index<7;index++) {
            const response = await fetch(base,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:`Սովորել ${index}`,priority:index===0 ? "high" : "low"})});
            ids.push((await response.json()).task.id);
        }
        await fetch(`${base}/${ids[0]}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:'{"done":true}'});
        const first = await (await fetch(base+"?page=1&limit=5&sort=oldest")).json();
        assert.equal(first.tasks.length,5);
        assert.equal(first.tasks[0].id,ids[0]);
        assert.equal(first.pagination.pages,2);
        assert.deepEqual(first.stats,{total:7,completed:1,active:6,trashed:0});
        const last = await (await fetch(base+"?page=999&limit=5")).json();
        assert.equal(last.pagination.page,2);
        assert.equal(last.tasks.length,2);
        const params = new URLSearchParams({q:"ՍՈՎՈՐԵԼ",status:"done",priority:"high"});
        const filtered = await (await fetch(base+"?"+params)).json();
        assert.deepEqual(filtered.tasks.map(task => task.id),[ids[0]]);
        const literal = await (await fetch(base+"?"+new URLSearchParams({q:"%' OR 1=1 --"}))).json();
        assert.equal(literal.pagination.total,0);
        for(const query of ["page=0","limit=100","status=unknown","sort=text;DROP","priority=urgent"]) assert.equal((await fetch(base+"?"+query)).status,400);
        assert.equal((await (await fetch(base+"?sort=priority")).json()).tasks[0].id,ids[0]);
    } finally {await new Promise(resolve => server.close(resolve));}
});

test("deadlines are validated, filtered and preserved on updates", async () => {
    const server=createTaskServer();
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const base=`http://127.0.0.1:${server.address().port}/api/tasks`;
    const write=(url,method,body)=>fetch(url,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    try {
        assert.equal((await write(base,"POST",{text:"Bad",due:"2026-02-30"})).status,400);
        const {task}=await (await write(base,"POST",{text:"Ժամկետով",due:"2026-10-01"})).json();
        assert.equal(task.due,"2026-10-01");
        const result=await (await fetch(base+"?deadline=overdue&today=2026-10-22")).json();
        assert.equal(result.tasks[0].id,task.id);
        await write(`${base}/${task.id}`,"PATCH",{done:true});
        assert.equal((await (await fetch(base+"?deadline=overdue&today=2026-10-22")).json()).tasks.length,0);
        assert.equal((await (await fetch(base)).json()).tasks[0].due,"2026-10-01");
        await write(`${base}/${task.id}`,"PATCH",{due:""});
        assert.equal((await (await fetch(base+"?deadline=none")).json()).tasks.length,1);
    } finally {await new Promise(resolve=>server.close(resolve));}
});

test("trash survives restart and restores the original task without losing its fields",async()=>{
    const directory=await mkdtemp(join(tmpdir(),"planner-trash-"));
    const databasePath=join(directory,"tasks.sqlite");
    let server;
    async function start(){server=createTaskServer({databasePath});await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));return `http://127.0.0.1:${server.address().port}/api/tasks`;}
    const write=(url,method,body)=>fetch(url,{method,headers:{"Content-Type":"application/json"},body:body===undefined ? undefined : JSON.stringify(body)});
    try {
        let base=await start();
        const {task}=await (await write(base,"POST",{text:"Վերականգնել ինձ",priority:"high",due:"2027-01-10"})).json();
        await write(`${base}/${task.id}`,"PATCH",{done:true});
        assert.equal((await write(`${base}/${task.id}`,"DELETE")).status,200);
        assert.equal((await write(`${base}/${task.id}`,"PATCH",{text:"No"})).status,404);
        await new Promise(resolve=>server.close(resolve));
        base=await start();
        assert.deepEqual(await (await fetch(base)).json(),{tasks:[]});
        const trash=await (await fetch(base+"?view=trash")).json();
        assert.equal(trash.tasks[0].id,task.id);
        assert.ok(trash.tasks[0].deletedAt);
        assert.equal(trash.stats.trashed,1);
        assert.equal(trash.stats.total,0);
        const restored=await (await write(`${base}/${task.id}/restore`,"POST")).json();
        assert.deepEqual(restored.task,{...task,done:true});
        assert.equal((await write(`${base}/${task.id}/restore`,"POST")).status,404);
        assert.equal((await (await fetch(base+"?view=trash")).json()).pagination.total,0);
    } finally {if(server?.listening)await new Promise(resolve=>server.close(resolve));await unlink(databasePath);await rmdir(directory);}
});

test("downloads include the full chosen list and CSV escapes user content",async()=>{
    const server=createTaskServer();
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const base=`http://127.0.0.1:${server.address().port}/api/tasks`;
    try {
        const ids=[];
        for(const text of ['=SUM(1,2)','Հայերեն, "սուրճ"','Գրառում 3','Գրառում 4','Գրառում 5','Գրառում 6','Աղբարկղ']) {
            const result=await fetch(base,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,due:"2027-01-01",priority:"high"})});
            ids.push((await result.json()).task.id);
        }
        await fetch(`${base}/${ids[6]}`,{method:"DELETE"});
        const json=await fetch(base+"/export?format=json&view=tasks");
        assert.match(json.headers.get("content-disposition"),/planner-tasks.json/);
        const backup=await json.json();
        assert.equal(backup.version,1);
        assert.equal(backup.tasks.length,6);
        assert.ok(backup.tasks.every(task=>task.due==="2027-01-01"));
        const csv=await fetch(base+"/export?format=csv");
        assert.match(csv.headers.get("content-type"),/text\/csv/);
        const bytes=Buffer.from(await csv.arrayBuffer());
        assert.deepEqual([...bytes.subarray(0,3)],[239,187,191]);
        assert.ok(bytes.toString("utf8").includes('"\'=SUM(1,2)"'));
        assert.ok(bytes.toString("utf8").includes('"Հայերեն, ""սուրճ"""'));
        const trash=await (await fetch(base+"/export?format=json&view=trash")).json();
        assert.equal(trash.tasks.length,1);
        assert.equal(trash.tasks[0].text,"Աղբարկղ");
        assert.equal((await fetch(base+"/export?format=exe")).status,400);
    } finally {await new Promise(resolve=>server.close(resolve));}
});

test("JSON import validates atomically, skips IDs and preserves active and trashed fields",async()=>{
    const server=createTaskServer();await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const base=`http://127.0.0.1:${server.address().port}/api/tasks`;
    const task={id:"backup-1",text:"Պատճենից",priority:"high",done:true,due:"2027-01-01"};
    const backup={version:1,view:"tasks",tasks:[task]};
    const upload=body=>fetch(base+"/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    try {
        assert.equal((await upload({...backup,tasks:[task,{...task,id:"bad",due:"2026-02-30"}]})).status,400);
        assert.deepEqual(await (await fetch(base)).json(),{tasks:[]});
        assert.deepEqual(await (await upload(backup)).json(),{imported:1,skipped:0,view:"tasks"});
        assert.deepEqual((await (await fetch(base)).json()).tasks,[task]);
        assert.deepEqual(await (await upload(backup)).json(),{imported:0,skipped:1,view:"tasks"});
        await fetch(base+"/backup-1",{method:"DELETE"});
        assert.equal((await (await upload(backup)).json()).skipped,1);
        assert.equal((await (await fetch(base)).json()).tasks.length,0);
        const deletedAt="2026-10-22T10:00:00.000Z";
        const trash={version:1,view:"trash",tasks:[{...task,id:"trash-copy",deletedAt}]};
        assert.equal((await (await upload(trash)).json()).imported,1);
        assert.equal((await (await fetch(base+"?view=trash")).json()).tasks.find(item=>item.id==="trash-copy").deletedAt,deletedAt);
        assert.equal((await upload({...backup,version:2})).status,400);
        assert.equal((await upload({...backup,tasks:Array.from({length:101},(_,index)=>({...task,id:`limit-${index}`}))})).status,409);
        assert.deepEqual(await (await fetch(base)).json(),{tasks:[]});
    }finally{await new Promise(resolve=>server.close(resolve));}
});
