import React, { lazy, Suspense, useEffect, useRef } from "react";
import { HashRouter, Link, NavLink, Route, Routes, useLocation } from "react-router";
import { PlannerProvider, usePlanner } from "./PlannerContext.tsx";
const TasksPage = lazy(() => import("./pages/TasksPage.tsx"));
const StatsPage = lazy(() => import("./pages/StatsPage.tsx"));
const ExamplesPage = lazy(() => import("./pages/ExamplesPage.tsx"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage.tsx"));
const AccountPage = lazy(() => import("./pages/AccountPage.tsx"));
const BackendPage = lazy(() => import("./pages/BackendPage.tsx"));
import { AuthProvider } from "./AuthContext.tsx";

function Layout() {
  const { theme, toggleTheme, notice } = usePlanner();
  const location = useLocation();
  const content = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const titles: Record<string, string> = { "/": "Իմ առաջադրանքները", "/stats": "Իմ առաջընթացը", "/examples": "Առաջադրանքների օրինակներ", "/expenses": "Իմ ծախսերը", "/account": "Իմ հաշիվը" };
    titles["/backend"] = "Իմ backend-ը";
    document.title = (titles[location.pathname] || "Էջը չի գտնվել") + " | React պլանավորիչ";
    content.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return <div className="app-shell">
    <a className="skip-link" href="#planner-main">Անցնել բովանդակությանը</a>
    <header className="app-header"><a className="back-link" href="../index.html#projects">← Պորտֆոլիո</a><button onClick={toggleTheme} aria-pressed={theme === "light"}>{theme === "dark" ? "☀ Բաց թեմա" : "☾ Մուգ թեմա"}</button></header>
    <p className="eyebrow">REACT + TYPESCRIPT · ԻՄ ՕՐԸ</p>
    <nav className="app-nav" aria-label="Պլանավորիչի էջեր"><NavLink to="/" end>Առաջադրանքներ</NavLink><NavLink to="/stats">Առաջընթաց</NavLink><NavLink to="/expenses">Ծախսեր</NavLink><NavLink to="/examples">API օրինակներ</NavLink><NavLink to="/account">Իմ հաշիվը</NavLink></nav>
    <main id="planner-main" ref={content} tabIndex={-1}>
      <p><NavLink to="/backend">Իմ backend-ը →</NavLink></p>
      <Suspense fallback={<p role="status">Էջը բեռնվում է…</p>}>
      <Routes><Route path="/backend" element={<BackendPage />} /><Route path="/" element={<TasksPage />} /><Route path="/stats" element={<StatsPage />} /><Route path="/expenses" element={<ExpensesPage />} /><Route path="/examples" element={<ExamplesPage />} /><Route path="/account" element={<AccountPage />} /><Route path="*" element={<section><h1>Էջը չի գտնվել</h1><Link to="/">Վերադառնալ առաջադրանքներին</Link></section>} /></Routes>
      {notice && <p role="status">{notice}</p>}
      </Suspense>
    </main>
  </div>;
}

export default function App() {
  return <AuthProvider><PlannerProvider><HashRouter><Layout /></HashRouter></PlannerProvider></AuthProvider>;
}
