(() => {
    const origin="https://mmucgmsnlcfywypjokyw.supabase.co";
    const key="sb_publishable_ROro5WJZJLiFSg15_VlTRg_M28oe0qG";
    const base=new URL(".",document.currentScript.src);
    const preview=new URLSearchParams(location.search).get("cloud")==="1";
    const enabled=!document.querySelector('meta[name="portfolio-backend"]') && (location.hostname==="armgasp205-create.github.io" || preview);
    if(enabled && /\/(backend-admin|dashboard)\.html$/.test(location.pathname))window.addEventListener("storage",event=>{
        if(event.key!=="sb-mmucgmsnlcfywypjokyw-auth-token")return;
        try {if(JSON.parse(event.oldValue || "null")?.user?.id!==JSON.parse(event.newValue || "null")?.user?.id)location.reload();}
        catch {location.reload();}
    });
    function session(){try{return JSON.parse(localStorage.getItem("sb-mmucgmsnlcfywypjokyw-auth-token") || "null");}catch{return null;}}
    async function rest(path,method="GET",body,prefer="return=representation"){
        const saved=session();
        const token=saved?.expires_at > Date.now()/1000 ? saved.access_token : null;
        const response=await fetch(origin+"/rest/v1/"+path,{method,headers:{apikey:key,...(token?{Authorization:"Bearer "+token}:{}),"Content-Type":"application/json",Prefer:prefer},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000),cache:"no-store"});
        const data=await response.json();
        if(!response.ok)throw new Error(response.status===401?"Մուտք գործիր քո հաշիվ։":response.status===403?"Այս գործողության իրավունքը չունես։":data.message==="message_limit"?"Այս էլ․ հասցեից ուղարկված հաղորդագրությունների սահմանը լրացել է։ Փորձիր ավելի ուշ։":"Առցանց հարցումը չհաջողվեց։ Թարմացրու էջը կամ փորձիր կրկին։");
        return data;
    }
    async function all(table,query="") {
        const rows=[];
        for(let offset=0;;offset+=1000){const page=await rest(table+"?"+query+(query?"&":"")+"limit=1000&offset="+offset);rows.push(...page);if(page.length<1000)return rows;}
    }
    const product=row=>({...row,price:row.price_cents/100});
    const post=row=>({...row,slug:row.id,excerpt:row.body.slice(0,150),minutes:Math.max(1,Math.ceil(row.body.length/900)),sections:[{heading:row.title,text:row.body}],createdAt:row.created_at,updatedAt:row.updated_at});
    const order=row=>({...row,date:row.created_at,totalCents:row.total_cents,amount:row.total_cents/100,customer:"Ուսումնական պատվեր",product:row.items.map(item=>item.name+" × "+item.quantity).join(", ")});
    async function request(path,method="GET",body){
        if(path==="auth/me"){
            const saved=session();if(!saved?.access_token)throw new Error("Մուտք գործիր քո հաշիվ։");
            const admin=await rest("rpc/portfolio_is_admin","POST",{});
            return {user:{email:saved.user?.email || "",role:admin?"admin":"user"}};
        }
        if(path==="health"){
            if(!await rest("rpc/portfolio_is_admin","POST",{}))throw new Error("Պահանջվում է ադմինի մուտք։");
            return {status:"ok",checkedAt:new Date().toISOString()};
        }
        if(path==="activity")return {activity:await rest("portfolio_activity?order=id.desc&limit=100")};
        const [resource,id]=path.split("/");
        if(!["products","posts","orders","messages"].includes(resource))throw new Error("Անհայտ գործողություն։");
        const table="portfolio_"+resource;
        if(method==="GET"){
            const query=resource==="products"?"order=id.asc":resource==="posts"?"deleted=eq.false&order=created_at.desc,id.desc":"order=created_at.desc,id.desc";
            const rows=await all(table,query+(id?"&id=eq."+encodeURIComponent(id):""));
            if(resource==="posts") {if(id && !rows.length)throw new Error("Հոդվածը չի գտնվել։");return id?{post:post(rows[0])}:{posts:rows.map(post)};}
            return {[resource]:resource==="products"?rows.map(product):resource==="orders"?rows.map(order):rows};
        }
        if(resource==="orders" && method==="POST")return {order:order(await rest("rpc/portfolio_place_order","POST",{order_items:body.items,order_key:body.requestKey}))};
        if(resource==="messages" && method==="POST")return rest("rpc/portfolio_send_message","POST",{sender_name:body.name,sender_email:body.email,message_text:body.message});
        let changes;
        if(resource==="products")changes={name:body.name,description:body.description,price_cents:body.priceCents};
        if(resource==="posts")changes=method==="DELETE"?{deleted:true}:{title:body.title,category:body.category,body:body.body};
        if(resource==="orders")changes={status:body.status};
        if(resource==="messages")changes={is_read:body.read};
        if(!id && !(resource==="posts" && method==="POST"))throw new Error("Գրառման հասցեն սխալ է։");
        const rows=await rest(table+(id?"?id=eq."+encodeURIComponent(id):""),id?"PATCH":"POST",changes);
        if(!rows.length)throw new Error("Գրառումը չի գտնվել կամ փոփոխության իրավունքը չունես։");
        return {saved:true};
    }
    window.PortfolioCloud={enabled,request,url:path=>{const url=new URL(path,base);if(preview)url.searchParams.set("cloud","1");return url.href;}};
})();
