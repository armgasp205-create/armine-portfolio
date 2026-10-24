import {test} from "node:test";
import assert from "node:assert/strict";
import {chromium,expect} from "@playwright/test";
import {createTaskServer} from "./test-server.mjs";

test("shop checkout feeds dashboard, blog manager feeds blog, contact feeds inbox",async()=>{
    const server=createTaskServer();await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const base=`http://127.0.0.1:${server.address().port}`;
    const browser=await chromium.launch();
    try {
        const page=await browser.newPage({viewport:{width:390,height:844}});
        const errors=[];page.on("pageerror",error=>errors.push(error.message));
        await page.goto(base+"/shop.html");
        await expect(page.locator(".product-card")).toHaveCount(6);
        await page.locator(".add-button").first().click();
        await page.locator("#cart-button").click();
        const submitted=page.waitForResponse(response=>response.url()===base+"/api/orders" && response.request().method()==="POST");
        await page.locator("#checkout-button").click();
        assert.equal((await submitted).status(),201);
        await expect(page.locator("#cart-count")).toHaveText("0");
        await page.goto(base+"/dashboard.html");
        await expect(page.locator("tbody tr")).toHaveCount(1);
        await expect(page.locator("#dashboard-period-status")).toContainText("1 saved orders");
        await page.goto(base+"/backend-admin.html");
        await page.locator("#post-title").fill("Backend փորձնական հոդված");
        await page.locator("#post-category").fill("Ուսում");
        await page.locator("#post-body").fill("Սա պահվում է SQLite-ում։ <script>Այս տեքստը չի գործարկվում</script>");
        await page.getByRole("button",{name:"Պահպանել հոդվածը",exact:true}).click();
        await expect(page.locator("#posts-list")).toContainText("Backend փորձնական հոդված");
        await page.goto(base+"/next-blog/");
        await page.getByRole("link",{name:"Backend փորձնական հոդված",exact:true}).click();
        await expect(page.locator("h1")).toHaveText("Backend փորձնական հոդված");
        await expect(page.locator("#article-body")).toContainText("<script>");
        await page.goto(base+"/index.html#contact");
        await page.locator("#name").fill("Backend փորձ");await page.locator("#email").fill("test@example.com");await page.locator("#message-input").fill("Տեսանելի հաղորդագրություն բազայում");
        await page.locator("#contact-submit").click();
        await expect(page.locator("#message")).toContainText("տեղական բազայում");
        await page.goto(base+"/backend-admin.html#messages");
        await expect(page.locator("#messages-list")).toContainText("Տեսանելի հաղորդագրություն բազայում");
        await page.getByRole("button",{name:"Նշել կարդացված",exact:true}).click();
        await expect(page.locator("#messages-list")).toContainText("Կարդացված");
        const orderSelect=page.locator("#orders-list select").first();
        await orderSelect.selectOption("Completed");
        await expect(page.locator("#admin-status")).toHaveText("Պատվերի կարգավիճակը պահպանվել է։");
        await page.goto(base+"/dashboard.html");
        await expect(page.locator("tbody")).toContainText("Completed");
        await expect(page.locator(".stat-card h2").first()).toHaveText("$89");
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
        await page.goto(base+"/backend-admin.html");
        await expect(page.locator("#admin-status")).toContainText("բեռնված");
        await page.screenshot({path:"backend-learning/data/portfolio-backend-preview.png",fullPage:true});
        assert.deepEqual(errors,[]);
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});

test("admin search, saved theme, activity and automatic dashboard refresh work together",async()=>{
    const server=createTaskServer();await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const base=`http://127.0.0.1:${server.address().port}`;
    const browser=await chromium.launch();
    try{
        const response=await fetch(base+"/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestKey:"global-test-order",items:[{id:1,quantity:1}]})});assert.equal(response.status,201);
        const context=await browser.newContext({viewport:{width:390,height:844}});const admin=await context.newPage();
        await admin.goto(base+"/backend-admin.html");
        await expect(admin.locator("#server-health")).toContainText("Սերվերն ու բազան աշխատում են");
        await admin.locator("#admin-theme").click();await admin.reload();
        await expect(admin.locator("html")).toHaveAttribute("data-admin-theme","light");
        await expect(admin.locator("#products-list li")).toHaveCount(6);
        await admin.locator("#admin-search").fill("Nova Headphones");
        await expect(admin.locator("#products-list li:visible")).toHaveCount(1);
        await admin.locator("#admin-search").fill("nothing-should-match");
        await expect(admin.locator("#products-list li:visible")).toHaveCount(0);
        await expect(admin.locator("#products-list-empty")).toBeVisible();
        await admin.locator("#admin-search").fill("");
        const dashboard=await context.newPage();await dashboard.goto(base+"/dashboard.html");
        await expect(dashboard.locator(".stat-card h2").first()).toHaveText("$0");
        await admin.bringToFront();await admin.locator("#orders-list select").selectOption("Completed");
        await expect(admin.locator("#admin-status")).toHaveText("Պատվերի կարգավիճակը պահպանվել է։");
        await expect(admin.locator("#activity-list")).toContainText("Պատվերներ · Փոփոխություն");
        await dashboard.bringToFront();await expect(dashboard.locator(".stat-card h2").first()).toHaveText("$89");
        await admin.bringToFront();assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
        await admin.screenshot({path:"backend-learning/data/admin-global-preview.png",fullPage:true});
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
