import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { createTaskServer } from "./test-server.mjs";

test("React backend page supports real create, edit, completion, reload and delete", async () => {
    const server = createTaskServer();
    await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({viewport:{width:390,height:844}});
        await page.goto(`${base}/react-planner/#/backend`);
        const field = page.locator("#backend-text");
        await field.fill("Փորձնական առաջադրանք");
        await page.locator("#backend-due").fill("2020-01-01");
        await page.getByRole("button",{name:"Ավելացնել սերվերում"}).click();
        await page.locator(".backend-list li").waitFor();
        await page.locator(".backend-overdue").waitFor();
        await page.reload();
        await page.locator(".backend-list li").waitFor();
        assert.match(await page.locator(".backend-list").textContent(),/Փորձնական առաջադրանք/);
        await page.getByRole("button",{name:"Խմբագրել՝ Փորձնական առաջադրանք",exact:true}).click();
        await field.fill("Խմբագրված առաջադրանք");
        await page.getByRole("button",{name:"Պահպանել փոփոխությունը"}).click();
        await page.locator(".backend-list li").filter({hasText:"Խմբագրված առաջադրանք"}).waitFor();
        await page.locator('.backend-list input[type="checkbox"]').click();
        await page.locator(".backend-list .completed").waitFor();
        const data = await (await fetch(`${base}/api/tasks`)).json();
        assert.equal(data.tasks[0].done,true);
        assert.equal(data.tasks[0].due,"2020-01-01");
        assert.equal(data.tasks[0].text,"Խմբագրված առաջադրանք");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1),true);
        await page.getByRole("button",{name:"Ջնջել՝ Խմբագրված առաջադրանք",exact:true}).click();
        await page.getByText("Ցանկը դատարկ է։ Ավելացրու առաջին առաջադրանքը վերևի ձևով։").waitFor();
        assert.deepEqual(await (await fetch(`${base}/api/tasks`)).json(),{tasks:[]});
        await page.getByRole("button",{name:"Աղբարկղ (1)",exact:true}).click();
        await page.getByRole("button",{name:"Վերականգնել՝ Խմբագրված առաջադրանք",exact:true}).waitFor();
        await page.reload();
        await page.getByRole("button",{name:"Աղբարկղ (1)",exact:true}).click();
        await page.getByRole("button",{name:"Վերականգնել՝ Խմբագրված առաջադրանք",exact:true}).click();
        await page.getByText("Աղբարկղը դատարկ է։",{exact:true}).waitFor();
        await page.getByRole("button",{name:"Առաջադրանքներ (1)",exact:true}).click();
        await page.locator(".backend-list .completed").waitFor();
        const restored = await (await fetch(`${base}/api/tasks`)).json();
        assert.equal(restored.tasks[0].text,"Խմբագրված առաջադրանք");
        assert.equal(restored.tasks[0].due,"2020-01-01");
        await page.screenshot({path:"backend-learning/data/backend-preview.png",fullPage:true});
    } finally {
        await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
});

test("visible search and pagination really request the backend", async () => {
    const server = createTaskServer();
    await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch();
    try {
        for(let index=0;index<7;index++) await fetch(`${base}/api/tasks`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:`Դաս ${index}`,priority:index===0 ? "high" : "low"})});
        const page = await browser.newPage({viewport:{width:390,height:844}});
        await page.goto(base+"/react-planner/#/backend");
        await page.getByText("Գտնվել է 7 առաջադրանք",{exact:true}).waitFor();
        assert.equal(await page.locator(".backend-list li").count(),5);
        const downloadPromise=page.waitForEvent("download");
        await page.getByRole("button",{name:"Ներբեռնել JSON",exact:true}).click();
        const download=await downloadPromise;
        assert.equal(download.suggestedFilename(),"planner-tasks.json");
        const stream=await download.createReadStream();
        const chunks=[];for await(const chunk of stream)chunks.push(chunk);
        assert.equal(JSON.parse(Buffer.concat(chunks).toString("utf8")).tasks.length,7);
        await page.getByRole("button",{name:"Հաջորդը →"}).click();
        await page.getByText("Էջ 2 / 2",{exact:true}).waitFor();
        assert.equal(await page.locator(".backend-list li").count(),2);
        const request = page.waitForRequest(request => request.url().includes("/api/tasks?") && new URL(request.url()).searchParams.get("q")==="Դաս 0");
        await page.locator("#backend-search").fill("Դաս 0");
        await request;
        await page.getByText("Գտնվել է 1 առաջադրանք",{exact:true}).waitFor();
        assert.equal(await page.locator(".backend-list li").count(),1);
        await page.locator("#backend-status").selectOption("done");
        await page.getByText("Գտնվել է 0 առաջադրանք",{exact:true}).waitFor();
        await page.getByRole("button",{name:"Մաքրել զտիչները"}).click();
        await page.getByText("Գտնվել է 7 առաջադրանք",{exact:true}).waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1),true);
        await page.screenshot({path:"backend-learning/data/backend-preview.png",fullPage:true});
    } finally {await browser.close();await new Promise(resolve => server.close(resolve));}
});

test("file picker imports a backup and repeating it does not duplicate tasks",async()=>{
    const server=createTaskServer();await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const base=`http://127.0.0.1:${server.address().port}`;
    const browser=await chromium.launch();
    try {
        const page=await browser.newPage({viewport:{width:390,height:844}});
        await page.goto(base+"/react-planner/#/backend");
        await page.getByText("● Սերվերին միացված է",{exact:true}).waitFor();
        const file={name:"planner-tasks.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({version:1,view:"tasks",tasks:[{id:"browser-import",text:"Ներմուծված առաջադրանք",priority:"medium",done:false,due:""}]}))};
        await page.locator("#backend-import").setInputFiles(file);
        await page.getByRole("button",{name:"Ներմուծել պատճենը",exact:true}).click();
        await page.getByText("Ներմուծվել է 1 առաջադրանք։ Կրկնության պատճառով բաց է թողնվել 0։",{exact:true}).waitFor();
        await page.locator(".backend-list li").filter({hasText:"Ներմուծված առաջադրանք"}).waitFor();
        await page.locator("#backend-import").setInputFiles(file);
        await page.getByRole("button",{name:"Ներմուծել պատճենը",exact:true}).click();
        await page.getByText("Ներմուծվել է 0 առաջադրանք։ Կրկնության պատճառով բաց է թողնվել 1։",{exact:true}).waitFor();
        assert.equal((await (await fetch(base+"/api/tasks")).json()).tasks.length,1);
        await page.locator("#backend-import").setInputFiles({name:"bad.json",mimeType:"application/json",buffer:Buffer.from("{")});
        await page.getByRole("button",{name:"Ներմուծել պատճենը",exact:true}).click();
        await page.getByRole("alert").filter({hasText:"Ֆայլը վավեր JSON չէ"}).waitFor();
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
