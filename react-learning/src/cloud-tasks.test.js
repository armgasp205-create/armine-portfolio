import {test} from "node:test";
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";
import {createCloudTaskApi, selectCloudTasks, validateCloudBackup} from "./cloud-tasks.ts";

const id="11111111-1111-4111-8111-111111111111";
const row={id,text:"Learn backend",done:false,priority:"high",due:null,deleted_at:null,created_at:"2026-01-01"};
function setup(signedIn=true) {
  const calls=[];
  const client=createClient("https://example.supabase.co","test-public-key",{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
    const url=new URL(String(input));calls.push({url,init});
    const data=init.method==="POST" || init.method==="PATCH" ? row : [row];
    return new Response(JSON.stringify(data),{status:200,headers:{"Content-Type":"application/json"}});
  }}});
  client.auth.getSession=async()=>({data:{session:signedIn ? {user:{id:"owner"},access_token:"test-token"} : null},error:null});
  return {api:createCloudTaskApi(client),calls};
}

test("cloud tasks refuse signed-out reads and writes before contacting the database",async()=>{
  const {api,calls}=setup(false);
  await assert.rejects(api.request());
  await assert.rejects(api.request("","POST",{text:"test"}));
  assert.equal(calls.length,0);
});
test("cloud reads and edits scope requests to the account and normalize dates",async()=>{
  const {api,calls}=setup();
  const list=await api.request("?page=1");
  assert.equal(list.tasks[0].due,"");
  assert.equal(calls[0].url.searchParams.get("user_id"),"eq.owner");
  await api.request(`/${id}`,"PATCH",{text:"updated",user_id:"intruder",due:""});
  const call=calls.at(-1);
  assert.equal(call.url.searchParams.get("user_id"),"eq.owner");
  assert.equal(call.url.searchParams.get("deleted_at"),"is.null");
  assert.deepEqual(JSON.parse(call.init.body),{text:"updated",due:null});
  await api.request(`/${id}/restore`,"POST");
  assert.equal(calls.at(-1).url.searchParams.get("deleted_at"),"not.is.null");
  assert.deepEqual(JSON.parse(calls.at(-1).init.body),{deleted_at:null});
});
test("cloud filters combine search, deadline, status and pagination without including trash",()=>{
  const tasks=Array.from({length:8},(_,i)=>({...row,id:String(i),due:"2026-01-01"}));
  tasks.push({...tasks[0],id:"trash",deletedAt:"2026-01-02"});
  const list=selectCloudTasks(tasks,new URLSearchParams({q:"BACKEND",deadline:"overdue",status:"active",today:"2026-02-01",page:"2"}));
  assert.equal(list.pagination.total,8);
  assert.equal(list.tasks.length,3);
  assert.equal(list.stats.trashed,1);
  assert.equal(selectCloudTasks(tasks,new URLSearchParams({deadline:"none"})).pagination.total,0);
});
test("backup validates every row before a request and JSON export excludes account metadata",async()=>{
  const {api,calls}=setup();
  await assert.rejects(api.request("/import","POST",{version:1,view:"tasks",tasks:[{...row,due:"2026-02-30"}]}));
  assert.equal(calls.length,0);
  const backup=validateCloudBackup({version:1,view:"tasks",tasks:[{...row,user_id:"intruder",due:""}]},"owner");
  assert.equal(backup.rows[0].user_id,"owner");
  assert.equal(backup.rows[0].due,null);
  const json=JSON.parse(await (await api.download("json","tasks")).text());
  assert.equal(json.tasks[0].id,id);
  assert.equal(json.tasks[0].user_id,undefined);
});
