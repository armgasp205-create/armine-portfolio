import { useState, type FormEvent } from "react";

const key = "armine-monthly-budgets-v1";
function readBudgets(): Record<string, number> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) || "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).filter(([month, value]) =>
      /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && typeof value === "number" &&
      Number.isSafeInteger(value) && value > 0 && value <= 100000000000));
  } catch { return {}; }
}
const money = (cents: number) => new Intl.NumberFormat("hy-AM", { style: "currency", currency: "AMD", maximumFractionDigits: 2 }).format(cents / 100);

export default function BudgetPanel({ month, total }: { month: string; total: number }) {
  const [budgets, setBudgets] = useState(readBudgets);
  const budget = budgets[month] ?? 0;
  const [draft, setDraft] = useState(() => budget ? String(budget / 100) : "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  function persist(next: Record<string, number>, notice: string) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setBudgets(next); setError(""); setMessage(notice);
    } catch { setError("Չհաջողվեց պահպանել բյուջեն։ Ստուգիր բրաուզերի պահեստի հասանելիությունը։"); setMessage(""); }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Math.round(Number(draft) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000000) {
      setError("Մուտքագրիր դրական գումար՝ առավելագույնը 1 միլիարդ դրամ։"); setMessage(""); return;
    }
    persist({ ...budgets, [month]: amount }, "Այս ամսվա բյուջեն պահպանված է։");
  }
  return <section className="budget-panel" aria-labelledby="budget-heading">
    <h2 id="budget-heading">Ամսական բյուջե · {month}</h2>
    <p className="page-description">Յուրաքանչյուր ամսվա համար կարող ես առանձին սահմանաչափ ընտրել։</p>
    <form className="expense-toolbar" onSubmit={save}>
      <div className="field"><label htmlFor="monthly-budget">Բյուջե (դրամ)</label><input id="monthly-budget" type="number" min="0.01" max="1000000000" step="0.01" required value={draft} onChange={event => setDraft(event.target.value)} /></div>
      <button className="primary" type="submit">Պահպանել բյուջեն</button>
      {budget > 0 && <button type="button" onClick={() => {
        const next = { ...budgets }; delete next[month];
        persist(next, "Այս ամսվա բյուջեն հեռացված է։");
      }}>Հեռացնել սահմանաչափը</button>}
    </form>
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {budget > 0 ? <div className="budget-result">
      <div className="category-label"><span>Սահմանված բյուջե</span><strong>{money(budget)}</strong></div>
      <div className="category-label"><span>Ծախսված</span><strong>{money(total)}</strong></div>
      <progress value={Math.min(total, budget)} max={budget} aria-label="Բյուջեի օգտագործումը" />
      <p className={total > budget ? "error" : "budget-remaining"} role="status">{total > budget
        ? `Բյուջեն գերազանցված է ${money(total - budget)}-ով։`
        : total === budget ? "Բյուջեն ամբողջությամբ օգտագործված է։" : `Մնացել է ${money(budget - total)}։`}</p>
    </div> : <p className="page-description">Այս ամսվա բյուջեն դեռ սահմանված չէ։</p>}
  </section>;
}
