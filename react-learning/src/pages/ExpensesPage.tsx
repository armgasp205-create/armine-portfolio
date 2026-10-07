import { useEffect, useRef, useState, type FormEvent } from "react";

interface Expense { id: string; title: string; amount: number; category: string; date: string }
const categories = ["Սնունդ", "Տրանսպորտ", "Գնումներ", "Այլ"];
const storageKey = "armine-expenses-v1";
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
function readExpenses(): Expense[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is Expense => !!item && typeof item === "object" &&
      typeof item.id === "string" && typeof item.title === "string" &&
      Number.isSafeInteger(item.amount) && item.amount > 0 && categories.includes(item.category) &&
      typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date));
  } catch { return []; }
}
const money = (amount: number) => new Intl.NumberFormat("hy-AM", { style: "currency", currency: "AMD", maximumFractionDigits: 2 }).format(amount / 100);

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>(readExpenses);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  function resetForm() {
    setEditingId(null); setTitle(""); setAmount(""); setCategory(categories[0]); setDate(today()); setError("");
  }
  function editExpense(expense: Expense) {
    setEditingId(expense.id); setTitle(expense.title); setAmount(String(expense.amount / 100));
    setCategory(expense.category); setDate(expense.date); setError("");
    titleInput.current?.focus();
  }
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(expenses)); setStorageError(""); }
    catch { setStorageError("Չհաջողվեց պահպանել տվյալները։ Մի փակիր էջը՝ մինչև դրանք գրանցես այլ տեղ։"); }
  }, [expenses]);
  const visible = expenses.filter(expense => !month || expense.date.startsWith(month));
  const total = visible.reduce((sum, expense) => sum + expense.amount, 0);
  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    const cents = Math.round(value * 100);
    if (!title.trim() || !Number.isFinite(value) || !Number.isSafeInteger(cents) || cents <= 0 || cents > 100000000000 || !date) {
      setError("Լրացրու անվանումը, ամսաթիվը և դրական գումար՝ առավելագույնը 1 միլիարդ դրամ։"); return;
    }
    if (!editingId && expenses.length >= 1000) { setError("Հասել ես 1000 գրառման սահմանին։ Ջնջիր ավելորդ գրառումները։"); return; }
    const updated: Expense = { id: editingId ?? crypto.randomUUID(), title: title.trim(), amount: cents, category, date };
    setExpenses(previous => editingId
      ? previous.map(expense => expense.id === editingId ? updated : expense)
      : [updated, ...previous]);
    setMonth(date.slice(0, 7)); resetForm();
  }
  return <section>
    <h1>Իմ ծախսերը</h1>
    <p className="page-description">Գրանցիր առօրյա ծախսերը և տես՝ որտեղ է գնում քո գումարը։ Տվյալները պահվում են այս բրաուզերում։</p>
    <form className="task-form" onSubmit={addExpense}>
      {editingId && <p role="status">Խմբագրում ես ընտրված ծախսը։</p>}
      <div className="field task-text-field"><label htmlFor="expense-title">Ինչի՞ համար ես ծախսել</label><input ref={titleInput} id="expense-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={120} required placeholder="Օրինակ՝ սուրճ" /></div>
      <div className="field"><label htmlFor="expense-amount">Գումար (դրամ)</label><input id="expense-amount" type="number" min="0.01" max="1000000000" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required /></div>
      <div className="field"><label htmlFor="expense-category">Կատեգորիա</label><select id="expense-category" value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select></div>
      <div className="field"><label htmlFor="expense-date">Ամսաթիվ</label><input id="expense-date" type="date" value={date} onChange={event => setDate(event.target.value)} required /></div>
      <button className="primary" type="submit">{editingId ? "Պահպանել փոփոխությունները" : "Ավելացնել ծախսը"}</button>
      {editingId && <button type="button" onClick={resetForm}>Չեղարկել</button>}
      {error && <p className="error" role="alert">{error}</p>}
    </form>
    {storageError && <p className="error" role="alert">{storageError}</p>}
    <div className="expense-toolbar"><div className="field"><label htmlFor="expense-month">Ամիս (դատարկ՝ ամբողջը)</label><input id="expense-month" type="month" value={month} onChange={event => setMonth(event.target.value)} /></div><button onClick={() => setMonth("")}>Բոլոր ամիսները</button></div>
    <div className="stats-grid"><div className="metric"><span>Ընդհանուր ծախս</span><strong className="expense-total">{money(total)}</strong></div><div className="metric"><span>Գրառումների քանակ</span><strong className="expense-total">{visible.length}</strong></div></div>
    {total > 0 && <div className="category-summary" aria-label="Ծախսերն ըստ կատեգորիայի">{categories.map(item => {
      const subtotal = visible.filter(expense => expense.category === item).reduce((sum, expense) => sum + expense.amount, 0);
      return <div key={item}><div className="category-label"><span>{item}</span><span>{money(subtotal)}</span></div><progress value={subtotal} max={total} aria-label={item} /></div>;
    })}</div>}
    {visible.length === 0 ? <p className="empty">Այս ժամանակահատվածում ծախսեր չկան։ Ավելացրու առաջինը։</p> : <ul>{visible.map(expense => <li key={expense.id} className="expense-row"><div className="expense-details"><strong>{expense.title}</strong><small>{expense.category} · {expense.date}</small></div><strong>{money(expense.amount)}</strong><button aria-label={`Խմբագրել՝ ${expense.title}`} onClick={() => editExpense(expense)}>Խմբագրել</button><button aria-label={`Ջնջել՝ ${expense.title}`} onClick={() => {
      setExpenses(previous => previous.filter(item => item.id !== expense.id));
      if (editingId === expense.id) resetForm();
    }}>Ջնջել</button></li>)}</ul>}
  </section>;
}
