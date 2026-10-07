import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../AuthContext.tsx";
import { supabase } from "../supabase.ts";
import { readSnapshot, restoreSnapshot, validateSnapshot } from "../cloud-data.ts";

export default function AccountPage() {
  const { session, loading, error: authError } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [restorePending, setRestorePending] = useState(false);
  useEffect(() => {
    let saved = 0;
    try { saved = Number(sessionStorage.getItem(`planner-cloud-version-${session?.user.id}`) || 0); } catch {}
    setVersion(Number.isSafeInteger(saved) && saved >= 0 ? saved : 0);
    setMessage(""); setError(""); setRestorePending(false); setPassword("");
  }, [session?.user.id]);
  if (!supabase) return <section><h1>Իմ հաշիվը</h1><p>Առցանց պահպանումը դեռ միացված չէ։ Կարող ես շարունակել օգտվել առաջադրանքներից և ծախսերից՝ այս բրաուզերում պահպանմամբ։</p><p>Մուտքն ու երկու սարքերի միջև տվյալների փոխանցումը հասանելի կլինեն ծառայությունը միացնելուց հետո։</p></section>;
  const client = supabase;
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const result = mode === "login"
        ? await client.auth.signInWithPassword({ email: email.trim(), password })
        : await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
      if (result.error) throw result.error;
      setPassword("");
      if (mode === "signup" && !result.data.session) setMessage("Ստուգիր էլ․ փոստդ՝ գրանցումը հաստատելու համար։ Եթե հաշիվն արդեն կա, փորձիր մուտք գործել։");
    } catch { setError(mode === "login" ? "Մուտքը չհաջողվեց։ Ստուգիր էլ․ փոստը, գաղտնաբառը և կապը։" : "Գրանցումը չհաջողվեց։ Ստուգիր տվյալներն ու կապը կամ փորձիր ավելի ուշ։"); }
    finally { setBusy(false); }
  }
  async function sync(action: "save" | "load") {
    if (!session) return;
    setBusy(true); setError(""); setMessage(""); setRestorePending(false);
    try {
      if (action === "save") {
        const { data, error } = await client.rpc("save_planner_snapshot", { snapshot: readSnapshot(), expected_version: version });
        if (error) {
          if (error.message.includes("snapshot_conflict")) throw new Error("Առցանց կա այլ տարբերակ։ Նախ բեռնիր այն, հետո կատարիր փոփոխություններդ և պահպանիր։");
          throw new Error("Առցանց պահպանումը չհաջողվեց։ Ստուգիր կապը և փորձիր կրկին։");
        }
        if (typeof data !== "number") throw new Error("Ծառայությունը սխալ պատասխան վերադարձրեց։");
        setVersion(data);
        try { sessionStorage.setItem(`planner-cloud-version-${session.user.id}`, String(data)); } catch {}
        setMessage("Առաջադրանքները, ծախսերն ու բյուջեները պահպանված են առցանց։ Մյուս սարքում սեղմիր «Բեռնել առցանցից»։");
      } else {
        const { data, error } = await client.from("planner_snapshots").select("payload,version").eq("user_id", session.user.id).maybeSingle();
        if (error) throw new Error("Բեռնումը չհաջողվեց։ Ստուգիր կապը և փորձիր կրկին։");
        if (!data) { setVersion(0); setMessage("Հաշվում դեռ պահպանված տվյալներ չկան։ Կարող ես այս սարքի տվյալները պահպանել առցանց։"); return; }
        const snapshot = validateSnapshot(data.payload);
        if (!Number.isSafeInteger(data.version) || data.version < 1) throw new Error("Ծառայությունը սխալ տարբերակ վերադարձրեց։");
        // Backup is written before replacing local data; a storage failure aborts restoration.
        localStorage.setItem("armine-before-cloud-restore", JSON.stringify(readSnapshot()));
        // Ensure the version can survive reload before replacing local data.
        const versionKey = `planner-cloud-version-${session.user.id}`;
        const oldVersion = sessionStorage.getItem(versionKey);
        sessionStorage.setItem(versionKey, String(data.version));
        try { restoreSnapshot(snapshot); }
        catch (error) {
          if (oldVersion === null) sessionStorage.removeItem(versionKey);
          else sessionStorage.setItem(versionKey, oldVersion);
          throw error;
        }
        window.location.reload();
      }
    } catch (error) { setError(error instanceof Error ? error.message : "Գործողությունը չհաջողվեց։"); }
    finally { setBusy(false); }
  }
  return <section><h1>Իմ հաշիվը</h1>
    {loading ? <p role="status">Ստուգում ենք մուտքը…</p> : session ? <>
      <p>Մուտք ես գործել՝ <strong>{session.user.email}</strong></p>
      <div className="budget-panel"><h2>Տվյալները երկու սարքում</h2><p>Աշխատանքն ավարտելուց հետո պահպանիր առցանց։ Մյուս սարքում բեռնիր տվյալները՝ մինչև փոփոխություններ կատարելը։</p><p className="page-description">Բեռնումը կփոխարինի այս բրաուզերի առաջադրանքները, ծախսերն ու բյուջեները։ Ավտոմատ համաժամացում դեռ չկա։</p>
        <div className="expense-toolbar"><button className="primary" disabled={busy} onClick={() => sync("save")}>Պահպանել առցանց</button><button disabled={busy} onClick={() => setRestorePending(true)}>Բեռնել առցանցից</button></div>
        {restorePending && <div className="restore-confirm"><p>Փոխարինե՞լ այս սարքի տվյալները առցանց տարբերակով։</p><button disabled={busy} onClick={() => sync("load")}>Այո, բեռնել</button> <button disabled={busy} onClick={() => setRestorePending(false)}>Չեղարկել</button></div>}
      </div>
      <button disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try { const { error } = await client.auth.signOut(); if (error) throw error; }
        catch { setError("Ելքը չհաջողվեց։ Փորձիր կրկին։"); }
        finally { setBusy(false); }
      }}>Դուրս գալ</button>
      <p className="page-description">Դուրս գալուց հետո այս բրաուզերի տվյալները մնում են սարքում։ Ընդհանուր սարքում հեռացրու դրանք բրաուզերի կարգավորումներից։</p>
    </> : <>
      <div className="filters"><button aria-pressed={mode === "login"} disabled={busy} onClick={() => setMode("login")}>Մուտք</button><button aria-pressed={mode === "signup"} disabled={busy} onClick={() => setMode("signup")}>Գրանցում</button></div>
      <form className="task-form" onSubmit={authenticate}><div className="field task-text-field"><label htmlFor="account-email">Էլ․ փոստ</label><input id="account-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></div><div className="field task-text-field"><label htmlFor="account-password">Գաղտնաբառ (առնվազն 8 նիշ)</label><input id="account-password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></div><button className="primary" disabled={busy}>{busy ? "Սպասիր…" : mode === "login" ? "Մուտք գործել" : "Գրանցվել"}</button></form>
    </>}
    {busy && <p role="status">Կատարվում է…</p>}{(error || authError) && <p className="error" role="alert">{error || authError}</p>}{message && <p role="status">{message}</p>}
  </section>;
}
