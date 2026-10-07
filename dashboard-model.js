document.addEventListener("DOMContentLoaded", () => {
    const products = [{name: "Nova Headphones", price: 89}, {name: "Smart Watch X", price: 129}, {name: "Urban Backpack", price: 64}, {name: "Classic Sneakers", price: 95}];
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const orders = [];
    for (let day = 0; day < 90; day++) {
        for (let i = 0; i < 2 + day % 4; i++) {
            const product = products[(day + i) % 4];
            const date = new Date(today); date.setDate(today.getDate() - day);
            orders.push({id: 2000 - orders.length, date, customer: ["Anna", "David", "Maria", "Alex", "Sam", "Lena"][(day + i) % 6], product: product.name, amount: product.price * (1 + i % 2), status: (day + i) % 9 === 0 ? "Cancelled" : (day + i) % 5 === 0 ? "Pending" : "Completed"});
        }
    }
    const money = value => new Intl.NumberFormat("en-US", {style: "currency", currency: "USD", maximumFractionDigits: 0}).format(value);
    const select = document.getElementById("period-select");
    const theme = document.getElementById("theme-toggle");
    const viewAll = document.getElementById("view-all");
    let visible = [], expanded = false, toastTimer;
    function setTheme(light) {
        document.body.classList.toggle("light-mode", light);
        theme.textContent = light ? "☀️" : "🌙";
        theme.setAttribute("aria-pressed", String(light));
        theme.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
    }
    try {setTheme(localStorage.getItem("portfolio-theme") === "light");} catch {setTheme(false);}
    theme.addEventListener("click", () => {
        const light = !document.body.classList.contains("light-mode"); setTheme(light);
        try {localStorage.setItem("portfolio-theme", light ? "light" : "dark");} catch {}
    });
    function renderOrders() {
        const tbody = document.querySelector("tbody"); tbody.replaceChildren();
        (expanded ? visible : visible.slice(0, 5)).forEach(order => {
            const row = document.createElement("tr");
            ["#" + order.id, order.date.toLocaleDateString("en-GB"), order.customer, order.product, money(order.amount)].forEach(value => {
                const cell = document.createElement("td"); cell.textContent = value; row.append(cell);
            });
            const cell = document.createElement("td"), status = document.createElement("span");
            status.className = "status " + order.status.toLowerCase(); status.textContent = order.status;
            cell.append(status); row.append(cell); tbody.append(row);
        });
        viewAll.textContent = expanded ? "Show fewer" : `View all (${visible.length})`;
        viewAll.setAttribute("aria-expanded", String(expanded));
    }
    function renderPeriod() {
        const days = Number(select.value), cutoff = new Date(today); cutoff.setDate(today.getDate() - days + 1);
        const status = document.getElementById("order-status-filter").value;
        visible = orders.filter(order => order.date >= cutoff && (status === "all" || order.status === status));
        const completed = visible.filter(order => order.status === "Completed");
        const revenue = completed.reduce((sum, order) => sum + order.amount, 0);
        const metrics = [money(revenue), String(visible.length), String(new Set(visible.map(order => order.customer)).size), String(new Set(visible.map(order => order.product)).size)];
        document.querySelectorAll(".stat-card h2").forEach((element, i) => element.textContent = metrics[i]);
        document.querySelectorAll(".stat-change").forEach(element => element.textContent = `Last ${days} days · demo`);
        const buckets = Array.from({length: 7}, (_, i) => {
            const start = new Date(cutoff), end = new Date(cutoff);
            start.setDate(cutoff.getDate() + Math.floor(i * days / 7)); end.setDate(cutoff.getDate() + Math.floor((i + 1) * days / 7) - 1);
            return {start, end, amount: completed.filter(order => order.date >= start && order.date <= end).reduce((sum, order) => sum + order.amount, 0)};
        });
        const ceiling = Math.max(100, Math.ceil(Math.max(...buckets.map(bucket => bucket.amount)) / 100) * 100);
        document.querySelectorAll(".chart-y span").forEach((element, i) => element.textContent = money(ceiling * (5 - i) / 5));
        document.querySelectorAll(".bar").forEach((bar, i) => {
            const bucket = buckets[i]; bar.style.height = `${bucket.amount / ceiling * 100}%`;
            bar.querySelector("span").textContent = bucket.start.toLocaleDateString("en-GB", days === 7 ? {weekday: "short"} : {day: "numeric", month: "short"});
            const description = `${bucket.start.toLocaleDateString("en-GB")} – ${bucket.end.toLocaleDateString("en-GB")}: ${money(bucket.amount)}`;
            bar.title = description; bar.setAttribute("aria-label", description); bar.setAttribute("role", "img"); bar.tabIndex = 0;
        });
        const percentages = [Math.min(100, Math.round(revenue / (days * 300) * 100)), Math.round(completed.length / Math.max(1, visible.length) * 100), Math.round(visible.filter(order => order.status === "Pending").length / Math.max(1, visible.length) * 100), Math.round(visible.filter(order => order.status === "Cancelled").length / Math.max(1, visible.length) * 100)];
        document.querySelectorAll(".progress-item").forEach((item, i) => {
            item.querySelector(".progress-top span").textContent = ["Revenue target", "Completed orders", "Pending orders", "Cancelled orders"][i];
            item.querySelector("strong").textContent = percentages[i] + "%";
            item.querySelector(".progress > div").style.width = percentages[i] + "%";
        });
        document.getElementById("dashboard-period-status").textContent = `Last ${days} days: ${visible.length} sample orders, ${money(revenue)} completed revenue.`;
        expanded = false; renderOrders();
    }
    document.getElementById("order-status-filter").addEventListener("change", renderPeriod);
    select.addEventListener("change", renderPeriod);
    viewAll.addEventListener("click", () => {expanded = !expanded; renderOrders();});
    document.getElementById("export-orders").addEventListener("click", () => {
        const rows = [["Order", "Date", "Customer", "Product", "Amount USD", "Status"], ...visible.map(order => [order.id, order.date.toLocaleDateString("en-GB"), order.customer, order.product, order.amount, order.status])];
        const csv = rows.map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8"}));
        const link = document.createElement("a"); link.href = url; link.download = `demo-orders-${select.value}-days.csv`;
        document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        const toast = document.getElementById("toast"); clearTimeout(toastTimer); toast.textContent = "Sample orders exported"; toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
    });
    renderPeriod();
});
