document.addEventListener("DOMContentLoaded", () => {
    const main = document.querySelector("main");
    if (main && !document.querySelector(".skip-link")) {
        main.id ||= "main-content";
        main.tabIndex = -1;
        const skip = document.createElement("a");
        skip.className = "frontend-skip";
        skip.href = `#${main.id}`;
        skip.textContent = "Անցնել բովանդակությանը";
        document.body.prepend(skip);
    }
    const selectors = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex="0"]';
    const panels = [document.getElementById("project-modal"), document.getElementById("cart-panel")].filter(Boolean);
    panels.forEach(panel => {
        let open = false, trigger, background = [];
        function update() {
            const next = panel.classList.contains(panel.id === "cart-panel" ? "open" : "active");
            if (next === open) return;
            open = next;
            panel.inert = !open;
            panel.setAttribute("aria-hidden", String(!open));
            if (open) {
                trigger = document.activeElement;
                background = [...document.body.children].filter(el => el !== panel && !el.contains(panel) && el.id !== "cart-overlay" && !["SCRIPT", "STYLE"].includes(el.tagName)).map(el => [el, el.inert]);
                background.forEach(([el]) => { el.inert = true; });
                panel.querySelector(selectors)?.focus();
            } else {
                background.forEach(([el, previous]) => { el.inert = previous; });
                if (trigger && !panel.contains(trigger)) trigger.focus();
            }
        }
        panel.inert = true;
        panel.setAttribute("aria-hidden", "true");
        if (panel.id === "cart-panel") {
            panel.setAttribute("role", "dialog");
            panel.setAttribute("aria-modal", "true");
            panel.setAttribute("aria-label", "Զամբյուղ");
            document.getElementById("close-cart")?.setAttribute("aria-label", "Փակել զամբյուղը");
        }
        new MutationObserver(update).observe(panel, { attributes: true, attributeFilter: ["class"] });
        panel.addEventListener("keydown", event => {
            if (event.key !== "Tab" || !open) return;
            const elements = [...panel.querySelectorAll(selectors)].filter(el => el.getClientRects().length);
            const first = elements[0], last = elements.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        });
    });
    document.querySelectorAll(".filter-button").forEach(button => {
        const sync = () => button.setAttribute("aria-pressed", String(button.classList.contains("active")));
        sync(); new MutationObserver(sync).observe(button, { attributes: true, attributeFilter: ["class"] });
    });
    document.getElementById("toast")?.setAttribute("role", "status");
    document.getElementById("modal-close")?.setAttribute("aria-label", "Փակել պատուհանը");
});
