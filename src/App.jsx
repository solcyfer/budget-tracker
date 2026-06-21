import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBaA_amVUqkQSP62n48eEHiiowMdtFcHYo",
  authDomain: "budgetracker-b9f61.firebaseapp.com",
  projectId: "budgetracker-b9f61",
  storageBucket: "budgetracker-b9f61.firebasestorage.app",
  messagingSenderId: "252112631420",
  appId: "1:252112631420:web:13d806124720b4e9c1bbf9",
  measurementId: "G-QMQYMH0NV9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ─── THEME ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#0f1117", surface: "#181c27", surface2: "#1f2435", surface3: "#252b3d",
  border: "#2a3045", border2: "#3a4260",
  text: "#eef0f6", muted: "#8892a8", subtle: "#505a72",
  teal: "#3dd6b5", tealLight: "#0d2e28", tealMid: "#2ab89c",
  red: "#f07070", redLight: "#2a1520", redMid: "#d95555",
  blue: "#6eaaee", blueLight: "#0f1e36",
  amber: "#f0a84a", amberLight: "#2a1e0a",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

const GLOBAL_CSS = `
${FONTS}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; background: ${C.bg}; color: ${C.text}; }
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
input[type=number] { -moz-appearance: textfield; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: ${C.surface2}; }
::-webkit-scrollbar-thumb { background: ${C.border2}; border-radius: 99px; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes toastIn  { from { opacity:0; transform:translateY(60px); } to { opacity:1; transform:translateY(0); } }
@keyframes toastOut { from { opacity:1; transform:translateY(0); }    to { opacity:0; transform:translateY(60px); } }
`;

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  Snacks:"🍿", Food:"🍱", Transport:"🚌", Entertainment:"🎮",
  Shopping:"🛍️", Health:"💊", Utilities:"💡", Stationary:"📝",
  Salary:"💼", Freelance:"💻", Other:"📦",
};
const CATEGORIES = ["Snacks","Food","Transport","Entertainment","Shopping","Health","Utilities","Stationary","Salary","Freelance","Other"];
const PIE_COLORS = ["#3dd6b5","#f07070","#6eaaee","#f0a84a","#a37dd6","#70c465","#e07ab5","#75c2c7"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n) => "₹" + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const today = () => new Date().toISOString().split("T")[0];

// ─── STYLES (inline objects) ─────────────────────────────────────────────────
const S = {
  app: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 15, lineHeight: 1.5 },
  header: { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 28px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 },
  logo: { display: "flex", alignItems: "center", gap: 9, fontSize: 17, fontWeight: 600, color: C.text },
  logoIcon: { width: 30, height: 30, background: C.teal, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#0a1a17", fontSize: 15, fontWeight: 700, boxShadow: "0 0 12px rgba(61,214,181,0.3)" },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  userPill: { fontSize: 13, color: C.muted, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 99, padding: "4px 12px", fontFamily: "'DM Mono', monospace" },
  main: { maxWidth: 1240, margin: "0 auto", padding: "24px 20px 40px", display: "grid", gridTemplateColumns: "300px 1fr", gap: 18 },
  col: { display: "flex", flexDirection: "column", gap: 14 },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)" },
  cardTitle: { fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 },
  dashGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  dashCell: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", gap: 8 },
  cellLabel: { fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px" },
  cellValue: { fontSize: 22, fontWeight: 600, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.5px" },
  cellSub: { fontSize: 12, color: C.subtle },
  progressCell: { gridColumn: "1 / -1", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" },
  progressBarBg: { height: 7, background: C.surface2, borderRadius: 99, marginBottom: 8, overflow: "hidden", border: `1px solid ${C.border}` },
  formRow: { display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: 500, color: C.muted },
  input: { fontSize: 14, fontFamily: "'DM Sans', sans-serif", padding: "9px 11px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface2, color: C.text, outline: "none", width: "100%", transition: "border-color 0.15s" },
  select: { fontSize: 14, fontFamily: "'DM Sans', sans-serif", padding: "9px 11px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface2, color: C.text, outline: "none", width: "100%", cursor: "pointer" },
  btnSave: { width: "100%", padding: "10px", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", background: C.teal, color: "#0a1a17", border: "none", borderRadius: 10, cursor: "pointer", marginTop: 4, letterSpacing: "0.2px", transition: "background 0.15s" },
  btnLogout: { fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: C.red, background: C.redLight, border: `1px solid #4a2020`, borderRadius: 10, padding: "5px 14px", cursor: "pointer", fontWeight: 500 },
  btnGraph: { fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: C.blue, background: C.blueLight, border: `1px solid #1e3a5a`, borderRadius: 10, padding: "5px 12px", cursor: "pointer", fontWeight: 500, marginTop: 10, display: "inline-flex", alignItems: "center", gap: 5 },
  btnDel: { width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, cursor: "pointer", color: C.subtle, fontSize: 13, flexShrink: 0 },
  periodBtn: (active) => ({ fontSize: 12, fontFamily: "'DM Sans', sans-serif", padding: "4px 11px", border: `1px solid ${active ? C.teal : C.border}`, borderRadius: 10, background: active ? C.teal : C.surface2, color: active ? "#0a1a17" : C.muted, cursor: "pointer", fontWeight: 500, transition: "all 0.15s" }),
  typeBtn: (active, variant) => ({
    flex: 1, padding: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
    border: `1px solid ${active ? (variant === "income" ? C.tealMid : C.redMid) : C.border}`,
    borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
    background: active ? (variant === "income" ? C.tealLight : C.redLight) : C.surface2,
    color: active ? (variant === "income" ? C.teal : C.red) : C.muted,
  }),
  quickBtn: (variant) => ({ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", border: "none", borderRadius: 10, padding: "7px 13px", cursor: "pointer", alignSelf: "flex-start", background: variant === "income" ? C.tealLight : C.redLight, color: variant === "income" ? C.teal : C.red }),
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, width: "90%", maxWidth: 680, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(61,214,181,0.08)", animation: "slideUp 0.2s ease" },
  txnRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` },
  txnIcon: (type) => ({ width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, background: type === "income" ? C.tealLight : C.redLight }),
  statCard: (accent) => ({ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", borderTop: `2.5px solid ${accent}` }),
  loginWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg },
  loginCard: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "40px 36px", width: "100%", maxWidth: 380, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" },
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function Toast({ msg, visible }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999, pointerEvents: "none",
      background: C.surface3, color: C.text, border: `1px solid ${C.border2}`,
      padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500,
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      animation: visible ? "toastIn 0.25s ease forwards" : "toastOut 0.25s ease forwards",
    }}>{msg}</div>
  );
}

function PieChart({ transactions }) {
  const expenses = transactions.filter(t => t.type === "expense");
  if (!expenses.length) return <p style={{ color: C.subtle, fontSize: 14, padding: "20px 0" }}>No expense data yet.</p>;

  const catMap = {};
  expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const total = Object.values(catMap).reduce((a, b) => a + b, 0);
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  const cx = 60, cy = 60, r = 52, hole = 28;
  let angle = -Math.PI / 2;
  const paths = cats.map(([, val], i) => {
    const sweep = (val / total) * 2 * Math.PI;
    const end = angle + sweep;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
    const hx1 = cx + hole * Math.cos(end), hy1 = cy + hole * Math.sin(end);
    const hx2 = cx + hole * Math.cos(angle), hy2 = cy + hole * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${hx1} ${hy1} A ${hole} ${hole} 0 ${large} 0 ${hx2} ${hy2} Z`;
    angle = end;
    return <path key={i} d={d} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke={C.surface} strokeWidth="1.5" />;
  });

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>{paths}</svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
        {cats.slice(0, 7).map(([name, val], i) => (
          <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
              <span style={{ color: C.text }}>{name}</span>
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.muted }}>{((val / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ transactions, period, setPeriod }) {
  const grouped = {};
  transactions.forEach(t => {
    const d = new Date(t.date);
    let key;
    if (period === "daily") key = t.date;
    else if (period === "weekly") { const wk = Math.ceil(d.getDate() / 7); key = d.toLocaleString("default", { month: "short" }) + " W" + wk; }
    else key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };
    if (t.type === "income") grouped[key].income += t.amount;
    else grouped[key].expense += t.amount;
  });

  const keys = Object.keys(grouped).sort();
  const maxVal = Math.max(...keys.map(k => Math.max(grouped[k].income, grouped[k].expense)), 1);

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={S.cardTitle}>Spending timeline</div>
        <div style={{ display: "flex", gap: 4 }}>
          {["daily", "weekly", "monthly"].map(p => (
            <button key={p} style={S.periodBtn(period === p)} onClick={() => setPeriod(p)}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {!keys.length ? (
        <p style={{ color: C.subtle, fontSize: 14, padding: "40px 0", textAlign: "center" }}>No data yet — add some transactions!</p>
      ) : (
        <div style={{ height: 180, display: "flex", alignItems: "flex-end", gap: 6, padding: "0 4px" }}>
          {keys.map(k => {
            const ih = ((grouped[k].income / maxVal) * 160);
            const eh = ((grouped[k].expense / maxVal) * 160);
            const label = period === "daily" ? k.slice(5) : k;
            return (
              <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 160 }}>
                  <div title={`Income ${fmt(grouped[k].income)}`} style={{ flex: 1, height: ih, minHeight: 3, borderRadius: "4px 4px 0 0", background: C.tealMid, transition: "height 0.4s ease" }} />
                  <div title={`Expense ${fmt(grouped[k].expense)}`} style={{ flex: 1, height: eh, minHeight: 3, borderRadius: "4px 4px 0 0", background: C.redMid, transition: "height 0.4s ease" }} />
                </div>
                <div style={{ fontSize: 10, color: C.subtle, fontFamily: "'DM Mono', monospace", textAlign: "center", maxWidth: 40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        {[["Income", C.tealMid], ["Expense", C.redMid]].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted }}>
            <div style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function Modal({ transactions, onClose }) {
  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: C.text }}>Full spending overview</span>
          <button onClick={onClose} style={{ width: 32, height: 32, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontSize: 16, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Total income", val: fmtInt(income), color: C.teal, bg: C.tealLight },
            { label: "Total expense", val: fmtInt(expense), color: C.red, bg: C.redLight },
            { label: "Net savings", val: fmtInt(Math.abs(net)), color: net >= 0 ? C.teal : C.red, bg: C.blueLight },
          ].map(({ label, val, color, bg }) => (
            <div key={label} style={{ background: bg, borderRadius: 10, padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "'DM Mono', monospace", color }}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>
          All transactions ({transactions.length})
        </div>
        {transactions.map(t => {
          const dateStr = new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
          return (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[t.category] || "📦"}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{t.category}</div>
                  <div style={{ fontSize: 12, color: C.subtle }}>{dateStr}</div>
                </div>
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 14, color: t.type === "income" ? C.teal : C.red }}>
                {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);

  const handle = async () => {
    setError("");
    if (!email || !password) { setError("Email and password required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLogin();
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setError("Email already registered.");
      else if (err.code === "auth/user-not-found") setError("User not found.");
      else if (err.code === "auth/wrong-password") setError("Wrong password.");
      else if (err.code === "auth/weak-password") setError("Password must be at least 6 characters.");
      else setError(err.message);
    }
  };

  const inputStyle = (focused) => ({ ...S.input, borderColor: focused ? C.teal : C.border, background: focused ? C.surface3 : C.surface2, marginBottom: 12 });

  return (
    <div style={S.loginWrap}>
      <div style={{ ...S.loginCard, animation: "fadeUp 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={S.logoIcon}>₹</div>
          <span style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Budget Tracker</span>
        </div>
        <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
          style={inputStyle(emailFocus)} onFocus={() => setEmailFocus(true)} onBlur={() => setEmailFocus(false)}
          onKeyDown={e => e.key === "Enter" && handle()} disabled={loading} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
          style={inputStyle(passFocus)} onFocus={() => setPassFocus(true)} onBlur={() => setPassFocus(false)}
          onKeyDown={e => e.key === "Enter" && handle()} disabled={loading} />
        {error && <p style={{ fontSize: 13, color: C.red, marginBottom: 8 }}>{error}</p>}
        <button style={S.btnSave} onClick={handle} disabled={loading}>{loading ? "Loading..." : (isSignup ? "Sign up" : "Log in")}</button>
        <button onClick={() => { setIsSignup(!isSignup); setError(""); }}
          style={{ background: "none", border: "none", color: C.teal, fontSize: 13, cursor: "pointer", width: "100%", textAlign: "center", marginTop: 14, fontFamily: "'DM Sans', sans-serif" }}
          disabled={loading}>
          {isSignup ? "Already have an account? Log in" : "Need an account? Sign up"}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function BudgetTracker() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [goal, setGoal] = useState(5000);

  const [txnType, setTxnType] = useState("Income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Snacks");
  const [date, setDate] = useState(today());
  const [period, setPeriod] = useState("daily");
  const [showModal, setShowModal] = useState(false);
  const [amountFocus, setAmountFocus] = useState(false);
  const [toast, setToast] = useState({ msg: "", visible: false });
  const [toastTimer, setToastTimer] = useState(null);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadTransactions(currentUser.uid);
        loadGoal(currentUser.uid);
      } else {
        setUser(null);
        setTransactions([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load transactions from Firestore
  const loadTransactions = (uid) => {
    const q = query(collection(db, "transactions"), where("userId", "==", uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txns = [];
      snapshot.forEach(doc => txns.push({ id: doc.id, ...doc.data() }));
      setTransactions(txns.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    });
    return unsubscribe;
  };

  // Load goal from Firestore
  const loadGoal = async (uid) => {
    try {
      const q = query(collection(db, "goals"), where("userId", "==", uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setGoal(snapshot.docs[0].data().amount);
      }
    } catch (err) {
      console.error("Error loading goal:", err);
    }
  };

  const showToast = useCallback((msg) => {
    if (toastTimer) clearTimeout(toastTimer);
    setToast({ msg, visible: true });
    const t = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2400);
    setToastTimer(t);
  }, [toastTimer]);

  const handleLogin = () => {
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setTransactions([]);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const addTransaction = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { showToast("Enter a valid amount"); return; }

    try {
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: txnType.toLowerCase(),
        amount: amt,
        category,
        date: date || today(),
        timestamp: new Date(date).getTime(),
        createdAt: new Date(),
      });
      setAmount("");
      setCategory("Snacks");
      setTxnType("Income");
      setDate(today());
      showToast(`${txnType} of ${fmt(amt)} saved!`);
    } catch (err) {
      console.error("Error adding transaction:", err);
      showToast("Failed to save transaction");
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await deleteDoc(doc(db, "transactions", id));
      showToast("Transaction removed");
    } catch (err) {
      console.error("Error deleting transaction:", err);
      showToast("Failed to delete transaction");
    }
  };

  const updateGoal = async (newGoal) => {
    setGoal(newGoal);
    try {
      const q = query(collection(db, "goals"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await setDoc(doc(db, "goals", snapshot.docs[0].id), { userId: user.uid, amount: newGoal });
      } else {
        await addDoc(collection(db, "goals"), { userId: user.uid, amount: newGoal });
      }
    } catch (err) {
      console.error("Error updating goal:", err);
    }
  };

  const quickEntry = (type) => {
    setTxnType(type);
    setTimeout(() => document.getElementById("amt-input")?.focus(), 50);
  };

  if (loading) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.text }}>Loading...</div>;

  if (!user) return (
    <>
      <style>{GLOBAL_CSS}</style>
      <LoginScreen onLogin={handleLogin} loading={authLoading} />
    </>
  );

  // ── CALCULATIONS ──
  const income  = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  const pct = goal > 0 ? Math.min(Math.max((net / goal) * 100, 0), 100) : 0;

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={S.app}>

        {/* HEADER */}
        <header style={S.header}>
          <div style={S.logo}>
            <div style={S.logoIcon}>₹</div>
            Budget Tracker
          </div>
          <div style={S.headerRight}>
            <span style={S.userPill}>{user.email}</span>
            <button style={S.btnLogout} onClick={handleLogout}>Logout</button>
          </div>
        </header>

        {/* MAIN */}
        <div style={S.main}>

          {/* ── LEFT PANEL ── */}
          <div style={S.col}>

            {/* DASHBOARD GRID */}
            <div style={S.dashGrid}>

              {/* Income entry */}
              <div style={{ ...S.dashCell, borderTop: `2.5px solid ${C.tealMid}` }}>
                <div style={S.cellLabel}>Income</div>
                <div style={S.cellSub}>Add money in</div>
                <button style={S.quickBtn("income")} onClick={() => quickEntry("Income")}>+ Add income</button>
              </div>

              {/* Expense entry */}
              <div style={{ ...S.dashCell, borderTop: `2.5px solid ${C.redMid}` }}>
                <div style={S.cellLabel}>Expense</div>
                <div style={S.cellSub}>Add spending</div>
                <button style={S.quickBtn("expense")} onClick={() => quickEntry("Expense")}>− Add expense</button>
              </div>

              {/* Net saved */}
              <div style={{ ...S.dashCell, borderTop: "2.5px solid #5a9ee0" }}>
                <div style={S.cellLabel}>Net saved</div>
                <div style={{ ...S.cellValue, color: net >= 0 ? C.teal : C.red }}>
                  {net < 0 ? "-" : ""}{fmt(net)}
                </div>
                <div style={S.cellSub}>this period</div>
              </div>

              {/* Monthly goal */}
              <div style={{ ...S.dashCell, borderTop: "2.5px solid #e5a050" }}>
                <div style={S.cellLabel}>Monthly goal</div>
                <input
                  type="number" value={goal} min={0}
                  onChange={e => updateGoal(parseFloat(e.target.value) || 0)}
                  style={{ fontSize: 20, fontWeight: 600, fontFamily: "'DM Mono', monospace", color: C.text, background: "transparent", border: "none", outline: "none", borderBottom: `1.5px dashed ${C.border2}`, padding: "2px 0 4px", width: "100%", letterSpacing: "-0.5px" }}
                />
                <div style={{ fontSize: 11, color: C.subtle }}>Click to edit</div>
              </div>

              {/* Progress — full width */}
              <div style={S.progressCell}>
                <div style={S.cellLabel}>Progress toward goal</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontSize: 28, fontWeight: 600, fontFamily: "'DM Mono', monospace", color: C.teal }}>{pct.toFixed(0)}%</div>
                  <div style={{ fontSize: 12, color: C.muted, textAlign: "right" }}>
                    {fmtInt(Math.max(net, 0))} saved of {fmtInt(goal)}
                  </div>
                </div>
                <div style={S.progressBarBg}>
                  <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.teal}, ${C.tealMid})`, borderRadius: 99, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)", boxShadow: "0 0 8px rgba(61,214,181,0.35)" }} />
                </div>
                <button style={S.btnGraph} onClick={() => setShowModal(true)}>↗ View spending graph</button>
              </div>
            </div>

            {/* ADD TRANSACTION FORM */}
            <div style={S.card}>
              <div style={S.cardTitle}>Add transaction</div>

              <div style={S.formRow}>
                <label style={S.label}>Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <button style={S.typeBtn(txnType === "Income", "income")} onClick={() => setTxnType("Income")}>Income</button>
                  <button style={S.typeBtn(txnType === "Expense", "expense")} onClick={() => setTxnType("Expense")}>Expense</button>
                </div>
              </div>

              <div style={S.formRow}>
                <label style={S.label}>Amount (₹)</label>
                <input id="amt-input" type="number" placeholder="0.00" value={amount} min={0} step="0.01"
                  onChange={e => setAmount(e.target.value)}
                  onFocus={() => setAmountFocus(true)} onBlur={() => setAmountFocus(false)}
                  onKeyDown={e => e.key === "Enter" && addTransaction()}
                  style={{ ...S.input, borderColor: amountFocus ? C.teal : C.border, background: amountFocus ? C.surface3 : C.surface2 }} />
              </div>

              <div style={S.formRow}>
                <label style={S.label}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={S.select}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div style={S.formRow}>
                <label style={S.label}>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={S.input} />
              </div>

              <button style={S.btnSave} onClick={addTransaction}>Save transaction</button>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={S.col}>

            {/* STAT ROW */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {[
                { label: "Total income",   val: fmt(income),  color: C.teal,  accent: C.tealMid },
                { label: "Total expenses", val: fmt(expense), color: C.red,   accent: C.redMid },
                { label: "Transactions",   val: transactions.length, color: C.blue, accent: "#5a9ee0" },
              ].map(({ label, val, color, accent }) => (
                <div key={label} style={S.statCard(accent)}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'DM Mono', monospace", color }}>{val}</div>
                </div>
              ))}
            </div>

            {/* BAR CHART */}
            <BarChart transactions={transactions} period={period} setPeriod={setPeriod} />

            {/* PIE CHART */}
            <div style={S.card}>
              <div style={S.cardTitle}>Spending by category</div>
              <PieChart transactions={transactions} />
            </div>

            {/* TRANSACTION LIST */}
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={S.cardTitle}>Recent transactions</div>
                <span style={{ fontSize: 12, color: C.muted, fontFamily: "'DM Mono', monospace" }}>{transactions.length} total</span>
              </div>

              {!transactions.length
                ? <p style={{ color: C.subtle, fontSize: 14, padding: "30px 20px", textAlign: "center" }}>No transactions yet.</p>
                : transactions.slice(0, 15).map((t, i) => {
                    const dateStr = new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                    return (
                      <div key={t.id} style={{ ...S.txnRow, borderBottom: i === Math.min(transactions.length, 15) - 1 ? "none" : `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={S.txnIcon(t.type)}>{CATEGORY_ICONS[t.category] || "📦"}</div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{t.category}</div>
                            <div style={{ fontSize: 12, color: C.subtle, marginTop: 1 }}>{dateStr}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'DM Mono', monospace", color: t.type === "income" ? C.teal : C.red }}>
                            {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                          </span>
                          <button style={S.btnDel} onClick={() => deleteTransaction(t.id)} title="Delete">✕</button>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>

        {/* MODAL */}
        {showModal && <Modal transactions={transactions} onClose={() => setShowModal(false)} />}

        {/* TOAST */}
        <Toast msg={toast.msg} visible={toast.visible} />
      </div>
    </>
  );
}