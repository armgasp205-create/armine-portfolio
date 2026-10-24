import { test } from "node:test";
import assert from "node:assert/strict";
import { createTaskServer } from "./server.mjs";
import { verifySupabaseToken } from "./auth.mjs";

test("Supabase verification requires confirmed email and ignores client role metadata", async () => {
    const original=globalThis.fetch;
    try {
        let user={id:"verified-user",email:"reader@example.com",email_confirmed_at:"2026-01-01",user_metadata:{role:"admin"}};
        globalThis.fetch=async (url,options)=>{
            assert.equal(new URL(url).pathname,"/auth/v1/user");
            assert.equal(options.headers.Authorization,"Bearer real-token");
            return new Response(JSON.stringify(user),{status:200});
        };
        assert.equal((await verifySupabaseToken("real-token")).role,"user");
        user={...user,email:"armine.gasparyan94@mail.ru"};
        assert.equal((await verifySupabaseToken("real-token")).role,"admin");
        user.email_confirmed_at=null;
        await assert.rejects(verifySupabaseToken("real-token"),{status:401});
        globalThis.fetch=async()=>new Response("{}",{status:401});
        await assert.rejects(verifySupabaseToken("real-token"),{status:401});
        globalThis.fetch=async()=>{throw new Error("Network unavailable");};
        await assert.rejects(verifySupabaseToken("real-token"),{status:503});
    } finally {globalThis.fetch=original;}
});

test("authorization isolates accounts, exports, trash and administrative changes", async () => {
    const server = createTaskServer({verifyIdentity: async token => {
        if(!["alice","bob","admin"].includes(token))throw Object.assign(new Error("Invalid token"),{status:401});
        return {id:token,email:`${token}@example.com`,role:token === "admin" ? "admin" : "user"};
    }});
    await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
    const base=`http://127.0.0.1:${server.address().port}`;
    const call=(path,token,method="GET",body)=>fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),"Content-Type":"application/json"},body:body === undefined ? undefined : JSON.stringify(body)});
    try {
        assert.equal((await call("/api/tasks")).status,401);
        assert.equal((await call("/api/tasks","invalid")).status,401);
        assert.equal((await call("/api/messages","alice")).status,403);
        assert.equal((await call("/api/orders/x","alice","PATCH",{status:"Completed"})).status,403);
        assert.equal((await call("/api/posts","alice","POST",{})).status,403);
        assert.equal((await call("/api/products")).status,200);
        assert.equal((await call("/api/activity","admin")).status,200);
        const {task}=await (await call("/api/tasks","alice","POST",{text:"Private task"})).json();
        assert.deepEqual(await (await call("/api/tasks","bob")).json(),{tasks:[]});
        assert.equal((await (await call("/api/tasks?limit=5","bob")).json()).stats.total,0);
        assert.equal((await (await call("/api/tasks/export","bob")).json()).tasks.length,0);
        const backup={version:1,view:"tasks",tasks:[{id:"new-import",text:"valid",done:false},{...task}]};
        assert.equal((await call("/api/tasks/import","bob","POST",backup)).status,409);
        assert.deepEqual(await (await call("/api/tasks","bob")).json(),{tasks:[]});
        assert.equal((await call(`/api/tasks/${task.id}`,"bob","PATCH",{text:"stolen"})).status,404);
        assert.equal((await call(`/api/tasks/${task.id}`,"bob","DELETE")).status,404);
        assert.equal((await call(`/api/tasks/${task.id}`,"alice","DELETE")).status,200);
        assert.equal((await call(`/api/tasks/${task.id}/restore`,"bob","POST")).status,404);
        assert.equal((await call(`/api/tasks/${task.id}/restore`,"alice","POST")).status,200);
        const session=await call("/api/auth/session","admin","POST");
        const cookie=session.headers.get("set-cookie");
        assert.match(cookie,/HttpOnly; SameSite=Strict/);
        assert.equal((await fetch(base+"/api/activity",{headers:{cookie}})).status,200);
        await fetch(base+"/api/auth/logout",{method:"POST",headers:{cookie}});
        assert.equal((await fetch(base+"/api/activity",{headers:{cookie}})).status,401);
        assert.equal((await fetch(base+"/api/auth/session",{method:"POST",headers:{origin:"https://evil.example",Authorization:"Bearer admin"}})).status,403);
    } finally {await new Promise(resolve=>server.close(resolve));}
});
