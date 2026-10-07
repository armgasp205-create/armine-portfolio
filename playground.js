document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("js-playground");
    if (!root) return;
    const copy = {
        hy: { title: "Փորձիր JavaScript-ը գործի մեջ", intro: "Ավելացրու քո առաջադրանքները, նշիր ավարտվածները և հետևիր առաջընթացին։ Ցանկը պահպանվում է այս բրաուզերում։", placeholder: "Օրինակ՝ ստեղծել responsive էջ", add: "Ավելացնել", all: "Բոլորը", active: "Ընթացիկ", done: "Ավարտված", empty: "Այս ցանկում առաջադրանքներ չկան։", remove: "Ջնջել", progress: "ավարտված", input: "Նոր առաջադրանք", toggle: "Փոխել առաջադրանքի կարգավիճակը" },
        ru: { title: "Попробуй JavaScript в действии", intro: "Добавляй задачи, отмечай выполненные и следи за прогрессом. Список сохраняется в этом браузере.", placeholder: "Например: создать адаптивную страницу", add: "Добавить", all: "Все", active: "Активные", done: "Готовые", empty: "В этом списке пока нет задач.", remove: "Удалить", progress: "выполнено", input: "Новая задача", toggle: "Изменить статус задачи" },
        en: { title: "Try JavaScript in action", intro: "Add tasks, mark them complete, and track your progress. Your list stays saved in this browser.", placeholder: "For example: build a responsive page", add: "Add task", all: "All", active: "Active", done: "Completed", empty: "No tasks in this list yet.", remove: "Delete", progress: "completed", input: "New task", toggle: "Change task status" }
    };
    const storageKey = "portfolio-playground-tasks-v1";
    let tasks = [];
    let filter = "all";
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
        if (Array.isArray(saved)) tasks = saved.filter(task => task && typeof task.id === "string" && typeof task.text === "string" && typeof task.done === "boolean").slice(0, 100);
    } catch { /* An unavailable or invalid store starts with an empty list. */ }
    const input = root.querySelector("input");
    const list = root.querySelector(".playground-list");
    const text = () => copy[document.documentElement.lang] || copy.hy;
    function save() {
        try { localStorage.setItem(storageKey, JSON.stringify(tasks)); } catch { /* Tasks still work in memory. */ }
    }
    function render() {
        const t = text();
        root.querySelector("h2").textContent = t.title;
        root.querySelector(".playground-intro").textContent = t.intro;
        input.placeholder = t.placeholder;
        input.setAttribute("aria-label", t.input);
        root.querySelector(".playground-add").textContent = t.add;
        root.querySelectorAll("[data-task-filter]").forEach(button => {
            button.textContent = t[button.dataset.taskFilter];
            button.setAttribute("aria-pressed", String(filter === button.dataset.taskFilter));
        });
        const completed = tasks.filter(task => task.done).length;
        root.querySelector(".playground-summary").textContent = `${completed} / ${tasks.length} ${t.progress}`;
        root.querySelector("progress").value = tasks.length ? completed / tasks.length * 100 : 0;
        root.querySelector("progress").setAttribute("aria-label", t.progress);
        list.replaceChildren();
        const visible = tasks.filter(task => filter === "all" || (filter === "done" ? task.done : !task.done));
        root.querySelector(".playground-empty").textContent = t.empty;
        root.querySelector(".playground-empty").hidden = visible.length > 0;
        visible.forEach(task => {
            const item = document.createElement("li");
            item.classList.toggle("is-complete", task.done);
            const label = document.createElement("label");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = task.done;
            checkbox.dataset.taskId = task.id;
            checkbox.setAttribute("aria-label", `${t.toggle}: ${task.text}`);
            const title = document.createElement("span");
            title.textContent = task.text;
            label.append(checkbox, title);
            const remove = document.createElement("button");
            remove.type = "button";
            remove.dataset.removeTask = task.id;
            remove.textContent = "×";
            remove.setAttribute("aria-label", `${t.remove}: ${task.text}`);
            item.append(label, remove);
            list.append(item);
        });
        root.querySelector(".playground-add").disabled = tasks.length >= 100;
    }
    root.querySelector("form").addEventListener("submit", event => {
        event.preventDefault();
        const value = input.value.trim();
        if (!value || tasks.length >= 100) { input.focus(); return; }
        tasks.push({ id: crypto.randomUUID(), text: value.slice(0, 120), done: false });
        filter = "all";
        input.value = "";
        save(); render(); input.focus();
    });
    list.addEventListener("change", event => {
        const task = tasks.find(task => task.id === event.target.dataset.taskId);
        if (!task) return;
        task.done = event.target.checked;
        save(); render();
        const remaining = Array.from(list.querySelectorAll("input")).find(element => element.dataset.taskId === task.id);
        (remaining || input).focus();
    });
    root.addEventListener("click", event => {
        const filterButton = event.target.closest("[data-task-filter]");
        if (filterButton) { filter = filterButton.dataset.taskFilter; render(); }
        const removeButton = event.target.closest("[data-remove-task]");
        if (removeButton) {
            tasks = tasks.filter(task => task.id !== removeButton.dataset.removeTask);
            save(); render(); input.focus();
        }
    });
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    window.addEventListener("storage", event => {
        if (event.key !== storageKey) return;
        try {
            const saved = JSON.parse(event.newValue || "[]");
            if (Array.isArray(saved)) tasks = saved.filter(task => task && typeof task.id === "string" && typeof task.text === "string" && typeof task.done === "boolean").slice(0, 100);
            render();
        } catch { /* Ignore malformed updates from another tab. */ }
    });
    render();
});
