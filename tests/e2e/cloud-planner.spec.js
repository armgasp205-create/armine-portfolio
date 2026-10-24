import {test,expect} from "@playwright/test";

test("published planner asks for login instead of requesting a local Node server",async({page})=>{
  let localRequests=0;
  page.on("request",request=>{if(new URL(request.url()).pathname.startsWith("/api/"))localRequests++;});
  await page.route("https://**",route=>route.abort());
  await page.goto("/react-planner/#/backend");
  await expect(page.getByRole("link",{name:"Բացել իմ հաշիվը"})).toBeVisible();
  expect(localRequests).toBe(0);
  await page.getByRole("link",{name:"Բացել իմ հաշիվը"}).click();
  await expect(page.locator("#account-email")).toBeVisible();
});

test("cloud planner uses Supabase for create, trash, restore and reload",async({page})=>{
  const user={id:"11111111-1111-4111-8111-111111111111",email:"test@example.com",aud:"authenticated",role:"authenticated",app_metadata:{provider:"email"},user_metadata:{},created_at:"2026-01-01T00:00:00Z"};
  const expires=Math.floor(Date.now()/1000)+3600;
  const jwt=[{alg:"HS256",typ:"JWT"},{sub:user.id,exp:expires,aud:"authenticated"}].map(value=>Buffer.from(JSON.stringify(value)).toString("base64url")).join(".")+".test-signature";
  await page.addInitScript(({user,jwt,expires})=>localStorage.setItem("sb-mmucgmsnlcfywypjokyw-auth-token",JSON.stringify({access_token:jwt,refresh_token:"test-refresh",expires_at:expires,expires_in:3600,token_type:"bearer",user})),{user,jwt,expires});
  let rows=[],requests=0;
  await page.route("https://mmucgmsnlcfywypjokyw.supabase.co/**",async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname==="/auth/v1/user")return route.fulfill({json:user});
    expect(url.pathname).toBe("/rest/v1/portfolio_tasks");
    requests++;
    expect(request.headers().authorization).toBe(`Bearer ${jwt}`);
    let data;
    if(request.method()==="POST") {
      const input=request.postDataJSON();
      expect(input.user_id).toBe(user.id);
      rows.push({...input,id:"22222222-2222-4222-8222-222222222222",done:false,deleted_at:null,created_at:new Date().toISOString()});
      data=rows.at(-1);
    } else {
      expect(url.searchParams.get("user_id")).toBe("eq."+user.id);
      if(request.method()==="PATCH") {Object.assign(rows[0],request.postDataJSON());data=rows[0];}
      else data=rows;
    }
    await route.fulfill({json:data});
  });
  await page.goto("/react-planner/#/backend");
  await expect(page.locator("#backend-text")).toBeEnabled();
  await page.locator("#backend-text").fill("Cloud test task");
  await page.getByRole("button",{name:"Ավելացնել սերվերում"}).click();
  await expect(page.locator(".backend-list .task-text")).toHaveText("Cloud test task");
  await page.reload();
  await expect(page.locator(".backend-list .task-text")).toHaveText("Cloud test task");
  await page.getByRole("button",{name:"Ջնջել՝ Cloud test task"}).click();
  await expect(page.locator(".backend-list li")).toHaveCount(0);
  await page.getByRole("button",{name:/Աղբարկղ \(1\)/}).click();
  await page.getByRole("button",{name:"Վերականգնել՝ Cloud test task"}).click();
  await page.getByRole("button",{name:/Առաջադրանքներ \(1\)/}).click();
  await expect(page.locator(".backend-list .task-text")).toHaveText("Cloud test task");
  expect(requests).toBeGreaterThan(5);
});
