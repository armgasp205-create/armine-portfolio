document.addEventListener("DOMContentLoaded",()=>{
    if(!document.querySelector('meta[name="portfolio-backend"]'))return;
    document.body.classList.add("local-backend-active");
    const bar=document.createElement("div");bar.className="local-backend-bar";
    bar.append("Տեղական backend-ը միացված է · ");
    const link=document.createElement("a");link.href="/backend-admin.html";link.textContent="Բացել նախագծերի կառավարումը →";
    bar.append(link);document.body.prepend(bar);
});
