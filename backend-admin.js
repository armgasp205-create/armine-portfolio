document.addEventListener("DOMContentLoaded",async()=>{
    const byId=id=>document.getElementById(id);
    const error=byId("admin-error");
    async function api(path,method="GET",body){
        if(window.PortfolioCloud?.enabled)return window.PortfolioCloud.request(path,method,body);
        const response=await fetch("/api/"+path,{method,headers:body===undefined?undefined:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000),cache:"no-store"});
        if(!response.headers.get("content-type")?.includes("application/json"))throw new Error("Բացիր այս էջը http://127.0.0.1:3002/backend-admin.html հասցեով։");
        const data=await response.json();if(!response.ok)throw new Error(data.error||"Սերվերի հարցումը չհաջողվեց։");return data;
    }
    const element=(tag,value)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=value;return node;};
    const button=(title,action)=>{const node=element("button",title);node.type="button";node.addEventListener("click",action);return node;};
    const money=cents=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);
    if(byId("article")){
        try{
            const id=new URLSearchParams(location.search).get("id");if(!id)throw new Error("Հոդվածի հասցեն սխալ է։");
            const {post}=await api("posts/"+encodeURIComponent(id));
            document.title=post.title+" | Արմինե";
            byId("article-title").textContent=post.title;byId("article-body").textContent=post.body;
            byId("article-category").textContent=post.category;byId("article-date").textContent="Թարմացված՝ "+new Date(post.updatedAt).toLocaleDateString("hy-AM");
        }catch(problem){error.textContent=problem.message;byId("article-title").textContent="Հոդվածը հասանելի չէ։";}
        return;
    }
    const accountLink=element("a","Մուտք գործել / Իմ հաշիվը");
    accountLink.href=window.PortfolioCloud?.url("react-planner/#/account") || "/react-planner/#/account";
    byId("admin-error").before(accountLink);
    try {
        const {user}=await api("auth/me");
        if(user.role!=="admin")throw new Error("Այս բաժինը հասանելի է միայն ադմինին։");
        accountLink.textContent=user.email+" · Իմ հաշիվը";
    } catch(problem) {
        error.textContent=problem.message;
        byId("server-health").textContent="Պահանջվում է ադմինի մուտք։";
        document.querySelectorAll("main form, main section, .admin-sections, .admin-search").forEach(node=>node.hidden=true);
        return;
    }
    let posts=[],products=[],pending=false;
    const theme=byId("admin-theme");
    function setTheme(light){document.documentElement.dataset.adminTheme=light?"light":"dark";theme.setAttribute("aria-pressed",String(light));theme.textContent=light?"Մուգ թեմա":"Բաց թեմա";try{localStorage.setItem("admin-theme",light?"light":"dark");}catch{}}
    try{setTheme(localStorage.getItem("admin-theme")==="light");}catch{setTheme(false);}
    theme.addEventListener("click",()=>setTheme(document.documentElement.dataset.adminTheme!=="light"));
    function filterLists(){
        const query=byId("admin-search").value.trim().toLocaleLowerCase();let total=0,visible=0;
        for(const id of ["orders-list","posts-list","products-list","messages-list","activity-list"]){
            const list=byId(id),rows=[...list.querySelectorAll("li[data-searchable]")];let matches=0;
            rows.forEach(row=>{row.hidden=Boolean(query)&&!row.textContent.toLocaleLowerCase().includes(query);total++;if(!row.hidden){matches++;visible++;}});
            let empty=byId(id+"-empty");if(!empty){empty=element("p","Այս բաժնում որոնմանը համապատասխան արդյունք չկա։");empty.id=id+"-empty";empty.className="list-empty";list.after(empty);}
            empty.hidden=!query||!rows.length||matches>0;
        }
        byId("search-summary").textContent=query ? `Գտնվել է ${visible} / ${total} գրառում` : "";
    }
    byId("admin-search").addEventListener("input",filterLists);
    function updateSection(){const current=location.hash||"#overview";document.querySelectorAll(".admin-sections a").forEach(link=>{if(link.getAttribute("href")===current)link.setAttribute("aria-current","location");else link.removeAttribute("aria-current");});}
    window.addEventListener("hashchange",updateSection);updateSection();
    async function run(action,success){
        if(pending)return;pending=true;error.textContent="";byId("admin-status").textContent="Պահպանվում է…";
        document.querySelectorAll("button").forEach(node=>node.disabled=true);
        try{await action();await load();byId("admin-status").textContent=success;try{localStorage.setItem("portfolio-backend-updated",String(Date.now()));}catch{}}
        catch(problem){error.textContent=problem.message;byId("admin-status").textContent="";}
        finally{pending=false;document.querySelectorAll("button").forEach(node=>node.disabled=false);}
    }
    function resetPost(){byId("post-form").reset();byId("post-id").value="";byId("post-category").value="Գրառում";}
    async function load(){
        const [p,o,b,m,health,history]=await Promise.all([api("products"),api("orders"),api("posts"),api("messages"),api("health"),api("activity")]);
        byId("server-health").dataset.state="ok";byId("server-health").textContent="● Սերվերն ու բազան աշխատում են · "+new Date(health.checkedAt).toLocaleTimeString("hy-AM");
        products=p.products;posts=b.posts;
        const overview=byId("overview");overview.replaceChildren();
        [[products.length,"Ապրանք"],[o.orders.length,"Պատվեր"],[posts.length,"Հոդված"],[m.messages.filter(item=>!item.is_read).length,"Չկարդացված"]].forEach(([value,label])=>{const card=element("article");card.append(element("strong",value),element("p",label));overview.append(card);});
        const orders=byId("orders-list");orders.replaceChildren();
        if(!o.orders.length)orders.append(element("li","Պատվեր դեռ չկա։ Ձևավորիր այն խանութում։"));
        o.orders.forEach(order=>{
            const row=element("li");row.append(element("strong","Պատվեր #"+order.id.slice(0,8)),element("p",order.product),element("p",money(order.totalCents)+" · "+new Date(order.date).toLocaleString("hy-AM")));
            const select=element("select");select.setAttribute("aria-label","Պատվերի կարգավիճակ՝ "+order.id.slice(0,8));
            [["Pending","Սպասող"],["Completed","Կատարված"],["Cancelled","Չեղարկված"]].forEach(([value,label])=>{const option=element("option",label);option.value=value;select.append(option);});
            select.value=order.status;select.addEventListener("change",()=>void run(()=>api("orders/"+order.id,"PATCH",{status:select.value}),"Պատվերի կարգավիճակը պահպանվել է։"));row.append(select);orders.append(row);
        });
        const articles=byId("posts-list");articles.replaceChildren();
        posts.forEach(post=>{
            const row=element("li"),link=element("a",post.title);link.href=window.PortfolioCloud?.enabled ? window.PortfolioCloud.url("blog-article.html?id="+encodeURIComponent(post.id)) : "blog-article.html?id="+encodeURIComponent(post.id);
            row.append(link,element("p",post.category+" · "+post.excerpt));
            const actions=element("div");actions.className="actions";
            actions.append(button("Խմբագրել հոդվածը",()=>{byId("post-id").value=post.id;byId("post-title").value=post.title;byId("post-category").value=post.category;byId("post-body").value=post.body;byId("post-title").focus();}),button("Հեռացնել ցանկից",()=>void run(()=>api("posts/"+post.id,"DELETE"),"Հոդվածը հեռացվել է բլոգի ցանկից։")));
            row.append(actions);articles.append(row);
        });
        const goods=byId("products-list");goods.replaceChildren();
        products.forEach(product=>{
            const row=element("li");row.append(element("strong",product.name+" · "+money(product.price_cents)),element("p",product.description),button("Խմբագրել ապրանքը",()=>{byId("product-form").hidden=false;byId("product-id").value=product.id;byId("product-name").value=product.name;byId("product-description").value=product.description;byId("product-price").value=(product.price_cents/100).toFixed(2);byId("product-name").focus();}));goods.append(row);
        });
        const messages=byId("messages-list");messages.replaceChildren();
        if(!m.messages.length)messages.append(element("li","Հաղորդագրություն դեռ չկա։ Ուղարկիր պորտֆոլիոյի կապի ձևից։"));
        m.messages.forEach(message=>{
            const row=element("li");row.append(element("strong",message.name+" · "+(message.is_read?"Կարդացված":"Նոր")),element("p",message.email+" · "+new Date(message.created_at).toLocaleString("hy-AM")),element("p",message.message),button(message.is_read?"Նշել չկարդացված":"Նշել կարդացված",()=>void run(()=>api("messages/"+message.id,"PATCH",{read:!message.is_read}),"Հաղորդագրության կարգավիճակը պահպանվել է։")));messages.append(row);
        });
        const activity=byId("activity-list");activity.replaceChildren();
        const resources={tasks:"Առաջադրանքներ",orders:"Պատվերներ",products:"Ապրանքներ",posts:"Հոդվածներ",messages:"Հաղորդագրություններ"};
        const actions={POST:"Ավելացում",PATCH:"Փոփոխություն",DELETE:"Հեռացում"};
        history.activity.forEach(item=>{const row=element("li");const resource=item.path.split("/")[2];const operation=item.path.endsWith("/restore")?"Վերականգնում":item.path.endsWith("/import")?"Ներմուծում":actions[item.method]||item.method;row.append(element("strong",`${resources[resource]||resource} · ${operation}`));const time=element("time",new Date(item.created_at).toLocaleString("hy-AM"));time.dateTime=item.created_at;time.className="activity-time";row.append(time);activity.append(row);});
        if(!history.activity.length)activity.append(element("li","Գործողությունների պատմությունը դեռ դատարկ է։"));
        for(const [list,count] of [[orders,o.orders.length],[articles,posts.length],[goods,products.length],[messages,m.messages.length],[activity,history.activity.length]])if(count)list.querySelectorAll("li").forEach(row=>row.dataset.searchable="true");
        filterLists();
    }
    byId("reload").addEventListener("click",()=>void run(async()=>{},"Տվյալները թարմացվել են։"));
    byId("post-cancel").addEventListener("click",resetPost);
    byId("post-form").addEventListener("submit",event=>{
        event.preventDefault();const id=byId("post-id").value;
        void run(async()=>{await api(id?"posts/"+id:"posts",id?"PATCH":"POST",{title:byId("post-title").value,category:byId("post-category").value,body:byId("post-body").value});resetPost();},"Հոդվածը պահպանվել է։ Այն արդեն տեսանելի է տեղական բլոգում։");
    });
    byId("product-form").addEventListener("submit",event=>{
        event.preventDefault();
        void run(async()=>{await api("products/"+byId("product-id").value,"PATCH",{name:byId("product-name").value,description:byId("product-description").value,priceCents:Math.round(Number(byId("product-price").value)*100)});byId("product-form").hidden=true;},"Ապրանքը պահպանվել է։ Թարմացրու խանութի էջը։");
    });
    try{await load();byId("admin-status").textContent="Բոլոր նախագծերի տվյալները բեռնված են սերվերից։";}catch(problem){error.textContent=problem.message;byId("server-health").dataset.state="error";byId("server-health").textContent="Սերվերին միանալ չհաջողվեց։";}
    setInterval(async()=>{
        if(pending || document.hidden || document.activeElement?.closest("form") || byId("post-title").value.trim() || !byId("product-form").hidden)return;
        pending=true;
        try{await load();}catch{byId("server-health").dataset.state="error";byId("server-health").textContent="Կապն ընդհատվել է։ Սեղմիր «Թարմացնել տվյալները»։";}finally{pending=false;}
    },30000);
});
