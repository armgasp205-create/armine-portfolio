import {afterAll,beforeAll,expect,test} from "vitest";
import {PGlite} from "@electric-sql/pglite";
import {readFile} from "node:fs/promises";

let db;
const admin="11111111-1111-4111-8111-111111111111", user="22222222-2222-4222-8222-222222222222";
async function as(role,id="") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  await db.exec("set role "+role);
}
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;`);
  await db.query("insert into auth.users values($1,'admin@example.invalid',now()),($2,'reader@example.com',now())",[admin,user]);
  const migration=await readFile(new URL("../react-learning/supabase/portfolio-commerce.template.sql",import.meta.url),"utf8");
  await db.exec(migration);
  await db.exec(migration); // Repeatable setup preserves existing data.
  await db.query("insert into public.portfolio_administrators(user_id) values($1)",[admin]);
},30000);
afterAll(async()=>{if(db)await db.close();});

test("visitors read products but cannot read private orders or write prices",async()=>{
  await as("anon");
  expect((await db.query("select * from public.portfolio_products")).rows).toHaveLength(6);
  await expect(db.exec("select * from public.portfolio_orders")).rejects.toThrow(/permission denied/);
  await expect(db.exec("update public.portfolio_products set price_cents=1 where id=1")).rejects.toThrow(/permission denied/);
});
test("checkout calculates server prices, retries once and rejects changed or invalid items",async()=>{
  await as("anon");
  const place=(items,key)=>db.query("select public.portfolio_place_order($1::jsonb,$2) as value",[JSON.stringify(items),key]);
  const first=(await place([{id:1,quantity:2,priceCents:1}],"order-test-key")).rows[0].value;
  expect(first.total_cents).toBe(17800);
  const retry=(await place([{id:1,quantity:2}],"order-test-key")).rows[0].value;
  expect(retry.id).toBe(first.id);
  await expect(place([{id:1,quantity:3}],"order-test-key")).rejects.toThrow(/order_key_conflict/);
  await expect(place([{id:1,quantity:0}],"another-key")).rejects.toThrow(/invalid_quantity/);
  await expect(place([{id:1,quantity:1},{id:1,quantity:1}],"duplicate-key")).rejects.toThrow(/duplicate_product/);
});
test("ordinary accounts cannot administer products, posts, orders or messages",async()=>{
  await as("authenticated",user);
  expect((await db.query("select public.portfolio_is_admin() as value")).rows[0].value).toBe(false);
  expect((await db.query("update public.portfolio_products set price_cents=1 where id=1 returning id")).rows).toHaveLength(0);
  await expect(db.exec("insert into public.portfolio_posts(title,category,body) values('x','y','z')")).rejects.toThrow(/row-level security/);
  expect((await db.query("select * from public.portfolio_orders")).rows).toHaveLength(0);
  expect((await db.query("select * from public.portfolio_messages")).rows).toHaveLength(0);
});
test("confirmed administrator manages records but cannot overwrite order totals",async()=>{
  await as("authenticated",admin);
  expect((await db.query("select public.portfolio_is_admin() as value")).rows[0].value).toBe(true);
  expect((await db.query("update public.portfolio_products set price_cents=9000 where id=1 returning id")).rows).toHaveLength(1);
  expect((await db.query("insert into public.portfolio_posts(title,category,body) values('New post','News','Real content') returning id")).rows).toHaveLength(1);
  expect((await db.query("update public.portfolio_orders set status='Completed' returning id")).rows).toHaveLength(1);
  await expect(db.exec("update public.portfolio_orders set total_cents=1")).rejects.toThrow(/permission denied/);
  const logs=(await db.query("select * from public.portfolio_activity")).rows;
  expect(logs.length).toBeGreaterThan(0);
  expect(logs.some(log=>Object.hasOwn(log,"body"))).toBe(false);
});
test("contact submission stores messages privately and limits repeated sends",async()=>{
  await as("anon");
  const send=()=>db.query("select public.portfolio_send_message('Visitor','visitor@example.com','Hello') as value");
  for(let i=0;i<5;i++)expect((await send()).rows[0].value.saved).toBe(true);
  await expect(send()).rejects.toThrow(/message_limit/);
  await as("authenticated",admin);
  expect((await db.query("select * from public.portfolio_messages")).rows).toHaveLength(5);
  expect((await db.query("update public.portfolio_messages set is_read=true returning id")).rows).toHaveLength(5);
});
