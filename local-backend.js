document.addEventListener("DOMContentLoaded",()=>{
    const cloud=Boolean(window.PortfolioCloud?.enabled);
    if(!cloud && !document.querySelector('meta[name="portfolio-backend"]'))return;
    document.body.classList.add("local-backend-active");
    const bar=document.createElement("div");bar.className="local-backend-bar";
    bar.append(cloud ? "Supabase online ? " : "Տեղական backend-ը միացված է · ");
    const link=document.createElement("a");link.href=cloud ? window.PortfolioCloud.url("backend-admin.html") : "/backend-admin.html";link.textContent="Բացել նախագծերի կառավարումը →";
    bar.append(link);document.body.prepend(bar);
});
