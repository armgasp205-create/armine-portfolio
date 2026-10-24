import { randomUUID } from "node:crypto";

const fail=(status,message)=>Object.assign(new Error(message),{status});
const text=(value,min,max,label)=>{
    if(typeof value!=="string" || value.trim().length<min || value.trim().length>max)throw fail(400,`${label}՝ ${min}–${max} նիշ։`);
    return value.trim();
};
async function json(request) {
    if(!request.headers["content-type"]?.startsWith("application/json"))throw fail(415,"Ուղարկիր JSON տվյալներ։");
    const chunks=[];let size=0;
    for await(const chunk of request){size+=chunk.length;if(size>32768)throw fail(413,"Հարցումը չափազանց մեծ է։");chunks.push(chunk);}
    try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw fail(400,"JSON-ի ձևաչափը սխալ է։");}
}

export function createPortfolioApi(db, publicOrigin = "") {
    db.exec(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,description TEXT NOT NULL,price_cents INTEGER NOT NULL,category TEXT NOT NULL,icon TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY,created_at TEXT NOT NULL,status TEXT NOT NULL,total_cents INTEGER NOT NULL,items TEXT NOT NULL,request_key TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,message TEXT NOT NULL,created_at TEXT NOT NULL,is_read INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY AUTOINCREMENT,method TEXT NOT NULL,path TEXT NOT NULL,status INTEGER NOT NULL,created_at TEXT NOT NULL);`);
    const seed=db.prepare("INSERT OR IGNORE INTO products (id,name,description,price_cents,category,icon) VALUES (?,?,?,?,?,?)");
    [[1,"Nova Headphones","Wireless headphones with clear sound.",8900,"tech","🎧"],[2,"Smart Watch X","Modern smartwatch for everyday use.",12900,"tech","⌚"],[3,"Urban Backpack","Minimal backpack for work and travel.",6400,"fashion","🎒"],[4,"Classic Sneakers","Comfortable sneakers with a clean design.",9500,"fashion","👟"],[5,"Minimal Glasses","Simple everyday glasses.",4200,"accessories","🕶️"],[6,"Desk Lamp Pro","Modern lamp for your workspace.",5800,"accessories","💡"]].forEach(row=>seed.run(...row));
    const now=new Date().toISOString();
    const seedPost=db.prepare("INSERT OR IGNORE INTO posts (id,title,category,body,created_at,updated_at) VALUES (?,?,?,?,?,?)");
    seedPost.run("html-css-javascript","Երեք լեզու, մեկ կայք","Հիմունքներ","HTML-ը ստեղծում է կառուցվածքը, CSS-ը ձևավորում է էջը, իսկ JavaScript-ը կառավարում է գործողությունները։",now,now);
    seedPost.run("react-components","Մեկ քարտից՝ շատ քարտեր","React","Կոմպոնենտը կրկին օգտագործվող մաս է։ Props-ով փոխանցում ենք տվյալներ, իսկ state-ով պահում փոփոխվող արժեքները։",now,now);
    seedPost.run("nextjs-pages","Առաջին քայլերը Next.js-ում","Next.js","App Router-ում page.tsx-ը ստեղծում է էջը։ Այժմ այս բլոգի հոդվածները կարդում ենք նաև մեր Node.js backend-ից։",now,now);
    const product=row=>({...row,price:row.price_cents/100});
    const order=row=>({id:row.id,date:row.created_at,status:row.status,amount:row.total_cents/100,totalCents:row.total_cents,items:JSON.parse(row.items),customer:"Տեղական պատվեր",product:JSON.parse(row.items).map(item=>`${item.name} × ${item.quantity}`).join(", ")});
    const post=row=>({id:row.id,slug:row.id,title:row.title,category:row.category,body:row.body,excerpt:row.body.slice(0,150),minutes:Math.max(1,Math.ceil(row.body.length/900)),sections:[{heading:row.title,text:row.body}],createdAt:row.created_at,updatedAt:row.updated_at});
    return async function handle(request,response,url,send) {
        if(["/api/health","/api/activity"].includes(url.pathname)) {
            if(request.method!=="GET")throw fail(405,"Օգտագործիր GET։");
            if(url.pathname==="/api/activity")send(200,{activity:db.prepare("SELECT * FROM activity ORDER BY id DESC LIMIT 100").all()});
            else {
                const counts={};for(const table of ["products","orders","messages"])counts[table]=db.prepare(`SELECT count(*) AS count FROM ${table}`).get().count;
                counts.posts=db.prepare("SELECT count(*) AS count FROM posts WHERE deleted=0").get().count;
                send(200,{status:"ok",storage:"SQLite",checkedAt:new Date().toISOString(),counts});
            }
            return true;
        }
        const match=url.pathname.match(/^\/api\/(products|orders|posts|messages)(?:\/([^/]+))?$/);
        if(!match)return false;
        if(request.headers.origin && request.headers.origin!==(publicOrigin || "http://"+request.headers.host))throw fail(403,"Հարցման աղբյուրը թույլատրված չէ։");
        const [,resource,id]=match;
        if(resource==="products") {
            if(request.method==="GET" && !id){send(200,{products:db.prepare("SELECT * FROM products ORDER BY id").all().map(product)});return true;}
            if(request.method==="PATCH" && id) {
                const previous=db.prepare("SELECT * FROM products WHERE id=?").get(id);
                if(!previous)throw fail(404,"Ապրանքը չի գտնվել։");
                const input=await json(request);
                const name=text(input?.name,1,80,"Անունը");
                const description=text(input?.description,1,300,"Նկարագրությունը");
                if(!Number.isSafeInteger(input.priceCents) || input.priceCents<1 || input.priceCents>10000000)throw fail(400,"Գինը պետք է լինի դրական ամբողջ ցենտերով։");
                db.prepare("UPDATE products SET name=?,description=?,price_cents=? WHERE id=?").run(name,description,input.priceCents,id);
                send(200,{product:product(db.prepare("SELECT * FROM products WHERE id=?").get(id))});return true;
            }
        }
        if(resource==="orders") {
            if(request.method==="GET" && !id){send(200,{orders:db.prepare("SELECT * FROM orders ORDER BY rowid DESC").all().map(order)});return true;}
            if(request.method==="POST" && !id) {
                const input=await json(request);
                const key=text(input?.requestKey,8,100,"Հարցման բանալին");
                const previous=db.prepare("SELECT * FROM orders WHERE request_key=?").get(key);
                if(previous){
                    const signature=items=>JSON.stringify(items.map(item=>({id:item?.id,quantity:item?.quantity})).sort((a,b)=>a.id-b.id));
                    if(!Array.isArray(input.items) || signature(input.items)!==signature(JSON.parse(previous.items)))throw fail(409,"Այս հարցման բանալիով այլ պատվեր արդեն պահպանված է։");
                    send(200,{order:order(previous)});return true;
                }
                if(!Array.isArray(input.items) || !input.items.length || input.items.length>30)throw fail(400,"Ընտրիր 1–30 ապրանք։");
                const seen=new Set();let total=0;
                const items=input.items.map(item=>{
                    if(!item || !Number.isInteger(item.id) || !Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>99 || seen.has(item.id))throw fail(400,"Ապրանքի քանակը կամ ID-ն սխալ է։");
                    seen.add(item.id);const p=db.prepare("SELECT * FROM products WHERE id=?").get(item.id);
                    if(!p)throw fail(400,"Ապրանքներից մեկը չի գտնվել։");
                    total+=p.price_cents*item.quantity;
                    return {id:p.id,name:p.name,quantity:item.quantity,priceCents:p.price_cents};
                });
                const orderId=randomUUID();
                db.prepare("INSERT INTO orders VALUES (?,?,?,?,?,?)").run(orderId,new Date().toISOString(),"Pending",total,JSON.stringify(items),key);
                send(201,{order:order(db.prepare("SELECT * FROM orders WHERE id=?").get(orderId))});return true;
            }
            if(request.method==="PATCH" && id) {
                const input=await json(request);
                if(!["Pending","Completed","Cancelled"].includes(input?.status))throw fail(400,"Պատվերի կարգավիճակը սխալ է։");
                if(!db.prepare("UPDATE orders SET status=? WHERE id=?").run(input.status,id).changes)throw fail(404,"Պատվերը չի գտնվել։");
                send(200,{order:order(db.prepare("SELECT * FROM orders WHERE id=?").get(id))});return true;
            }
        }
        if(resource==="posts") {
            if(request.method==="GET") {
                if(id){const row=db.prepare("SELECT * FROM posts WHERE id=? AND deleted=0").get(id);if(!row)throw fail(404,"Հոդվածը չի գտնվել։");send(200,{post:post(row)});}
                else send(200,{posts:db.prepare("SELECT * FROM posts WHERE deleted=0 ORDER BY rowid DESC").all().map(post)});
                return true;
            }
            if((request.method==="POST" && !id) || (request.method==="PATCH" && id)) {
                const input=await json(request);
                const title=text(input?.title,1,120,"Վերնագիրը"),category=text(input?.category,1,40,"Կատեգորիան"),body=text(input?.body,1,10000,"Հոդվածը");
                const updated=new Date().toISOString();const postId=id || randomUUID();
                if(id){if(!db.prepare("UPDATE posts SET title=?,category=?,body=?,updated_at=? WHERE id=? AND deleted=0").run(title,category,body,updated,id).changes)throw fail(404,"Հոդվածը չի գտնվել։");}
                else db.prepare("INSERT INTO posts (id,title,category,body,created_at,updated_at) VALUES (?,?,?,?,?,?)").run(postId,title,category,body,updated,updated);
                send(id ? 200 : 201,{post:post(db.prepare("SELECT * FROM posts WHERE id=?").get(postId))});return true;
            }
            if(request.method==="DELETE" && id){if(!db.prepare("UPDATE posts SET deleted=1 WHERE id=? AND deleted=0").run(id).changes)throw fail(404,"Հոդվածը չի գտնվել։");send(200,{deleted:id});return true;}
        }
        if(resource==="messages") {
            if(request.method==="GET" && !id){send(200,{messages:db.prepare("SELECT * FROM messages ORDER BY rowid DESC").all().map(row=>({...row,is_read:Boolean(row.is_read)}))});return true;}
            if(request.method==="POST" && !id){
                const input=await json(request);
                const name=text(input?.name,1,80,"Անունը"),email=text(input?.email,3,254,"Էլ․ հասցեն"),message=text(input?.message,1,5000,"Հաղորդագրությունը");
                if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fail(400,"Էլ․ հասցեն սխալ է։");
                const messageId=randomUUID();db.prepare("INSERT INTO messages (id,name,email,message,created_at) VALUES (?,?,?,?,?)").run(messageId,name,email,message,new Date().toISOString());
                send(201,{id:messageId,saved:true});return true;
            }
            if(request.method==="PATCH" && id){
                const input=await json(request);if(typeof input?.read!=="boolean")throw fail(400,"Նշիր read կարգավիճակը։");
                if(!db.prepare("UPDATE messages SET is_read=? WHERE id=?").run(Number(input.read),id).changes)throw fail(404,"Հաղորդագրությունը չի գտնվել։");
                send(200,{updated:id});return true;
            }
        }
        response.setHeader("Allow",resource==="products" ? "GET, PATCH" : "GET, POST, PATCH");
        throw fail(405,"Այս հասցեում գործողությունը չի թույլատրվում։");
    };
}
