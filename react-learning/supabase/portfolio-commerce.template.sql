-- Project: mmucgmsnlcfywypjokyw. Existing tasks and snapshots are preserved.
begin;

-- New installations: assign a verified account UUID to portfolio_administrators
-- privately in SQL Editor. Browser clients cannot read or change this table.
create table if not exists public.portfolio_administrators (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.portfolio_administrators enable row level security;
revoke all on public.portfolio_administrators from public, anon, authenticated;

create or replace function public.portfolio_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u join public.portfolio_administrators a on a.user_id=u.id
    where u.id=auth.uid() and u.email_confirmed_at is not null);
$$;
revoke all on function public.portfolio_is_admin() from public;
grant execute on function public.portfolio_is_admin() to anon, authenticated;

create table if not exists public.portfolio_products (
  id integer primary key,
  name text not null check(char_length(btrim(name)) between 1 and 80),
  description text not null check(char_length(btrim(description)) between 1 and 300),
  price_cents integer not null check(price_cents between 1 and 10000000),
  category text not null,
  icon text not null
);
create table if not exists public.portfolio_posts (
  id text primary key default gen_random_uuid()::text,
  title text not null check(char_length(btrim(title)) between 1 and 120),
  category text not null check(char_length(btrim(category)) between 1 and 40),
  body text not null check(char_length(btrim(body)) between 1 and 10000),
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.portfolio_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'Pending' check(status in ('Pending','Completed','Cancelled')),
  total_cents bigint not null check(total_cents > 0),
  items jsonb not null check(jsonb_typeof(items) = 'array'),
  request_key text unique not null check(char_length(request_key) between 8 and 100)
);
create table if not exists public.portfolio_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check(char_length(btrim(name)) between 1 and 80),
  email text not null check(char_length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  message text not null check(char_length(btrim(message)) between 1 and 5000),
  created_at timestamptz not null default now(),
  is_read boolean not null default false
);
create table if not exists public.portfolio_activity (
  id bigint generated always as identity primary key,
  method text not null,
  path text not null,
  created_at timestamptz not null default now()
);
create index if not exists portfolio_messages_email_time on public.portfolio_messages(email,created_at);

alter table public.portfolio_products enable row level security;
alter table public.portfolio_posts enable row level security;
alter table public.portfolio_orders enable row level security;
alter table public.portfolio_messages enable row level security;
alter table public.portfolio_activity enable row level security;
revoke all on public.portfolio_products, public.portfolio_posts, public.portfolio_orders, public.portfolio_messages, public.portfolio_activity from public, anon, authenticated;
grant select on public.portfolio_products, public.portfolio_posts to anon, authenticated;
grant update(name,description,price_cents) on public.portfolio_products to authenticated;
grant insert(title,category,body), update(title,category,body,deleted,updated_at) on public.portfolio_posts to authenticated;
grant select on public.portfolio_orders, public.portfolio_messages, public.portfolio_activity to authenticated;
grant update(status) on public.portfolio_orders to authenticated;
grant update(is_read) on public.portfolio_messages to authenticated;

drop policy if exists products_read on public.portfolio_products;
create policy products_read on public.portfolio_products for select to anon, authenticated using(true);
drop policy if exists products_admin on public.portfolio_products;
create policy products_admin on public.portfolio_products for update to authenticated using(public.portfolio_is_admin()) with check(public.portfolio_is_admin());
drop policy if exists posts_read on public.portfolio_posts;
create policy posts_read on public.portfolio_posts for select to anon, authenticated using(not deleted or public.portfolio_is_admin());
drop policy if exists posts_create on public.portfolio_posts;
create policy posts_create on public.portfolio_posts for insert to authenticated with check(public.portfolio_is_admin());
drop policy if exists posts_update on public.portfolio_posts;
create policy posts_update on public.portfolio_posts for update to authenticated using(public.portfolio_is_admin()) with check(public.portfolio_is_admin());
drop policy if exists orders_admin on public.portfolio_orders;
create policy orders_admin on public.portfolio_orders for all to authenticated using(public.portfolio_is_admin()) with check(public.portfolio_is_admin());
drop policy if exists messages_admin on public.portfolio_messages;
create policy messages_admin on public.portfolio_messages for all to authenticated using(public.portfolio_is_admin()) with check(public.portfolio_is_admin());
drop policy if exists activity_admin on public.portfolio_activity;
create policy activity_admin on public.portfolio_activity for select to authenticated using(public.portfolio_is_admin());

-- The database calculates prices. Visitors cannot insert orders or change totals directly.
create or replace function public.portfolio_place_order(order_items jsonb, order_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare item jsonb; product public.portfolio_products; saved public.portfolio_orders;
  total bigint := 0; quantity integer; normalized jsonb := '[]'; signature jsonb;
begin
  if order_key is null or char_length(order_key) not between 8 and 100
    or jsonb_typeof(order_items) is distinct from 'array' then raise exception 'invalid_order'; end if;
  if jsonb_array_length(order_items) not between 1 and 30 then raise exception 'invalid_items'; end if;
  if exists(select 1 from jsonb_array_elements(order_items) as t(v)
    where jsonb_typeof(v) is distinct from 'object' or coalesce(v->>'id','') !~ '^[1-9][0-9]{0,8}$'
      or coalesce(v->>'quantity','') !~ '^[1-9][0-9]?$') then raise exception 'invalid_quantity'; end if;
  if (select count(distinct (v->>'id')::integer) from jsonb_array_elements(order_items) as t(v)) <> jsonb_array_length(order_items) then raise exception 'duplicate_product'; end if;
  select jsonb_agg(jsonb_build_object('id',(v->>'id')::integer,'quantity',(v->>'quantity')::integer) order by (v->>'id')::integer)
    into signature from jsonb_array_elements(order_items) as t(v);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(order_key,0));
  select * into saved from public.portfolio_orders where request_key=order_key;
  if found then
    if (select jsonb_agg(jsonb_build_object('id',v->'id','quantity',v->'quantity') order by (v->>'id')::integer)
      from jsonb_array_elements(saved.items) as t(v)) <> signature then raise exception 'order_key_conflict'; end if;
    return jsonb_build_object('id',saved.id,'created_at',saved.created_at,'status',saved.status,'total_cents',saved.total_cents,'items',saved.items);
  end if;
  for item in select value from jsonb_array_elements(signature) loop
    select * into product from public.portfolio_products where id=(item->>'id')::integer;
    if not found then raise exception 'product_not_found'; end if;
    quantity := (item->>'quantity')::integer;
    total := total + product.price_cents::bigint * quantity;
    normalized := normalized || jsonb_build_array(jsonb_build_object('id',product.id,'name',product.name,'quantity',quantity,'priceCents',product.price_cents));
  end loop;
  insert into public.portfolio_orders(total_cents,items,request_key) values(total,normalized,order_key) returning * into saved;
  return jsonb_build_object('id',saved.id,'created_at',saved.created_at,'status',saved.status,'total_cents',saved.total_cents,'items',saved.items);
end;
$$;
revoke all on function public.portfolio_place_order(jsonb,text) from public;
grant execute on function public.portfolio_place_order(jsonb,text) to anon, authenticated;

create or replace function public.portfolio_send_message(sender_name text, sender_email text, message_text text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved_id uuid;
begin
  if sender_name is null or sender_email is null or message_text is null then raise exception 'missing_fields'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(btrim(sender_email)),1));
  if (select count(*) from public.portfolio_messages where email=lower(btrim(sender_email)) and created_at > now()-interval '1 hour') >= 5 then raise exception 'message_limit'; end if;
  insert into public.portfolio_messages(name,email,message) values(btrim(sender_name),lower(btrim(sender_email)),btrim(message_text)) returning id into saved_id;
  return jsonb_build_object('id',saved_id,'saved',true);
end;
$$;
revoke all on function public.portfolio_send_message(text,text,text) from public;
grant execute on function public.portfolio_send_message(text,text,text) to anon, authenticated;

create or replace function public.portfolio_log_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.portfolio_activity(method,path) values(case when TG_OP='INSERT' then 'POST' else 'PATCH' end,'/api/' || replace(TG_TABLE_NAME,'portfolio_','') || '/' || new.id::text);
  return new;
end;
$$;
revoke all on function public.portfolio_log_change() from public, anon, authenticated;
drop trigger if exists portfolio_audit on public.portfolio_products;
create trigger portfolio_audit after insert or update on public.portfolio_products for each row execute function public.portfolio_log_change();
drop trigger if exists portfolio_audit on public.portfolio_posts;
create trigger portfolio_audit after insert or update on public.portfolio_posts for each row execute function public.portfolio_log_change();
drop trigger if exists portfolio_audit on public.portfolio_orders;
create trigger portfolio_audit after insert or update on public.portfolio_orders for each row execute function public.portfolio_log_change();
drop trigger if exists portfolio_audit on public.portfolio_messages;
create trigger portfolio_audit after insert or update on public.portfolio_messages for each row execute function public.portfolio_log_change();

create or replace function public.portfolio_stamp_post()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
revoke all on function public.portfolio_stamp_post() from public, anon, authenticated;
drop trigger if exists portfolio_post_updated on public.portfolio_posts;
create trigger portfolio_post_updated before update on public.portfolio_posts for each row execute function public.portfolio_stamp_post();

insert into public.portfolio_products(id,name,description,price_cents,category,icon) values
  (1,'Nova Headphones','Wireless headphones with clear sound.',8900,'tech','🎧'),
  (2,'Smart Watch X','Modern smartwatch for everyday use.',12900,'tech','⌚'),
  (3,'Urban Backpack','Minimal backpack for work and travel.',6400,'fashion','🎒'),
  (4,'Classic Sneakers','Comfortable sneakers with a clean design.',9500,'fashion','👟'),
  (5,'Minimal Glasses','Simple everyday glasses.',4200,'accessories','🕶️'),
  (6,'Desk Lamp Pro','Modern lamp for your workspace.',5800,'accessories','💡') on conflict(id) do nothing;
insert into public.portfolio_posts(id,title,category,body) values
  ('html-css-javascript','Երեք լեզու, մեկ կայք','Հիմունքներ','HTML-ը ստեղծում է կառուցվածքը, CSS-ը ձևավորում է էջը, իսկ JavaScript-ը կառավարում է գործողությունները։'),
  ('react-components','Մեկ քարտից՝ շատ քարտեր','React','Կոմպոնենտը կրկին օգտագործվող մաս է։ Props-ով փոխանցում ենք տվյալներ, իսկ state-ով պահում փոփոխվող արժեքները։'),
  ('nextjs-pages','Առաջին քայլերը Next.js-ում','Next.js','App Router-ում page.tsx-ը ստեղծում է էջը։ Այս բլոգի հոդվածներն այժմ պահվում են առցանց բազայում։') on conflict(id) do nothing;

commit;
select 'portfolio commerce ready' as result;
