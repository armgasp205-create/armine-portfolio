import React, { useEffect, useRef } from "react";
import { HashRouter, Link, NavLink, Route, Routes, useLocation } from "react-router";
import { PlannerProvider, usePlanner } from "./PlannerContext.tsx";
import TasksPage from "./pages/TasksPage.tsx";
import StatsPage from "./pages/StatsPage.tsx";
import ExamplesPage from "./pages/ExamplesPage.tsx";

function Layout() {
  const { theme, toggleTheme, notice } = usePlanner();
  const location = useLocation();
  const content = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const titles: Record<string, string> = { "/": "Իմ առաջադրանքները", "/stats": "Իմ առաջընթացը", "/examples": "Առաջադրանքների օրինակներ" };
    document.title = (titles[location.pathname] || "Էջը չի գտնվել") + " | React պլանավորիչ";
    content.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return <div className="app-shell">
    <header className="app-header"><a className="back-link" href="/index.html#projects">← Պորտֆոլիո</a><button onClick={toggleTheme} aria-pressed={theme === "light"}>{theme === "dark" ? "☀ Բաց թեմա" : "☾ Մուգ թեմա"}</button></header>
    <p className="eyebrow">REACT · ԱՌԱՋԱԴՐԱՆՔՆԵՐԻ ՊԼԱՆԱՎՈՐԻՉ</p>
    <nav className="app-nav" aria-label="Պլանավորիչի էջեր"><NavLink to="/" end>Առաջադրանքներ</NavLink><NavLink to="/stats">Առաջընթաց</NavLink><NavLink to="/examples">API օրինակներ</NavLink></nav>
    <main ref={content} tabIndex={-1}>
      <Routes><Route path="/" element={<TasksPage />} /><Route path="/stats" element={<StatsPage />} /><Route path="/examples" element={<ExamplesPage />} /><Route path="*" element={<section><h1>Էջը չի գտնվել</h1><Link to="/">Վերադառնալ առաջադրանքներին</Link></section>} /></Routes>
      {notice && <p role="status">{notice}</p>}
    </main>
  </div>;
}

export default function App() {
  return <PlannerProvider><HashRouter><Layout /></HashRouter></PlannerProvider>;
}