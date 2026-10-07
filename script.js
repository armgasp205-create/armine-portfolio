document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const themeButton = document.getElementById("theme-toggle");
    const modal = document.getElementById("project-modal");
    const closeButton = document.getElementById("modal-close");
    const title = document.getElementById("modal-title");
    const description = document.getElementById("modal-description");
    const tech = document.getElementById("modal-tech");
    const modalProjectLink = document.getElementById("modal-project-link");
    const modalCaseLink = document.getElementById("modal-case-link");
    let lastFocusedElement = null;

    const projects = {
        shop: { title: "Modern Shop", description: "Учебная витрина: поиск товаров, фильтры категорий и корзина с изменением количества, расчётом суммы и сохранением в localStorage.", tech: ["HTML", "CSS", "JavaScript"], url: "shop.html", caseStudy: "case-study.html?project=shop" },
        dashboard: { title: "Admin Dashboard", description: "Демо dashboard: фильтрация за 7/30/90 дней, пересчёт диаграммы и показателей, список заказов и экспорт CSV.", tech: ["HTML", "CSS", "JavaScript"], url: "dashboard.html", caseStudy: "case-study.html?project=dashboard" },
        weather: { title: "Приложение погоды", description: "Погода с поиском города, текущими показателями и пятидневным прогнозом из Open-Meteo API.", tech: ["HTML", "CSS", "JavaScript", "API"], url: "weather.html", caseStudy: "case-study.html?project=weather" },
        music: { title: "Музыкальный плеер", description: "Web Audio плеер: три синтезированные мелодии, настоящая пауза и продолжение, перемотка и регулировка громкости.", tech: ["HTML", "CSS", "JavaScript", "Web Audio"], url: "music.html", caseStudy: "case-study.html?project=music" },
        planner: { title: "Планировщик задач на React", description: "React-планировщик с тремя страницами, приоритетами, сроками, поиском, сменой темы и импортом примеров из API.", tech: ["React", "TypeScript", "React Router", "CSS", "Vite"], url: "react-planner/", caseStudy: "case-study.html?project=planner" }
    };

    let heroTypingTimer;
    const heroMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    function animateHero(language) {
        window.clearTimeout(heroTypingTimer);
        const heading = document.querySelector(".hero-content h1");
        if (!heading) return;
        const phrases = {
            hy: ["Front-End ծրագրավորող", "Responsive կայքեր", "Ինտերակտիվ կայքեր"],
            ru: ["Front-End разработчик", "Адаптивные сайты", "Интерактивные сайты"],
            en: ["Front-End Developer", "Responsive Websites", "Interactive Websites"]
        }[language];
        heading.setAttribute("aria-label", phrases[0]);
        const animated = document.createElement("span");
        animated.setAttribute("aria-hidden", "true");
        animated.textContent = phrases[0];
        heading.replaceChildren(animated);
        if (heroMotion.matches) return;
        animated.classList.add("typing");
        let phraseIndex = 0;
        let deleting = true;
        let characters = Array.from(phrases[0]);
        function tick() {
            if (deleting) {
                characters.pop();
                animated.textContent = characters.join("") || "\u00a0";
                if (!characters.length) {
                    deleting = false;
                    phraseIndex = (phraseIndex + 1) % phrases.length;
                    heroTypingTimer = window.setTimeout(tick, 300);
                    return;
                }
            } else {
                const next = Array.from(phrases[phraseIndex]);
                characters.push(next[characters.length]);
                animated.textContent = characters.join("");
                if (characters.length === next.length) {
                    deleting = true;
                    heroTypingTimer = window.setTimeout(tick, 2200);
                    return;
                }
            }
            heroTypingTimer = window.setTimeout(tick, deleting ? 40 : 85);
        }
        heroTypingTimer = window.setTimeout(tick, 2200);
    }
    heroMotion.addEventListener("change", () => animateHero(document.documentElement.lang));
    function setTheme(isLight) {
        body.classList.toggle("light-mode", isLight);
        themeButton?.setAttribute("aria-pressed", String(isLight));
        themeButton?.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
        if (themeButton) themeButton.textContent = isLight ? "☀️" : "🌙";
        localStorage.setItem("portfolio-theme", isLight ? "light" : "dark");
    }

    if (themeButton) {
        setTheme(localStorage.getItem("portfolio-theme") === "light");
        themeButton.addEventListener("click", () => setTheme(!body.classList.contains("light-mode")));
    }

    function setText(selector, text) {
        const element = document.querySelector(selector);
        if (element) element.textContent = text;
    }

    function applyRussianContent() {
        setText(".logo", "АРМИНЕ");
        const navText = ["Главная", "Обо мне", "Навыки", "Проекты", "Контакты"];
        document.querySelectorAll(".nav-links a").forEach((link, index) => link.textContent = navText[index]);
        setText(".hero-label", "FRONT-END РАЗРАБОТЧИК");
        const heroTitle = document.querySelector(".hero-content h1");
        if (heroTitle) {
            const name = document.createElement("span");
            name.textContent = "разработчик";
            heroTitle.replaceChildren("Front-End ", name);
        }
        setText(".hero-content p", "Я создаю красивые, быстрые и удобные сайты с помощью HTML, CSS и JavaScript.");
        ["Смотреть проекты", "Связаться"].forEach((text, index) => setText(`.hero-buttons .btn:nth-child(${index + 1})`, text));
        const headings = document.querySelectorAll(".section-title h2");
        ["Обо мне", "Навыки", "Проекты", "Давайте сотрудничать"].forEach((text, index) => { if (headings[index]) headings[index].textContent = text; });
        const about = document.querySelectorAll(".about-text p");
        if (about[0]) about[0].textContent = "Я начинающий Front-End разработчик и люблю превращать идеи в современные сайты.";
        if (about[1]) about[1].textContent = "Я постоянно учусь, развиваю навыки и создаю новые проекты.";
        const skillDescriptions = ["Создаю понятную и доступную структуру сайтов.", "Делаю адаптивные, современные и красивые интерфейсы.", "Добавляю интерактивность и полезные функции."];
        document.querySelectorAll(".skill-card p").forEach((paragraph, index) => paragraph.textContent = skillDescriptions[index]);
        const projectTexts = [["Интернет-магазин — Modern Shop", "Учебная витрина: поиск товаров, фильтры категорий и корзина с изменением количества, расчётом суммы и сохранением в localStorage."], ["Admin Dashboard", "Демо dashboard: фильтрация за 7/30/90 дней, пересчёт диаграммы и показателей, список заказов и экспорт CSV."], ["Приложение погоды", "Погода с поиском города, текущими показателями и пятидневным прогнозом из Open-Meteo API."], ["Музыкальный плеер", "Web Audio плеер: три синтезированные мелодии, настоящая пауза и продолжение, перемотка и регулировка громкости."], ["Планировщик задач на React", "React-планировщик с тремя страницами, приоритетами, сроками, поиском, сменой темы и импортом примеров из API."]];
        document.querySelectorAll(".project-card").forEach((card, index) => {
            card.querySelector("h3").textContent = projectTexts[index][0];
            card.querySelector(".project-info p").textContent = projectTexts[index][1];
        });
        ["Все", "Магазин", "Инструменты", "Творчество"].forEach((text, index) => setText(`.filter-button:nth-child(${index + 1})`, text));
        document.getElementById("project-search")?.setAttribute("placeholder", "Поиск проектов...");
        setText(".contact-content > p", "Напишите мне, если хотите сотрудничать или у вас есть идея для проекта.");
        document.getElementById("name")?.setAttribute("placeholder", "Ваше имя");
        document.getElementById("email")?.setAttribute("placeholder", "Ваш email");
        document.getElementById("message-input")?.setAttribute("placeholder", "Ваше сообщение");
        setText("#contact-submit", "Отправить сообщение");
        setText("#modal-project-link", "Открыть проект");
        const stats = document.querySelectorAll(".stat-label");
        ["Создано проектов", "Основные навыки", "Языки интерфейса"].forEach((text, index) => { if (stats[index]) stats[index].textContent = text; });
    }

    applyRussianContent();

    const languageButtons = document.querySelectorAll(".language-button");
    const processTranslations = {
        hy: { title: "Ինչպես եմ աշխատում", cards: [["Բացահայտում", "Սահմանում ենք կայքի նպատակը, լսարանը և հիմնական հնարավորությունները։"], ["Դիզայն", "Ստեղծում եմ մաքուր ու responsive դիզայն՝ բոլոր էկրանների համար։"], ["Կառուցում", "Դիզայնը դարձնում եմ արագ, ինտերակտիվ և գեղեցիկ կայք։"]] },
        ru: { title: "Как я работаю", cards: [["Идея", "Определяем цель сайта, аудиторию и основные функции."], ["Дизайн", "Создаю чистый адаптивный интерфейс для всех экранов."], ["Разработка", "Превращаю дизайн в быстрый, интерактивный и удобный сайт."]] },
        en: { title: "How I work", cards: [["Discover", "We define the purpose, audience, and key features of your website."], ["Design", "I create a clean, responsive interface that feels great on every screen."], ["Build", "I turn the design into a fast, interactive, and polished website."]] }
    };
    function setProcessLanguage(language) {
        const content = processTranslations[language];
        setText("#process-title", content.title);
        document.querySelectorAll(".process-card").forEach((card, index) => {
            card.querySelector("h3").textContent = content.cards[index][0];
            card.querySelector("p").textContent = content.cards[index][1];
        });
    }
    const alternateLanguages = {
        hy: {
            logo: "ԱՐՄԻՆԵ", nav: ["Գլխավոր", "Իմ մասին", "Հմտություններ", "Նախագծեր", "Կապ"], label: "FRONT-END ՄՇԱԿՈՂ", hero: ["Front-End ", "ծրագրավորող"],
            intro: "Ես ստեղծում եմ գեղեցիկ, արագ և հարմարավետ կայքեր HTML, CSS և JavaScript-ով։", buttons: ["Տեսնել նախագծերը", "Կապ հաստատել"], headings: ["Իմ մասին", "Հմտություններ", "Նախագծեր", "Եկեք համագործակցենք"],
            about: ["Ես սկսնակ Front-End մշակող եմ և սիրում եմ գաղափարները դարձնել ժամանակակից կայքեր։", "Ամեն օր սովորում եմ, զարգացնում եմ հմտություններս և ստեղծում նոր նախագծեր։"],
            skills: ["Ստեղծում եմ հասանելի ու ճիշտ կառուցվածքով կայքեր։", "Պատրաստում եմ responsive, ժամանակակից և գեղեցիկ ինտերֆեյսներ։", "Ավելացնում եմ ինտերակտիվություն և օգտակար հնարավորություններ։"],
            projectTexts: [["Առցանց խանութ — Modern Shop", "Ուսումնական խանութ՝ ապրանքների որոնմամբ, կատեգորիաների զտմամբ և զամբյուղով՝ քանակի փոփոխություն, գումարի հաշվարկ ու պահպանում localStorage-ում։"], ["Admin Dashboard", "Ցուցադրական dashboard՝ 7/30/90 օրվա զտմամբ, վերահաշվարկվող գրաֆիկով ու ցուցանիշներով, պատվերների ցանկով և CSV ներբեռնմամբ։"], ["Եղանակի հավելված", "Եղանակի հավելված՝ քաղաքների որոնմամբ, ընթացիկ տվյալներով և հնգօրյա կանխատեսմամբ՝ Open-Meteo API-ից։"], ["Երաժշտական նվագարկիչ", "Web Audio նվագարկիչ՝ երեք սինթեզված մեղեդով, իրական pause/resume-ով, ձայնի տեղափոխմամբ և ուժգնության կառավարմամբ։"], ["React առաջադրանքների պլանավորիչ", "React պլանավորիչ՝ երեք էջով, կարևորությամբ ու ժամկետներով, որոնմամբ, թեմայի փոխարկմամբ և API-ից օրինակների ներմուծմամբ։"]],
            filters: ["Բոլորը", "Խանութ", "Գործիքներ", "Ստեղծարար"], search: "Որոնել նախագծեր...", contact: "Գրիր ինձ, եթե ցանկանում ես համագործակցել կամ ունես նոր գաղափար։", placeholders: ["Քո անունը", "Քո email-ը", "Քո հաղորդագրությունը"], send: "Ուղարկել հաղորդագրությունը", modal: "Բացել նախագիծ", stats: ["Ստեղծված նախագծեր", "Հիմնական հմտություններ", "Կայքի լեզուներ"], modalProjects: [["Modern Shop", "Ուսումնական խանութ՝ ապրանքների որոնմամբ, կատեգորիաների զտմամբ և զամբյուղով՝ քանակի փոփոխություն, գումարի հաշվարկ ու պահպանում localStorage-ում։"], ["Admin Dashboard", "Ցուցադրական dashboard՝ 7/30/90 օրվա զտմամբ, վերահաշվարկվող գրաֆիկով ու ցուցանիշներով, պատվերների ցանկով և CSV ներբեռնմամբ։"], ["Եղանակի հավելված", "Եղանակի հավելված՝ քաղաքների որոնմամբ, ընթացիկ տվյալներով և հնգօրյա կանխատեսմամբ՝ Open-Meteo API-ից։"], ["Երաժշտական նվագարկիչ", "Web Audio նվագարկիչ՝ երեք սինթեզված մեղեդով, իրական pause/resume-ով, ձայնի տեղափոխմամբ և ուժգնության կառավարմամբ։"], ["React առաջադրանքների պլանավորիչ", "React պլանավորիչ՝ երեք էջով, կարևորությամբ ու ժամկետներով, որոնմամբ, թեմայի փոխարկմամբ և API-ից օրինակների ներմուծմամբ։"]]
        },
        en: {
            logo: "ARMINE", nav: ["Home", "About", "Skills", "Projects", "Contact"], label: "FRONT-END DEVELOPER", hero: ["Front-End ", "Developer"],
            intro: "I build beautiful, fast, and user-friendly websites with HTML, CSS, and JavaScript.", buttons: ["View projects", "Get in touch"], headings: ["About me", "Skills", "Projects", "Let’s work together"],
            about: ["I am a junior Front-End developer who enjoys turning ideas into modern websites.", "I learn every day, grow my skills, and create new projects."],
            skills: ["I build clear, accessible, and semantic website structures.", "I create responsive, modern, and polished interfaces.", "I add interactivity and useful functionality."],
            projectTexts: [["Online Shop — Modern Shop", "A demo storefront with product search, category filters, and a cart with quantity controls, total calculation, and localStorage persistence."], ["Admin Dashboard", "A demo dashboard with 7/30/90-day filtering, recalculated charts and metrics, an orders list, and CSV export."], ["Weather App", "City search, current weather indicators, and a five-day forecast from the Open-Meteo API."], ["Music Player", "A Web Audio player with three synthesized melodies, working pause/resume, seeking, and volume control."], ["React Task Planner", "A React planner with three pages, priorities, due dates, search, theme switching, and API example imports."]],
            filters: ["All", "Commerce", "Tools", "Creative"], search: "Search projects...", contact: "Send me a message if you would like to collaborate or have a project in mind.", placeholders: ["Your name", "Your email", "Your message"], send: "Send message", modal: "Open project", stats: ["Projects built", "Core skills", "Interface languages"], modalProjects: [["Modern Shop", "A demo storefront with product search, category filters, and a cart with quantity controls, total calculation, and localStorage persistence."], ["Admin Dashboard", "A demo dashboard with 7/30/90-day filtering, recalculated charts and metrics, an orders list, and CSV export."], ["Weather App", "City search, current weather indicators, and a five-day forecast from the Open-Meteo API."], ["Music Player", "A Web Audio player with three synthesized melodies, working pause/resume, seeking, and volume control."], ["React Task Planner", "A React planner with three pages, priorities, due dates, search, theme switching, and API example imports."]]
        }
    };

    function applyAlternateLanguage(language) {
        const t = alternateLanguages[language];
        document.documentElement.lang = language;
        setText(".logo", t.logo);
        document.querySelectorAll(".nav-links a").forEach((link, index) => link.textContent = t.nav[index]);
        setText(".hero-label", t.label);
        const heroTitle = document.querySelector(".hero-content h1");
        if (heroTitle) { const name = document.createElement("span"); name.textContent = t.hero[1]; heroTitle.replaceChildren(t.hero[0], name); }
        setText(".hero-content p", t.intro);
        t.buttons.forEach((text, index) => setText(`.hero-buttons .btn:nth-child(${index + 1})`, text));
        document.querySelectorAll(".section-title h2").forEach((heading, index) => heading.textContent = t.headings[index]);
        document.querySelectorAll(".about-text p").forEach((paragraph, index) => paragraph.textContent = t.about[index]);
        document.querySelectorAll(".skill-card p").forEach((paragraph, index) => paragraph.textContent = t.skills[index]);
        document.querySelectorAll(".project-card").forEach((card, index) => { card.querySelector("h3").textContent = t.projectTexts[index][0]; card.querySelector(".project-info p").textContent = t.projectTexts[index][1]; });
        t.filters.forEach((text, index) => setText(`.filter-button:nth-child(${index + 1})`, text));
        setText(".saved-filter", language === "hy" ? "Պահված ♥" : "Saved ♥");
        document.getElementById("project-search")?.setAttribute("placeholder", t.search);
        setText(".contact-content > p", t.contact);
        ["name", "email", "message-input"].forEach((id, index) => document.getElementById(id)?.setAttribute("placeholder", t.placeholders[index]));
        setText("#contact-submit", t.send); setText("#modal-project-link", t.modal);
        document.querySelectorAll(".stat-label").forEach((label, index) => label.textContent = t.stats[index]);
        Object.values(projects).forEach((project, index) => { project.title = t.modalProjects[index][0]; project.description = t.modalProjects[index][1]; });
    }

    function setLanguage(language) {
        if (language === "ru") {
            const russianModalProjects = [["Modern Shop", "Учебная витрина: поиск товаров, фильтры категорий и корзина с изменением количества, расчётом суммы и сохранением в localStorage."], ["Admin Dashboard", "Демо dashboard: фильтрация за 7/30/90 дней, пересчёт диаграммы и показателей, список заказов и экспорт CSV."], ["Приложение погоды", "Погода с поиском города, текущими показателями и пятидневным прогнозом из Open-Meteo API."], ["Музыкальный плеер", "Web Audio плеер: три синтезированные мелодии, настоящая пауза и продолжение, перемотка и регулировка громкости."], ["Планировщик задач на React", "React-планировщик с тремя страницами, приоритетами, сроками, поиском, сменой темы и импортом примеров из API."]];
            Object.values(projects).forEach((project, index) => { project.title = russianModalProjects[index][0]; project.description = russianModalProjects[index][1]; });
            document.documentElement.lang = "ru";
            applyRussianContent();
            setText(".saved-filter", "Сохраненные ♥");
        }
        else applyAlternateLanguage(language);
        const contactLabels = {
            hy: ["Անուն", "Էլ․ փոստ", "Հաղորդագրություն"],
            ru: ["Имя", "Электронная почта", "Сообщение"],
            en: ["Name", "Email", "Message"]
        };
        document.querySelectorAll(".contact-field-label").forEach((label, index) => {
            label.textContent = contactLabels[language][index];
        });
        const caseLabel = { hy: "Նախագծի մանրամասները →", ru: "Подробнее о проекте →", en: "Project details →" };
        document.querySelectorAll(".case-study-button").forEach(link => link.textContent = caseLabel[language]);
        setProcessLanguage(language);
        animateHero(language);
        const pageTitles = {
            hy: "Արմինե | Front-End մշակող",
            ru: "Армине | Front-End разработчик",
            en: "Armine | Front-End Developer"
        };
        document.title = pageTitles[language];
        languageButtons.forEach((button) => button.classList.toggle("active", button.dataset.language === language));
        localStorage.setItem("portfolio-language", language);
    }

    setLanguage(localStorage.getItem("portfolio-language") || "hy");
    languageButtons.forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.language)));

    const menuButton = document.getElementById("menu-toggle");
    const navigation = document.getElementById("site-navigation");
    function closeMenu() {
        navigation?.classList.remove("open");
        menuButton?.classList.remove("open");
        menuButton?.setAttribute("aria-expanded", "false");
        menuButton?.setAttribute("aria-label", "Open navigation menu");
    }

    menuButton?.addEventListener("click", () => {
        const isOpen = !navigation?.classList.contains("open");
        navigation?.classList.toggle("open", isOpen);
        menuButton.classList.toggle("open", isOpen);
        menuButton.setAttribute("aria-expanded", String(isOpen));
        menuButton.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });
    navigation?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

    const filterButtons = document.querySelectorAll(".filter-button");
    const projectCards = document.querySelectorAll(".project-card[data-category]");
    const visibleProjectCount = document.getElementById("visible-project-count");
    const noProjectsMessage = document.getElementById("no-projects");
    const projectSearch = document.getElementById("project-search");
    let activeFilter = "all";

    function updateProjects() {
        const searchText = projectSearch?.value.trim().toLowerCase() || "";
        let visibleCount = 0;
        projectCards.forEach((card) => {
            const matchesFilter = activeFilter === "all" || card.dataset.category === activeFilter || (activeFilter === "saved" && savedProjects.has(card.querySelector(".project-save")?.dataset.projectId));
            const matchesSearch = card.textContent.toLowerCase().includes(searchText);
            const isVisible = matchesFilter && matchesSearch;
            card.classList.toggle("is-hidden", !isVisible);
            if (isVisible) visibleCount += 1;
        });
        if (visibleProjectCount) visibleProjectCount.textContent = visibleCount;
        if (noProjectsMessage) noProjectsMessage.hidden = visibleCount !== 0;
    }

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            activeFilter = button.dataset.filter;
            filterButtons.forEach((item) => item.classList.toggle("active", item === button));
            updateProjects();
        });
    });
    projectSearch?.addEventListener("input", updateProjects);

    const savedProjects = new Set(JSON.parse(localStorage.getItem("saved-projects") || "[]"));
    const saveButtons = document.querySelectorAll(".project-save");
    function updateSaveButton(button) {
        const isSaved = savedProjects.has(button.dataset.projectId);
        button.classList.toggle("saved", isSaved);
        button.setAttribute("aria-pressed", String(isSaved));
        button.textContent = isSaved ? "♥" : "♡";
    }
    saveButtons.forEach((button) => {
        updateSaveButton(button);
        button.addEventListener("click", () => {
            const projectId = button.dataset.projectId;
            if (savedProjects.has(projectId)) savedProjects.delete(projectId);
            else savedProjects.add(projectId);
            localStorage.setItem("saved-projects", JSON.stringify([...savedProjects]));
            updateSaveButton(button);
        });
    });

    projectCards.forEach((card) => {
        card.addEventListener("pointermove", (event) => {
            const bounds = card.getBoundingClientRect();
            card.style.setProperty("--spotlight-x", `${event.clientX - bounds.left}px`);
            card.style.setProperty("--spotlight-y", `${event.clientY - bounds.top}px`);
            card.classList.add("spotlight");
        });
        card.addEventListener("pointerleave", () => card.classList.remove("spotlight"));
    });

    function closeModal() {
        if (!modal) return;
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
        body.classList.remove("modal-open");
        lastFocusedElement?.focus();
    }

    function openProject(projectName, trigger) {
        const project = projects[projectName];
        if (!project || !modal || !title || !description || !tech) return;

        lastFocusedElement = trigger || document.activeElement;
        title.textContent = project.title;
        description.textContent = project.description;
        tech.replaceChildren(...project.tech.map((item) => {
            const tag = document.createElement("span");
            tag.textContent = item;
            return tag;
        }));
        if (modalProjectLink) modalProjectLink.href = project.url;
        if (modalCaseLink) modalCaseLink.href = project.caseStudy;
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        body.classList.add("modal-open");
        closeButton?.focus();
    }

    document.querySelectorAll(".project-preview[data-project]").forEach((preview) => {
        preview.setAttribute("tabindex", "0");
        preview.setAttribute("role", "button");
        preview.setAttribute("aria-label", "View project details");
        preview.addEventListener("click", () => openProject(preview.dataset.project, preview));
        preview.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openProject(preview.dataset.project, preview);
            }
        });
    });

    closeButton?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal?.classList.contains("active")) closeModal();
        if (event.key === "Escape") closeMenu();
    });

    const contactForm = document.getElementById("contact-form");
    const message = document.getElementById("message");
    const contactSubmit = document.getElementById("contact-submit");
    contactForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!contactForm.checkValidity()) return contactForm.reportValidity();

        const name = document.getElementById("name")?.value.trim() || "there";
        const originalButtonText = contactSubmit?.textContent;
        if (contactSubmit) {
            contactSubmit.disabled = true;
            contactSubmit.textContent = "Sending...";
        }
        if (message) {
            message.className = "";
            message.textContent = "";
        }

        try {
            const response = await fetch(contactForm.action, {
                method: "POST",
                body: new FormData(contactForm),
                headers: { Accept: "application/json" }
            });
            if (!response.ok) throw new Error("Form submission failed");

            if (message) {
                message.className = "success";
                message.textContent = `Thank you, ${name}! Your message has been sent.`;
            }
            contactForm.reset();
        } catch (error) {
            if (message) {
                message.className = "error";
                message.textContent = "Sorry, your message could not be sent. Please try again.";
            }
        } finally {
            if (contactSubmit) {
                contactSubmit.disabled = false;
                contactSubmit.textContent = originalButtonText;
            }
        }
    });

    const navLinks = [...document.querySelectorAll(".nav-links a")];
    const sections = [...document.querySelectorAll("body > section")];
    const observer = new IntersectionObserver((entries) => {
        const current = entries.find((entry) => entry.isIntersecting);
        if (!current) return;
        navLinks.forEach((link) => {
            const active = link.getAttribute("href") === `#${current.target.id}`;
            link.classList.toggle("active", active);
            if (active) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach((section) => observer.observe(section));

    const navbar = document.querySelector(".navbar");
    const scrollProgress = document.getElementById("scroll-progress");
    const backToTopButton = document.getElementById("back-to-top");
    const updateScrollUi = () => {
        navbar?.classList.toggle("scrolled", window.scrollY > 12);
        backToTopButton?.classList.toggle("visible", window.scrollY > 450);
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
        if (scrollProgress) scrollProgress.style.width = `${Math.min(progress, 100)}%`;
    };
    updateScrollUi();
    window.addEventListener("scroll", updateScrollUi, { passive: true });
    window.addEventListener("resize", updateScrollUi);
    backToTopButton?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    const revealItems = document.querySelectorAll(".section-title, .about-content, .skill-card, .project-card, .contact-content");
    revealItems.forEach((item) => item.classList.add("reveal"));
    const revealObserver = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("visible");
            currentObserver.unobserve(entry.target);
        });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => revealObserver.observe(item));

    const statNumbers = document.querySelectorAll(".stat-number[data-target]");
    const statsObserver = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const stat = entry.target;
            const target = Number(stat.dataset.target);
            const suffix = stat.dataset.suffix ?? "+";
            const startTime = performance.now();
            const duration = 1100;

            const animateNumber = (time) => {
                const progress = Math.min((time - startTime) / duration, 1);
                stat.textContent = `${Math.round(target * progress)}${suffix}`;
                if (progress < 1) window.requestAnimationFrame(animateNumber);
            };
            window.requestAnimationFrame(animateNumber);
            currentObserver.unobserve(stat);
        });
    }, { threshold: 0.5 });
    statNumbers.forEach((stat) => statsObserver.observe(stat));
});
