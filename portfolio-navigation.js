document.addEventListener("DOMContentLoaded", () => {
    const links = Array.from(document.querySelectorAll(".nav-links a"));
    const sections = links.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
    let scheduled = false;
    function updateNavigation() {
        scheduled = false;
        let current = sections[0];
        for (const section of sections) if (section.getBoundingClientRect().top <= 160) current = section;
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10) current = sections.at(-1);
        links.forEach(link => {
            if (link.getAttribute("href") === "#" + current?.id) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        });
    }
    window.addEventListener("scroll", () => {if (!scheduled) {scheduled = true; requestAnimationFrame(updateNavigation);}}, {passive: true});
    window.addEventListener("resize", updateNavigation);
    const skip = document.querySelector(".skip-link");
    function translateSkip() {skip.textContent = {hy: "Անցնել բովանդակությանը", ru: "Перейти к содержимому", en: "Skip to content"}[document.documentElement.lang] || "Skip to content";}
    new MutationObserver(translateSkip).observe(document.documentElement, {attributes: true, attributeFilter: ["lang"]});
    translateSkip(); updateNavigation();
});
