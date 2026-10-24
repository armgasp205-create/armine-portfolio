import {test,expect} from "@playwright/test";

test("cloud checkout, administrator edits and contact inbox share the online API",async({page})=>{
  const products=Array.from({length:6},(_,i)=>({id:i+1,name:"Product "+(i+1),description:"Product description",price_cents:8900,category:"tech",icon:"P"}));
  const posts=[{id:"post-1",title:"Cloud article",category:"News",body:"Article stored online",created_at:new Date().toISOString(),updated_at:new Date().toISOString()}];
  const orders=[],messages=[];
  await page.route("https://mmucgmsnlcfywypjokyw.supabase.co/rest/v1/**",async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname.replace("/rest/v1/","");
    const body=request.method()==="GET"?null:request.postDataJSON();
    let data;
    if(path==="rpc/portfolio_is_admin")data=request.headers().authorization==="Bearer admin-token";
    else if(path==="rpc/portfolio_place_order"){
      expect(body.order_items).toEqual([{id:1,quantity:1}]);
      const saved={id:"order-12345678",created_at:new Date().toISOString(),total_cents:8900,status:"Pending",items:[{id:1,name:"Product 1",quantity:1,priceCents:8900}]};orders.push(saved);data=saved;
    } else if(path==="rpc/portfolio_send_message") {messages.push({id:"message-1",name:body.sender_name,email:body.sender_email,message:body.message_text,is_read:false,created_at:new Date().toISOString()});data={saved:true,id:"message-1"};}
    else if(path==="portfolio_products"){if(body)Object.assign(products[0],body);data=body?[products[0]]:products;}
    else if(path==="portfolio_posts"){
      if(request.method()==="POST"){posts.push({...body,id:"post-2",created_at:new Date().toISOString(),updated_at:new Date().toISOString()});data=[posts.at(-1)];}
      else data=url.searchParams.has("id")?posts.filter(post=>post.id===url.searchParams.get("id").slice(3)):posts;
    }else if(path==="portfolio_orders")data=orders;
    else if(path==="portfolio_messages")data=messages;
    else if(path==="portfolio_activity")data=[];
    else throw new Error("Unexpected endpoint "+path);
    await route.fulfill({json:data});
  });
  await page.goto("/shop.html?cloud=1");
  await expect(page.locator(".product-card")).toHaveCount(6);
  await page.locator(".add-button").first().click();await page.locator("#cart-button").click();await page.locator("#checkout-button").click();
  await expect(page.locator("#cart-count")).toHaveText("0");
  expect(orders).toHaveLength(1);
  await page.goto("/backend-admin.html?cloud=1");
  await expect(page.locator("#admin-error")).not.toBeEmpty();
  await expect(page.locator("#post-form")).toBeHidden();
  await page.evaluate(()=>localStorage.setItem("sb-mmucgmsnlcfywypjokyw-auth-token",JSON.stringify({access_token:"admin-token",expires_at:Date.now()/1000+3600,user:{email:"admin@example.invalid"}})));
  await page.reload();
  await expect(page.locator("#orders-list")).toContainText("Product 1");
  await page.locator("#products-list").getByRole("button",{name:"Խմբագրել ապրանքը"}).first().click();
  await page.locator("#product-name").fill("Updated cloud product");
  await page.locator("#product-form").getByRole("button",{name:"Պահպանել ապրանքը"}).click();
  await expect(page.locator("#products-list")).toContainText("Updated cloud product");
  await page.locator("#post-title").fill("New online article");await page.locator("#post-category").fill("News");await page.locator("#post-body").fill("Text <script> stays text");
  await page.getByRole("button",{name:"Պահպանել հոդվածը",exact:true}).click();
  await expect(page.locator("#posts-list")).toContainText("New online article");
  await page.getByRole("link",{name:"New online article",exact:true}).click();
  await expect(page.locator("#article-body")).toHaveText("Text <script> stays text");
  await page.goto("/next-blog/?cloud=1");
  await page.getByRole("link",{name:"New online article",exact:true}).click();
  await expect(page.locator("#article-body")).toHaveText("Text <script> stays text");
  await page.goto("/index.html?cloud=1#contact");
  await page.locator("#name").fill("Visitor");await page.locator("#email").fill("visitor@example.com");await page.locator("#message-input").fill("Online message");await page.locator("#contact-submit").click();
  await expect(page.locator("#message")).toHaveClass("success");
  await page.goto("/backend-admin.html?cloud=1");await expect(page.locator("#messages-list")).toContainText("Online message");
  await page.goto("/dashboard.html?cloud=1");
  await expect(page.locator("#dashboard-period-status")).toContainText("1 saved orders");
});
