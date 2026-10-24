import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,unlink,rmdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createTaskServer} from "./test-server.mjs";

test("store, blog, orders and messages persist and reject invalid input",async()=>{
    const directory=await mkdtemp(join(tmpdir(),"portfolio-api-"));const databasePath=join(directory,"site.sqlite");let server;
    async function start(){server=createTaskServer({databasePath});await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));return `http://127.0.0.1:${server.address().port}/api/`;}
    let base=await start();
    const call=(path,method="GET",body)=>fetch(base+path,{method,headers:body===undefined?undefined:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
    try{
        assert.equal((await (await call("products")).json()).products.length,6);
        const created=await call("orders","POST",{requestKey:"test-order-001",total:0,items:[{id:1,quantity:2,price:0}]});
        assert.equal(created.status,201);const {order}=await created.json();assert.equal(order.totalCents,17800);
        assert.equal((await (await call("orders","POST",{requestKey:"test-order-001",items:[{id:1,quantity:2}]})).json()).order.id,order.id);
        assert.equal((await call("orders","POST",{requestKey:"test-order-001",items:[{id:1,quantity:3}]})).status,409);
        assert.equal((await call("orders","POST",{requestKey:"invalid-order",items:[{id:1,quantity:-1}]})).status,400);
        assert.equal((await call("products/1","PATCH",{name:"Nova",description:"Updated",priceCents:9000})).status,200);
        await call("orders/"+order.id,"PATCH",{status:"Completed"});
        const postResponse=await call("posts","POST",{title:"Նոր հոդված",category:"Backend",body:"Հոդվածը տվյալների բազայից է։"});
        assert.equal(postResponse.status,201);const {post}=await postResponse.json();
        await call("posts/"+post.id,"PATCH",{title:"Խմբագրված",category:"Backend",body:"Նոր տեքստ"});
        assert.equal((await call("messages","POST",{name:"Test",email:"invalid",message:"Text"})).status,400);
        const message=await (await call("messages","POST",{name:"Արմինե",email:"test@example.com",message:"Բարև"})).json();
        await call("messages/"+message.id,"PATCH",{read:true});
        const blocked=await fetch(base+"posts",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://untrusted.example"},body:'{}'});assert.equal(blocked.status,403);
        await new Promise(resolve=>server.close(resolve));base=await start();
        const savedOrders=(await (await call("orders")).json()).orders;
        assert.equal(savedOrders.length,1);assert.equal(savedOrders[0].status,"Completed");assert.equal(savedOrders[0].totalCents,17800);
        assert.equal((await (await call("products")).json()).products[0].price,90);
        assert.equal((await (await call("posts/"+post.id)).json()).post.title,"Խմբագրված");
        assert.equal((await (await call("messages")).json()).messages[0].is_read,true);
        await call("posts/"+post.id,"DELETE");assert.equal((await call("posts/"+post.id)).status,404);
    }finally{if(server?.listening)await new Promise(resolve=>server.close(resolve));await unlink(databasePath);await rmdir(directory);}
});

test("health and activity show database status and successful actions without message content",async()=>{
    const server=createTaskServer();await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const base=`http://127.0.0.1:${server.address().port}/api/`;
    try{
        const health=await(await fetch(base+"health")).json();assert.equal(health.status,"ok");assert.equal(health.storage,"SQLite");assert.equal(health.counts.products,6);
        await fetch(base+"messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"Private name",email:"private@example.com",message:"Private message"})});
        await fetch(base+"messages",{method:"POST",headers:{"Content-Type":"application/json"},body:'{}'});
        const history=await(await fetch(base+"activity")).json();assert.equal(history.activity.length,1);assert.equal(history.activity[0].path,"/api/messages");assert.equal(history.activity[0].method,"POST");
        assert.equal(JSON.stringify(history).includes("Private"),false);assert.equal(JSON.stringify(history).includes("private@example.com"),false);
        assert.equal((await(await fetch(base+"health")).json()).counts.messages,1);
    }finally{await new Promise(resolve=>server.close(resolve));}
});
