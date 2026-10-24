import {test,expect} from "@playwright/test";

test("login distinguishes confirmation and credential errors and requests a recovery email",async({page})=>{
  let code="email_not_confirmed",recoveries=0;
  await page.route("https://mmucgmsnlcfywypjokyw.supabase.co/auth/v1/**",async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname.endsWith("/token"))return route.fulfill({status:400,json:{code,error_code:code,msg:"Authentication failed"}});
    expect(url.pathname).toBe("/auth/v1/recover");
    expect(request.postDataJSON().email).toBe("reader@example.invalid");
    expect(url.searchParams.get("redirect_to")).toBe("http://127.0.0.1:4173/react-planner/");
    recoveries++;await route.fulfill({json:{}});
  });
  await page.goto("/react-planner/#/account");
  await page.locator("#account-email").fill("reader@example.invalid");await page.locator("#account-password").fill("test-password-only");
  await page.getByRole("button",{name:"Մուտք գործել",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("դեռ հաստատված չէ");
  code="invalid_credentials";
  await page.getByRole("button",{name:"Մուտք գործել",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("գաղտնաբառը սխալ է");
  await page.getByRole("button",{name:"Մոռացե՞լ ես գաղտնաբառը"}).click();
  await expect(page.getByRole("status")).toContainText("վերականգնման նամակ");
  expect(recoveries).toBe(1);
});

test("authenticated recovery can validate and save a new password",async({page})=>{
  const user={id:"11111111-1111-4111-8111-111111111111",email:"test@example.invalid",aud:"authenticated",role:"authenticated",app_metadata:{provider:"email"},user_metadata:{},created_at:"2026-01-01T00:00:00Z"};
  const expires=Math.floor(Date.now()/1000)+3600;
  const jwt=[{alg:"HS256",typ:"JWT"},{sub:user.id,exp:expires,aud:"authenticated"}].map(value=>Buffer.from(JSON.stringify(value)).toString("base64url")).join(".")+".test-signature";
  await page.addInitScript(({user,jwt,expires})=>localStorage.setItem("sb-mmucgmsnlcfywypjokyw-auth-token",JSON.stringify({access_token:jwt,refresh_token:"test-refresh",expires_at:expires,expires_in:3600,token_type:"bearer",user})),{user,jwt,expires});
  let updates=0;
  await page.route("https://mmucgmsnlcfywypjokyw.supabase.co/auth/v1/user",async route=>{
    if(route.request().method()==="PUT"){expect(route.request().postDataJSON().password).toBe("new-test-password");updates++;}
    await route.fulfill({json:user});
  });
  await page.goto("/react-planner/#/account");
  await page.locator("#new-password").fill("new-test-password");await page.locator("#confirm-password").fill("different-password");
  await page.getByRole("button",{name:"Պահպանել նոր գաղտնաբառը"}).click();
  await expect(page.getByRole("alert")).toContainText("չեն համընկնում");expect(updates).toBe(0);
  await page.locator("#confirm-password").fill("new-test-password");await page.getByRole("button",{name:"Պահպանել նոր գաղտնաբառը"}).click();
  await expect(page.getByRole("status")).toContainText("Նոր գաղտնաբառը պահպանված է");expect(updates).toBe(1);
  await expect(page.locator("#new-password")).toHaveValue("");
});
