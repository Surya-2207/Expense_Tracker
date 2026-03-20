import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import "./App.css";

/* ─── constants ─────────────────────────────── */
const API_URL = "http://localhost:8081/expenses";
const AUTH_URL = "http://localhost:8081/auth";
const SPLIT_URL = "http://localhost:8081/split";

/* ─── axios auth interceptor ─────────────────── */
axios.interceptors.request.use(config => {
  const token = sessionStorage.getItem("sw_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ─── Auth helpers ───────────────────────────── */
const getToken = () => sessionStorage.getItem("sw_token");
const getUser = () => sessionStorage.getItem("sw_user");
const saveSession = (token, username) => {
  sessionStorage.setItem("sw_token", token);
  sessionStorage.setItem("sw_user", username);
};
const clearSession = () => {
  sessionStorage.removeItem("sw_token");
  sessionStorage.removeItem("sw_user");
};

const TITLE_CATEGORY = {
  Food: "Personal", Transportation: "Travel", Entertainment: "Personal",
  Bills: "Household", Healthcare: "Medical", Shopping: "Personal", Other: "Other",
};

const ICONS = {
  Food: "🍔", Transportation: "🚗", Entertainment: "🎬",
  Bills: "🧾", Healthcare: "💊", Shopping: "🛍️", Other: "📦",
};

const BADGE = {
  Personal: "badge-personal", Travel: "badge-travel",
  Household: "badge-household", Medical: "badge-medical", Other: "badge-other",
};

const PIE_COLORS = ["#6d28d9", "#0891b2", "#db2777", "#d97706", "#059669", "#dc2626", "#7c3aed"];
const MONTH_COLORS = ["#6d28d9", "#0891b2", "#db2777", "#d97706", "#059669", "#dc2626", "#7c3aed"];

// Compact Indian currency: 500→₹500, 15000→₹15K, 200000→₹2L, 15000000→₹1.5Cr
const fmtAmt = (v) => {
  const n = Math.abs(Number(v) || 0);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n % 1e7 === 0 ? 0 : 1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(n % 1e5 === 0 ? 0 : 1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1)}K`;
  return `₹${n}`;
};

/* ─── small reusable badge ───────────────────── */
const Badge = ({ cat }) => <span className={`badge ${BADGE[cat] || "badge-other"}`}>{cat}</span>;

/* ─── Custom Year Picker (opens downward, no overflow) ──────────────────── */
function YearPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [centerYear, setCenterYear] = useState(value);
  const ref = useRef(null);
  const scrollRef = useRef(null);
  const ITEM_H = 32;
  const VISIBLE = 7;
  const RANGE = 50; // render 50 above + 50 below center = 101 years

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // When opening, reset center to selected value and scroll to middle
  useEffect(() => {
    if (open) {
      setCenterYear(value);
      setTimeout(() => {
        if (scrollRef.current) {
          // RANGE items above center, scroll so center is visible in middle
          scrollRef.current.scrollTop = RANGE * ITEM_H - Math.floor(VISIBLE / 2) * ITEM_H;
        }
      }, 0);
    }
  }, [open]);

  // When user scrolls near edges, extend the range by shifting centerYear
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const total = el.scrollHeight - el.clientHeight;
    if (el.scrollTop < ITEM_H * 5) {
      // Near top — shift center toward earlier (smaller) years
      setCenterYear(c => c - 20);
      el.scrollTop += 20 * ITEM_H;
    } else if (el.scrollTop > total - ITEM_H * 5) {
      // Near bottom — shift center toward later (larger) years
      setCenterYear(c => c + 20);
      el.scrollTop -= 20 * ITEM_H;
    }
  };

  const years = Array.from({ length: RANGE * 2 + 1 }, (_, i) => centerYear + RANGE - i);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          padding: "5px 12px", borderRadius: 20, border: "1.5px solid #ddd6fe",
          background: "#f5f0ff", color: "#7c3aed", fontWeight: 800, fontSize: 12,
          cursor: "pointer", fontFamily: "Outfit,sans-serif", outline: "none",
          display: "flex", alignItems: "center", gap: 4
        }}>
        {value} <span style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 99999,
          background: "#fff", border: "1.5px solid #ddd6fe", borderRadius: 12,
          boxShadow: "0 8px 32px rgba(124,58,237,0.22)", minWidth: 100, overflow: "hidden"
        }}>
          <div ref={scrollRef} onScroll={handleScroll}
            style={{
              height: VISIBLE * ITEM_H, overflowY: "scroll", overflowX: "hidden",
              scrollbarWidth: "thin", scrollbarColor: "#c4b5fd #f5f0ff"
            }}>
            {years.map(y => (
              <div key={y} onClick={() => { onChange(y); setOpen(false); }}
                style={{
                  height: ITEM_H, display: "flex", alignItems: "center",
                  padding: "0 20px", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  fontFamily: "Outfit,sans-serif", boxSizing: "border-box",
                  color: y === value ? "#7c3aed" : "#1a0a3c",
                  background: y === value ? "#f0eeff" : "transparent",
                  transition: "background 0.1s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = y === value ? "#e9e0ff" : "#faf9ff"}
                onMouseLeave={e => e.currentTarget.style.background = y === value ? "#f0eeff" : "transparent"}>
                {y}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/* ─── MonthPicker ────────────────────────────── */
function MonthPicker({ value, onChange, allowAll = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const MONTHS = [
    { val: "All", label: "All Months" },
    { val: 1, label: "January" }, { val: 2, label: "February" },
    { val: 3, label: "March" }, { val: 4, label: "April" },
    { val: 5, label: "May" }, { val: 6, label: "June" },
    { val: 7, label: "July" }, { val: 8, label: "August" },
    { val: 9, label: "September" }, { val: 10, label: "October" },
    { val: 11, label: "November" }, { val: 12, label: "December" },
  ].filter(m => allowAll ? true : m.val !== "All");

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = MONTHS.find(m => m.val === value) || MONTHS[0];

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          padding: "5px 12px", borderRadius: 20, border: "1.5px solid #ddd6fe",
          background: "#f5f0ff", color: "#7c3aed", fontWeight: 800, fontSize: 12,
          cursor: "pointer", fontFamily: "Outfit,sans-serif", outline: "none",
          display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap"
        }}>
        {selected.label} <span style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 9999,
          background: "#fff", border: "1.5px solid #ddd6fe", borderRadius: 12,
          boxShadow: "0 8px 24px rgba(124,58,237,0.15)", width: 140,
          maxHeight: 200, overflowY: "auto", overflowX: "hidden",
          scrollbarWidth: "thin", scrollbarColor: "#c4b5fd #f5f0ff"
        }}>
          {MONTHS.map(m => (
            <div key={m.val} onClick={() => { onChange(m.val); setOpen(false); }}
              style={{
                padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700,
                fontFamily: "Outfit,sans-serif", whiteSpace: "nowrap",
                color: m.val === value ? "#7c3aed" : "#1a0a3c",
                background: m.val === value ? "#f0eeff" : "transparent",
                transition: "background 0.12s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = m.val === value ? "#e9e0ff" : "#faf9ff"}
              onMouseLeave={e => e.currentTarget.style.background = m.val === value ? "#f0eeff" : "transparent"}>
              {m.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ─── CategoryPicker ─────────────────────────── */
function CategoryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const CATS = [
    { val: "All", label: "All Categories", bg: "#1a0a3c", color: "#fff" },
    { val: "Personal", label: "Personal", bg: "#7c3aed", color: "#fff" },
    { val: "Travel", label: "Travel", bg: "#d97706", color: "#fff" },
    { val: "Household", label: "Household", bg: "#16a34a", color: "#fff" },
    { val: "Medical", label: "Medical", bg: "#e11d48", color: "#fff" },
    { val: "Other", label: "Other", bg: "#6366f1", color: "#fff" },
  ];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = CATS.find(c => c.val === value) || CATS[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger button */}
      <div onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 14px", border: "1.5px solid #ddd6fe", borderRadius: 10,
          background: "#fff", cursor: "pointer", userSelect: "none"
        }}>
        <span style={{
          display: "inline-flex", alignItems: "center", padding: "3px 12px",
          borderRadius: 20, background: selected.bg, color: selected.color,
          fontWeight: 800, fontSize: 12, fontFamily: "Outfit,sans-serif"
        }}>
          {selected.label}
        </span>
        <span style={{ fontSize: 11, color: "#7c3aed", marginLeft: 8 }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          zIndex: 999, background: "#fff", border: "1.5px solid #ddd6fe", borderRadius: 12,
          boxShadow: "0 8px 24px rgba(124,58,237,0.15)", overflow: "hidden"
        }}>
          {CATS.map(c => (
            <div key={c.val} onClick={() => { onChange(c.val); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", padding: "10px 14px",
                cursor: "pointer", transition: "background 0.12s",
                background: c.val === value ? "#faf9ff" : "transparent"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f5f0ff"}
              onMouseLeave={e => e.currentTarget.style.background = c.val === value ? "#faf9ff" : "transparent"}>
              <span style={{
                display: "inline-flex", alignItems: "center",
                padding: "4px 14px", borderRadius: 20,
                background: c.bg, color: c.color,
                fontWeight: 800, fontSize: 12, fontFamily: "Outfit,sans-serif"
              }}>
                {c.label}
              </span>
              {c.val === value && (
                <span style={{ marginLeft: "auto", color: "#7c3aed", fontSize: 14, fontWeight: 900 }}>✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DASHBOARD TAB
══════════════════════════════════════════════ */
function DashboardTab({ expenses }) {
  const now = new Date();
  const [budgetMonth, setBudgetMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const budgetKey = `sw_budget_${budgetMonth.year}_${budgetMonth.month}`;
  const [budgetMap, setBudgetMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sw_budget_map") || "{}"); } catch { return {}; }
  });
  const budget = Number(budgetMap[budgetKey] || 0);
  const [budgetInput, setBudgetInput] = useState("");
  const [editingBudget, setEditingBudget] = useState(false);

  const saveBudget = () => {
    const val = Number(budgetInput);
    if (val > 0) {
      const updated = { ...budgetMap, [budgetKey]: val };
      setBudgetMap(updated);
      localStorage.setItem("sw_budget_map", JSON.stringify(updated));
    }
    setEditingBudget(false);
    setBudgetInput("");
  };

  // ── Selected month & year from picker ──
  const selMonth = budgetMonth.month;
  const selYear = budgetMonth.year;

  // ── Year-filtered expenses ──
  const yearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === selYear);

  // ── Overall all-time total ──
  const overallTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // ── Year stats — change with year picker ──
  const yearTotal = yearExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const yearHighest = yearExpenses.length ? Math.max(...yearExpenses.map(e => Number(e.amount))) : 0;
  const yearAvg = yearExpenses.length ? Math.round(yearTotal / yearExpenses.length) : 0;

  // ── Month highest expense ──
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() + 1 === selMonth && d.getFullYear() === selYear;
  });
  const monthHighest = monthExpenses.length ? Math.max(...monthExpenses.map(e => Number(e.amount))) : 0;

  const catData = Object.values(
    expenses.reduce((acc, e) => {
      if (!acc[e.category]) acc[e.category] = { name: e.category, value: 0 };
      acc[e.category].value += Number(e.amount); return acc;
    }, {})
  );

  // ── Day-wise data — follows budgetMonth selection ──
  const daysInMonth = new Date(selYear, selMonth, 0).getDate();
  const dayMap = {};
  for (let d = 1; d <= daysInMonth; d++) dayMap[d] = 0;
  expenses.forEach(e => {
    const d = new Date(e.date);
    if (d.getMonth() + 1 === selMonth && d.getFullYear() === selYear) {
      dayMap[d.getDate()] += Number(e.amount);
    }
  });
  const dayData = Object.entries(dayMap).map(([day, value]) => ({ name: `${day}`, value }));

  // ── Month-wise data — filtered to selected year ──
  const monthMap = {};
  yearExpenses.forEach(e => {
    const k = new Date(e.date).toLocaleString("default", { month: "short", year: "numeric" });
    if (!monthMap[k]) monthMap[k] = 0;
    monthMap[k] += Number(e.amount);
  });
  const monthData = Object.entries(monthMap)
    .map(([name, value]) => ({ name, value, _d: new Date(name) }))
    .sort((a, b) => a._d - b._d)
    .map(({ name, value }) => ({ name, value }));

  // ── Selected month vs previous month ──
  const thisMonthTotal = expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() + 1 === selMonth && d.getFullYear() === selYear; })
    .reduce((s, e) => s + Number(e.amount), 0);

  const prevMonthDate = new Date(selYear, selMonth - 2, 1);
  const lastMonthTotal = expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() === prevMonthDate.getMonth() && d.getFullYear() === prevMonthDate.getFullYear(); })
    .reduce((s, e) => s + Number(e.amount), 0);

  const monthChange = lastMonthTotal > 0 ? (((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1) : null;

  const selDate = new Date(selYear, selMonth - 1, 1);
  const monthName = selDate.toLocaleString("default", { month: "long", year: "numeric" });

  // ── W1 Pill card helper ──
  const GradCard = ({ icon, label, value, meta, from, to, big }) => (
    <div style={{
      background: `linear-gradient(135deg,${from},${to})`,
      borderRadius: big ? 18 : 16,
      padding: big ? "20px 22px" : "14px 16px",
      display: "flex", flexDirection: big ? "row" : "column",
      alignItems: big ? "center" : "flex-start",
      gap: big ? 16 : 6,
      boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
    }}>
      <div style={{ width: big?48:36, height: big?48:36, borderRadius: big?14:10, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: big?24:18, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Outfit,sans-serif", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: big?28:22, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, fontFamily: "Outfit,sans-serif" }}>{value}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 3, fontFamily: "Outfit,sans-serif", fontWeight: 600 }}>{meta}</div>
      </div>
    </div>
  );

  const selMonthShortName = new Date(selYear, selMonth - 1, 1).toLocaleString("default", { month: "short" });

  return (
    <div>
      {/* ── ALL TIME section ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#059669", display: "inline-block" }} />
        <span style={{
          fontSize: 11, fontWeight: 800, color: "#374151", letterSpacing: "0.1em",
          textTransform: "uppercase", fontFamily: "Outfit,sans-serif"
        }}>All Time</span>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,#d1fae5,transparent)" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <GradCard big icon="🌐" label="Overall Total"
          value={fmtAmt(overallTotal)} meta={`${expenses.length} transactions all time`}
          from="#16a34a" to="#4ade80" />
        <GradCard big icon="📊" label="All Time Average"
          value={fmtAmt(expenses.length ? Math.round(overallTotal / expenses.length) : 0)}
          meta="Per transaction overall"
          from="#ea580c" to="#fb923c" />
      </div>

      {/* ── YEAR section — synced to year picker ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: "#7c3aed", display: "inline-block" }} />
        <span style={{
          fontSize: 11, fontWeight: 800, color: "#374151", letterSpacing: "0.1em",
          textTransform: "uppercase", fontFamily: "Outfit,sans-serif"
        }}>{selYear}</span>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,#ddd6fe,transparent)" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { icon: "💰", label: `${selYear} Total`,            value: fmtAmt(yearTotal),      meta: `${yearExpenses.length} transactions`, from:"#7c3aed", to:"#a855f7" },
          { icon: "📈", label: `Highest in ${selYear}`,       value: fmtAmt(yearHighest),    meta: "Single transaction",                  from:"#db2777", to:"#f472b6" },
          { icon: "📉", label: `Avg in ${selYear}`,           value: fmtAmt(yearAvg),        meta: "Per transaction",                     from:"#0891b2", to:"#22d3ee" },
          { icon: "📅", label: `Top in ${selMonthShortName}`, value: fmtAmt(monthHighest),   meta: "Single transaction",                  from:"#d97706", to:"#fbbf24" },
          { icon: "🗂️", label: `${selMonthShortName} Total`, value: fmtAmt(thisMonthTotal), meta: monthChange !== null ? `${Number(monthChange) > 0 ? "↑" : "↓"} ${Math.abs(monthChange)}% vs prev` : "No prev data", from:"#0f766e", to:"#14b8a6" },
        ].map(({ icon, label, value, meta, from, to }) => (
          <GradCard key={label} icon={icon} label={label} value={value} meta={meta} from={from} to={to}/>
        ))}
      </div>

      {/* Budget Tracker — Donut style */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-header">
          <h3 className="panel-title">🎯 Monthly Budget Tracker</h3>
          <button onClick={() => { setEditingBudget(true); setBudgetInput(budget || ""); }}
            style={{
              padding: "5px 14px", borderRadius: 8, border: "1.5px solid #ddd6fe",
              background: "#f5f0ff", color: "#7c3aed", fontWeight: 700, fontSize: 12,
              cursor: "pointer", fontFamily: "Outfit,sans-serif"
            }}>
            {budget ? "✏️ Edit" : "➕ Set Budget"}
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {editingBudget && (
            <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
              <div className="input-prefix-wrap" style={{ flex: 1 }}>
                <span className="input-prefix">₹</span>
                <input className="form-control with-prefix" type="number" placeholder="Enter monthly budget"
                  value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveBudget(); if (e.key === "Escape") setEditingBudget(false); }}
                  autoFocus />
              </div>
              <button onClick={saveBudget} style={{
                padding: "10px 18px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff",
                fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "Outfit,sans-serif"
              }}>Save</button>
              <button onClick={() => setEditingBudget(false)} style={{
                padding: "10px 14px", borderRadius: 8,
                border: "1.5px solid #e4e0ff", background: "#fff", color: "#5a3f8a",
                fontWeight: 600, fontSize: 13, cursor: "pointer"
              }}>Cancel</button>
            </div>
          )}
          {budget > 0 ? (() => {
            const thisMonthSpent = expenses
              .filter(e => { const d = new Date(e.date); return d.getMonth() + 1 === budgetMonth.month && d.getFullYear() === budgetMonth.year; })
              .reduce((s, e) => s + Number(e.amount), 0);
            const remaining = budget - thisMonthSpent;
            const pct = Math.min((thisMonthSpent / budget) * 100, 100);
            const isOver = remaining < 0;
            const isWarn = pct >= 75 && !isOver;

            const donutData = isOver
              ? [{ name: "Spent", value: budget }, { name: "Over", value: Math.abs(remaining) }]
              : [
                { name: "Spent", value: thisMonthSpent },
                { name: "Remaining", value: remaining > 0 ? remaining : 0 },
              ];
const donutColors = isOver ? ["#f97316", "#e11d48"] : ["#f97316", "#16a34a"];
            const MONTHS = ["January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"];
            const currentYear = now.getFullYear();
            const years = Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i);

            return (
              <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
                {/* Donut chart */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={donutData} dataKey="value" cx="50%" cy="50%"
                        innerRadius={62} outerRadius={90} paddingAngle={3} startAngle={90} endAngle={-270}>
                        {donutData.map((_, i) => <Cell key={i} fill={donutColors[i]} strokeWidth={0} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center — show SPENT amount */}
                  <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none"
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: "#8b72be",
                      fontFamily: "Outfit,sans-serif", letterSpacing: "0.06em", marginBottom: 2
                    }}>
                      {isOver ? "OVER BY" : "SPENT"}
                    </div>
                    <div style={{
                      fontSize: 17, fontWeight: 900,
                      color: isOver ? "#e11d48" : "#f97316",
                      fontFamily: "Outfit,sans-serif", letterSpacing: "-0.03em", lineHeight: 1.1
                    }}>
                      {fmtAmt(isOver ? Math.abs(remaining) : thisMonthSpent)}
                    </div>
                    <div style={{ fontSize: 10, color: "#8b72be", marginTop: 2 }}>
                      {isOver ? "budget exceeded" : `${pct.toFixed(0)}% used`}
                    </div>
                  </div>
                </div>

                {/* Right side */}
                <div style={{ flex: 1 }}>
                  {/* Month dropdown + Year dropdown */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <MonthPicker
                      value={budgetMonth.month}
                      onChange={v => setBudgetMonth(prev => ({ ...prev, month: Number(v) }))}
                    />
                    <YearPicker
                      value={budgetMonth.year}
                      onChange={y => setBudgetMonth(prev => ({ ...prev, year: y }))} />
                  </div>

                  {/* 3 stat rows */}
                  {[
                    { dot: "#7c3aed", label: "Total Budget", val: fmtAmt(budget), sub: "monthly limit" },
                    { dot: "#f97316", label: "Spent", val: fmtAmt(thisMonthSpent), sub: `${pct.toFixed(1)}% used` },
                    {
                      dot: isOver ? "#e11d48" : "#16a34a",
                      label: isOver ? "Overspent" : "Remaining",
                      val: isOver ? `-${fmtAmt(Math.abs(remaining))}` : fmtAmt(remaining),
                      sub: isOver ? "exceeded budget" : "left to spend"
                    },
                  ].map(({ dot, label, val, sub }) => (
                    <div key={label} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 0", borderBottom: "1px solid #f0eeff"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a0a3c", fontFamily: "Outfit,sans-serif" }}>{label}</div>
                          <div style={{ fontSize: 11, color: "#8b72be" }}>{sub}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: dot, fontFamily: "Outfit,sans-serif", letterSpacing: "-0.02em" }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })() : (
            <div>
              {/* Month dropdown + Year dropdown */}
              {(() => {
                const MONTHS = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];
                const currentYear = now.getFullYear();
                const years = Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <MonthPicker
                      value={budgetMonth.month}
                      onChange={v => setBudgetMonth(prev => ({ ...prev, month: Number(v) }))}
                    />
                    <YearPicker
                      value={budgetMonth.year}
                      onChange={y => setBudgetMonth(prev => ({ ...prev, year: y }))} />
                  </div>
                );
              })()}
              <div style={{ textAlign: "center", padding: "24px 0", color: "#8b72be" }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>🎯</div>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#5a3f8a", fontFamily: "Outfit,sans-serif" }}>No budget set for this month</p>
                <p style={{ fontSize: 12, marginTop: 6 }}>Click "Set Budget" to start tracking your spending limit</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts row — Day-wise + Month-wise */}
      <div className="charts-grid" style={{ marginBottom: 24 }}>

        {/* Day-wise area chart for current month */}
        <div className="panel chart-panel">
          <div className="panel-header">
            <h3 className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              📆 Daily Spend
              <span style={{
                fontSize: 10, fontWeight: 800, background: "#f5f3ff", color: "#7c3aed",
                padding: "3px 10px", borderRadius: 20, border: "1.5px solid #c4b5fd",
                fontFamily: "Outfit,sans-serif", letterSpacing: "0.04em"
              }}>{monthName}</span>
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dayData} margin={{ top: 16, right: 20, left: 10, bottom: 24 }}>
              <defs>
                <linearGradient id="dayGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e0ff" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8b72be" }}
                interval={4} label={{ value: "Day", position: "insideBottomRight", offset: 0, fontSize: 10, fill: "#8b72be" }} />
              <YAxis tick={{ fontSize: 10, fill: "#8b72be" }} width={48} tickFormatter={v => fmtAmt(v)} />
              <Tooltip
                formatter={v => [fmtAmt(v), "Spent"]}
                labelFormatter={l => `Day ${l}`}
                contentStyle={{ borderRadius: 10, border: "1.5px solid #e4e0ff", fontSize: 13 }}
              />
              <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2.5}
                fill="url(#dayGradient)" dot={{ r: 3, fill: "#7c3aed", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#7c3aed" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Month-wise area timeline overall */}
        <div className="panel chart-panel">
          <div className="panel-header">
            <h3 className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              📅 Monthly Timeline
              <span style={{
                fontSize: 10, fontWeight: 800, background: "#ecfeff", color: "#0891b2",
                padding: "3px 10px", borderRadius: 20, border: "1.5px solid #67e8f9",
                fontFamily: "Outfit,sans-serif", letterSpacing: "0.04em"
              }}>{selYear}</span>
            </h3>
          </div>
          {monthData.length === 0
            ? <div style={{ padding: 40, textAlign: "center", color: "#8b72be" }}>No data yet</div>
            : <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthData} margin={{ top: 16, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="monthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e0ff" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8b72be" }} tickFormatter={v => v.split(" ")[0]} padding={{ left: 20, right: 20 }} />
                <YAxis tick={{ fontSize: 10, fill: "#8b72be" }} width={48} tickFormatter={v => fmtAmt(v)} />
                <Tooltip
                  formatter={v => [fmtAmt(v), "Spent"]}
                  contentStyle={{ borderRadius: 10, border: "1.5px solid #e4e0ff", fontSize: 13 }}
                />
                <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2.5}
                  fill="url(#monthGradient)" dot={{ r: 4, fill: "#06b6d4", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#06b6d4" }} />
              </AreaChart>
            </ResponsiveContainer>
          }
        </div>
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════
   EXPENSES TAB  (Add / Edit / Delete / Filter)
══════════════════════════════════════════════ */
function ExpensesTab({ expenses, onRefresh }) {
  const [formData, setFormData] = useState({ title: "", amount: "", category: "", date: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const formRef = useRef(null);

  const [selCat, setSelCat] = useState("All");
  const [selYear, setSelYear] = useState("All");
  const [selMonth, setSelMonth] = useState("All");
  const [selDate, setSelDate] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.date || !formData.category) {
      alert("Fill all fields"); return;
    }
    const payload = {
      title: formData.title,
      amount: formData.amount,
      category: formData.category,
      date: formData.date,
    };
    try {
      if (isEditing) {
        await axios.put(`${API_URL}/${editId}`, payload);
        setIsEditing(false); setEditId(null);
      } else {
        await axios.post(API_URL, payload);
      }
      onRefresh();
      setFormData({ title: "", amount: "", category: "", date: "" });
    } catch (err) {
      console.error("Save failed:", err);
      alert(`Failed to ${isEditing ? "update" : "add"} expense: ${err?.response?.data?.message || err.message}`);
    }
  };

  // Preserve all editable fields exactly as stored — don't let TITLE_CATEGORY override existing category
  const handleEdit = (exp) => {
    setFormData({ title: exp.title, amount: exp.amount, category: exp.category, date: exp.date });
    setIsEditing(true);
    setEditId(exp.id);
    // Scroll form into view smoothly
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleDelete = async (id) => {
    try { await axios.delete(`${API_URL}/${id}`); onRefresh(); setDeleteConfirm(null); }
    catch (err) { console.error(err); }
  };

  const filtered = expenses.filter(exp => {
    const d = new Date(exp.date);
    return (selCat === "All" || exp.category === selCat)
      && (selYear === "All" || d.getFullYear() === Number(selYear))
      && (selMonth === "All" || d.getMonth() + 1 === Number(selMonth))
      && (selDate === "" || exp.date === selDate);
  });

  return (
    <div className="content-grid">
      {/* ── Form ── */}
      <div ref={formRef} className="panel form-panel">
        <div className="panel-header">
          <h3 className="panel-title">{isEditing ? "✏️ Edit Expense" : "➕ Add Expense"}</h3>
        </div>
        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group">
            <label className="form-label">Expense Title</label>
            <select className="form-control" value={formData.title}
              onChange={e => {
                const t = e.target.value;
                // Only auto-fill category when adding new — when editing keep existing category unless blank
                const cat = isEditing ? (formData.category || TITLE_CATEGORY[t] || "") : (TITLE_CATEGORY[t] || "");
                setFormData({ ...formData, title: t, category: cat });
              }}>
              <option value="">Select a title...</option>
              {Object.keys(TITLE_CATEGORY).map(t => <option key={t} value={t}>{ICONS[t]} {t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <div className="input-prefix-wrap">
              <span className="input-prefix">₹</span>
              <input type="number" className="form-control with-prefix" placeholder="0.00"
                value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="category-display">
              {formData.category
                ? <Badge cat={formData.category} />
                : <span className="category-empty">Auto-filled from title</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-control" value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })} />
          </div>

          <button type="submit" className="btn-submit">{isEditing ? "💾 Update Expense" : "➕ Add Expense"}</button>
          {isEditing && (
            <button type="button" className="btn-cancel" onClick={() => {
              setIsEditing(false); setEditId(null); setFormData({ title: "", amount: "", category: "", date: "" });
            }}>Cancel</button>
          )}
        </form>
      </div>

      {/* ── Filter + Table ── */}
      <div className="table-panel">
        <div className="panel filter-panel">
          <div className="panel-header">
            <h3 className="panel-title">🔍 Filter Expenses</h3>
            <button className="btn-clear-filters" onClick={() => { setSelCat("All"); setSelYear("All"); setSelMonth("All"); setSelDate(""); }}>
              Clear All
            </button>
          </div>
          <div className="filters-grid">
            <div className="form-group">
              <label className="form-label">Category</label>
              <CategoryPicker value={selCat} onChange={setSelCat} />
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <YearPicker
                  value={selYear === "All" ? new Date().getFullYear() : selYear}
                  onChange={y => setSelYear(y)}
                />
                {selYear !== "All" && (
                  <button onClick={() => setSelYear("All")}
                    style={{
                      fontSize: 11, color: "#7c3aed", background: "none", border: "none",
                      cursor: "pointer", fontWeight: 700, padding: 0
                    }}>✕ All</button>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Month</label>
              <MonthPicker
                value={selMonth}
                onChange={v => setSelMonth(v)}
                allowAll={true}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Specific Date</label>
              <input type="date" className="form-control" value={selDate} onChange={e => setSelDate(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">📋 Transactions</h3>
            <span className="result-count">{filtered.length} results</span>
          </div>
          <div className="table-wrapper">
            <table className="expense-table">
              <thead><tr><th>Title</th><th>Amount</th><th>Category</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={5} className="empty-state"><span className="empty-icon">🧾</span><p>No expenses found</p></td></tr>
                  : filtered.map(exp => (
                    <tr key={exp.id} className="table-row">
                      <td>
                        <div className="title-cell">
                          <span className="title-icon">{ICONS[exp.title] || "📦"}</span>
                          <span>{exp.title}</span>
                        </div>
                      </td>
                      <td><span className="amount-cell">{fmtAmt(Number(exp.amount))}</span></td>
                      <td><Badge cat={exp.category} /></td>
                      <td className="date-cell">
                        {new Date(exp.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-edit" onClick={() => handleEdit(exp)} title="Edit">✏️ Edit</button>
                          {deleteConfirm === exp.id
                            ? <>
                              <button className="btn-confirm-delete" onClick={() => handleDelete(exp.id)}>✓ Yes</button>
                              <button className="btn-cancel-delete" onClick={() => setDeleteConfirm(null)}>✕</button>
                            </>
                            : <button className="btn-delete" onClick={() => setDeleteConfirm(exp.id)} title="Delete">🗑️ Del</button>
                          }
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ANALYTICS TAB
══════════════════════════════════════════════ */
function AnalyticsTab({ expenses }) {
  const now = new Date();

  // ── Chart view toggle ──
  const [chartView, setChartView] = useState("alltime");
  const [chartYear, setChartYear] = useState(now.getFullYear());
  const chartExpenses = chartView === "year"
    ? expenses.filter(e => new Date(e.date).getFullYear() === chartYear)
    : expenses;

  // ── Comparison state ──
  const [cmpA, setCmpA] = useState({
    month: now.getMonth() === 0 ? 12 : now.getMonth(),
    year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
  });
  const [cmpB, setCmpB] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const MONTHS_FULL = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = now.getFullYear();

  const selStyle = {
    padding: "5px 10px", borderRadius: 20, border: "1.5px solid #ddd6fe",
    background: "#f5f0ff", color: "#7c3aed", fontWeight: 700, fontSize: 12,
    cursor: "pointer", fontFamily: "Outfit,sans-serif", outline: "none",
  };

  // Get total + per-category spend for a month
  const getMonthData = ({ month, year }) => {
    const filtered = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
    const cats = filtered.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {});
    return { total, cats, count: filtered.length };
  };

  const dataA = getMonthData(cmpA);
  const dataB = getMonthData(cmpB);
  const labelA = `${MONTHS_SHORT[cmpA.month - 1]} ${cmpA.year}`;
  const labelB = `${MONTHS_SHORT[cmpB.month - 1]} ${cmpB.year}`;
  const allCats = [...new Set([...Object.keys(dataA.cats), ...Object.keys(dataB.cats)])];
  // All categories ever used — so radar always shows full shape
  const allCatsEver = [...new Set(expenses.map(e => e.category))].sort();
  const cmpBarData = allCats.map(cat => ({
    name: cat,
    [labelA]: dataA.cats[cat] || 0,
    [labelB]: dataB.cats[cat] || 0,
  }));
  const diff = dataB.total - dataA.total;
  const pctDiff = dataA.total > 0 ? ((diff / dataA.total) * 100).toFixed(1) : null;
  const isUp = diff > 0;

  // ── Overall data (respects chart view toggle) ──
  const catData = Object.values(
    chartExpenses.reduce((acc, e) => {
      if (!acc[e.category]) acc[e.category] = { name: e.category, value: 0, count: 0 };
      acc[e.category].value += Number(e.amount);
      acc[e.category].count += 1;
      return acc;
    }, {})
  );

  const monthData = Object.values(
    chartExpenses.reduce((acc, e) => {
      const k = new Date(e.date).toLocaleString("default", { month: "short", year: "numeric" });
      if (!acc[k]) acc[k] = { name: k, value: 0 };
      acc[k].value += Number(e.amount); return acc;
    }, {})
  );

  const total = chartExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // ── Radar: avg spend per month (Jan–Dec) across all years or for selected year ──
  const radarData = MONTHS_SHORT.map((m, i) => {
    const sourceExpenses = expenses; // always use all expenses for avg calculation
    const years = chartView === "alltime"
      ? [...new Set(sourceExpenses.map(e => new Date(e.date).getFullYear()))]
      : [chartYear];
    const vals = years.map(y =>
      sourceExpenses
        .filter(e => new Date(e.date).getMonth() === i && new Date(e.date).getFullYear() === y)
        .reduce((s, e) => s + Number(e.amount), 0)
    ).filter(v => v > 0);
    return { month: m, avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 };
  });
  const peakMonth = radarData.reduce((a, b) => b.avg > a.avg ? b : a, radarData[0]);
  const lowestMonth = radarData.filter(d => d.avg > 0).reduce((a, b) => b.avg < a.avg ? b : a, radarData.find(d => d.avg > 0) || radarData[0]);

  // ── Year comparison state ──
  const [yrA, setYrA] = useState(now.getFullYear() - 1);
  const [yrB, setYrB] = useState(now.getFullYear());

  // Get total + per-category + per-month spend for a year
  const getYearData = (year) => {
    const filtered = expenses.filter(e => new Date(e.date).getFullYear() === year);
    const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
    const cats = filtered.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {});
    // Monthly totals for bar chart
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const mon = i + 1;
      const amt = filtered
        .filter(e => new Date(e.date).getMonth() + 1 === mon)
        .reduce((s, e) => s + Number(e.amount), 0);
      return { name: MONTHS_SHORT[i], amount: amt };
    });
    return { total, cats, count: filtered.length, monthly };
  };

  const yrDataA = getYearData(yrA);
  const yrDataB = getYearData(yrB);
  const yrDiff = yrDataB.total - yrDataA.total;
  const yrPct = yrDataA.total > 0 ? ((yrDiff / yrDataA.total) * 100).toFixed(1) : null;
  const yrIsUp = yrDiff > 0;
  const allYrCats = [...new Set([...Object.keys(yrDataA.cats), ...Object.keys(yrDataB.cats)])];

  // Monthly bar chart data for year comparison
  const yrBarData = yrDataA.monthly.map((m, i) => ({
    name: m.name,
    [String(yrA)]: m.amount,
    [String(yrB)]: yrDataB.monthly[i].amount,
  }));

  // Combined category breakdown for both comparisons
  const allCombinedCats = [...new Set([
    ...Object.keys(dataA.cats), ...Object.keys(dataB.cats),
    ...Object.keys(yrDataA.cats), ...Object.keys(yrDataB.cats),
  ])];

  return (
    <div>

      {/* ── View Toggle Bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
        background: "#faf9ff", border: "1.5px solid #e4e0ff", borderRadius: 14,
        padding: "10px 16px", flexWrap: "wrap"
      }}>
        <span style={{
          fontSize: 11, fontWeight: 800, color: "#8b72be",
          fontFamily: "Outfit,sans-serif", letterSpacing: "0.05em", textTransform: "uppercase"
        }}>
          📊 Chart View:
        </span>
        <div style={{ display: "flex", background: "#ede9fe", borderRadius: 10, padding: 3, gap: 2 }}>
          {[{ val: "alltime", label: "🌐 All Time" }, { val: "year", label: "📅 By Year" }].map(opt => (
            <button key={opt.val} onClick={() => setChartView(opt.val)}
              style={{
                padding: "5px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "Outfit,sans-serif", fontWeight: 800, fontSize: 12,
                background: chartView === opt.val ? "linear-gradient(135deg,#7c3aed,#ec4899)" : "transparent",
                color: chartView === opt.val ? "#fff" : "#7c3aed",
                boxShadow: chartView === opt.val ? "0 2px 8px rgba(124,58,237,0.3)" : "none",
                transition: "all 0.15s"
              }}>
              {opt.label}
            </button>
          ))}
        </div>
        {chartView === "year" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", fontFamily: "Outfit,sans-serif" }}>Year:</span>
            <YearPicker value={chartYear} onChange={y => setChartYear(y)} />
            <span style={{ fontSize: 11, color: "#8b72be", fontFamily: "Outfit,sans-serif" }}>
              — {chartExpenses.length} transactions
            </span>
          </div>
        )}
        {chartView === "alltime" && (
          <span style={{ fontSize: 11, color: "#8b72be", fontFamily: "Outfit,sans-serif" }}>
            Showing all {expenses.length} transactions across all years
          </span>
        )}
      </div>

      {/* ── Spending Overview: Radar (left) + Category Breakdown (right) ── */}
      <div className="panel" style={{ marginBottom: 24, padding: 0, overflow: "hidden" }}>

        {/* ── Unified panel header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 22px", borderBottom: "1.5px solid #f0eeff",
          background: "linear-gradient(90deg,#faf9ff,#fff)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15 }}>📊</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#1a0a3c", fontFamily: "Outfit,sans-serif" }}>
              Spending Overview
            </span>
            <span style={{
              fontSize: 10, color: "#8b72be", fontFamily: "Outfit,sans-serif", fontWeight: 600,
              background: "#f0eeff", padding: "2px 8px", borderRadius: 20, border: "1px solid #e4e0ff"
            }}>
              {chartView === "alltime" ? `${expenses.length} transactions` : `${chartExpenses.length} transactions`}
            </span>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 800, fontFamily: "Outfit,sans-serif",
            padding: "3px 10px", borderRadius: 20,
            background: chartView === "year" ? "#ede9fe" : "#ecfdf5",
            color: chartView === "year" ? "#7c3aed" : "#059669",
            border: `1.5px solid ${chartView === "year" ? "#c4b5fd" : "#6ee7b7"}`
          }}>
            {chartView === "year" ? `📅 ${chartYear}` : "🌐 All Time"}
          </span>
        </div>

        {catData.length === 0
          ? <div style={{ padding: 60, textAlign: "center", color: "#8b72be" }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📊</div>
              <p style={{ fontWeight: 700, fontSize: 14, fontFamily: "Outfit,sans-serif" }}>
                No data {chartView === "year" ? `for ${chartYear}` : "yet"}
              </p>
            </div>
          : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>

              {/* ══ LEFT: Monthly Trend Radar ══ */}
              <div style={{
                padding: "20px 16px 20px 22px",
                borderRight: "1.5px solid #f0eeff",
                display: "flex", flexDirection: "column", gap: 0,
              }}>
                {/* Sub-header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 13 }}>📊</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#1a0a3c", fontFamily: "Outfit,sans-serif" }}>Monthly Trend</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#8b72be", fontFamily: "Outfit,sans-serif", fontWeight: 600 }}>
                    {chartView === "alltime" ? "avg spend · Jan–Dec across all years" : `monthly spend · ${chartYear}`}
                  </span>
                </div>

                {/* 12-bar avg bar chart */}
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={radarData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      {radarData.map((_, i) => (
                        <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%\" stopColor={["#f43f5e","#f97316","#eab308","#22c55e","#06b6d4","#6366f1","#a855f7","#ec4899","#14b8a6","#3b82f6","#84cc16","#fb923c"][i]} stopOpacity={1} />
                          <stop offset="100%" stopColor={["#f43f5e","#f97316","#eab308","#22c55e","#06b6d4","#6366f1","#a855f7","#ec4899","#14b8a6","#3b82f6","#84cc16","#fb923c"][i]} stopOpacity={0.55} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0eeff" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8b72be", fontFamily: "Outfit,sans-serif", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#b39ddb", fontFamily: "Outfit,sans-serif" }} axisLine={false} tickLine={false} tickFormatter={v => v > 0 ? `₹${Math.round(v/1000)}k` : ""} width={38} />
                    <Tooltip
                      formatter={v => [fmtAmt(v), chartView === "alltime" ? "Avg Spent" : "Total Spent"]}
                      contentStyle={{ borderRadius: 10, border: "1.5px solid #e4e0ff", fontSize: 12, fontFamily: "Outfit,sans-serif", boxShadow: "0 4px 16px rgba(124,58,237,0.12)" }}
                      cursor={{ fill: "rgba(124,58,237,0.05)" }}
                    />
                    <Bar dataKey="avg" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {radarData.map((_, i) => (
                        <Cell key={i} fill={`url(#barGrad${i})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Peak & Low callout cards */}
                {peakMonth && peakMonth.avg > 0 && (
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <div style={{
                      flex: 1, display: "flex", alignItems: "center", gap: 10,
                      background: "linear-gradient(135deg,#fdf4ff,#ede9fe)",
                      border: "1.5px solid #e879f9", borderRadius: 12, padding: "10px 14px",
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: "linear-gradient(135deg,#d946ef,#818cf8)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, flexShrink: 0, boxShadow: "0 2px 8px rgba(217,70,239,0.4)"
                      }}>🔺</div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: "#a21caf", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "Outfit,sans-serif" }}>Peak Month</div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "#1a0a3c", fontFamily: "Outfit,sans-serif", letterSpacing: "-0.01em" }}>{peakMonth.month}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6d28d9", fontFamily: "Outfit,sans-serif" }}>{fmtAmt(peakMonth.avg)}</div>
                      </div>
                    </div>
                    {lowestMonth && lowestMonth.month !== peakMonth.month && (
                      <div style={{
                        flex: 1, display: "flex", alignItems: "center", gap: 10,
                        background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
                        border: "1.5px solid #93c5fd", borderRadius: 12, padding: "10px 14px",
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, flexShrink: 0, boxShadow: "0 2px 8px rgba(29,78,216,0.4)"
                        }}>🔻</div>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 800, color: "#1d4ed8", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "Outfit,sans-serif" }}>Lowest Month</div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: "#1a0a3c", fontFamily: "Outfit,sans-serif", letterSpacing: "-0.01em" }}>{lowestMonth.month}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", fontFamily: "Outfit,sans-serif" }}>{fmtAmt(lowestMonth.avg)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ══ RIGHT: Category Breakdown ══ */}
              <div style={{
                padding: "20px 22px 20px 18px",
                display: "flex", flexDirection: "column",
              }}>
                {/* Sub-header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 13 }}>🎯</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#1a0a3c", fontFamily: "Outfit,sans-serif" }}>Category Breakdown</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#1a0a3c", fontFamily: "Outfit,sans-serif", letterSpacing: "-0.01em" }}>
                    {fmtAmt(total)}
                  </span>
                </div>

                {/* Donut */}
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie
                        data={catData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={82} innerRadius={46}
                        paddingAngle={3} startAngle={90} endAngle={-270}
                      >
                        {catData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={v => [fmtAmt(v), "Amount"]}
                        contentStyle={{
                          borderRadius: 10, border: "1.5px solid #e4e0ff",
                          fontSize: 12, fontFamily: "Outfit,sans-serif",
                          boxShadow: "0 4px 16px rgba(124,58,237,0.12)"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Category rows with progress bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 8, flex: 1 }}>
                  {[...catData].sort((a, b) => b.value - a.value).map((cat, i) => {
                    const pct = total ? (cat.value / total) * 100 : 0;
                    const color = PIE_COLORS[i % PIE_COLORS.length];
                    return (
                      <div key={cat.name}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1a0a3c", fontFamily: "Outfit,sans-serif" }}>{cat.name}</span>
                            <span style={{ fontSize: 10, color: "#b39ddb", fontFamily: "Outfit,sans-serif" }}>{cat.count} txns</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: "#1a0a3c", fontFamily: "Outfit,sans-serif" }}>
                              {fmtAmt(cat.value)}
                            </span>
                            <span style={{
                              fontSize: 10, fontWeight: 900, fontFamily: "Outfit,sans-serif",
                              color, minWidth: 34, textAlign: "right"
                            }}>
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div style={{ height: 5, background: "#f0eeff", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{
                            width: `${pct}%`, height: "100%",
                            background: `linear-gradient(90deg,${color}cc,${color})`,
                            borderRadius: 99, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)"
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Divider + total footer */}
                <div style={{
                  marginTop: 14, paddingTop: 12,
                  borderTop: "1.5px solid #f0eeff",
                  display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[...catData].sort((a, b) => b.value - a.value).map((cat, i) => (
                      <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#8b72be", fontFamily: "Outfit,sans-serif" }}>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: "#8b72be",
                    fontFamily: "Outfit,sans-serif", letterSpacing: "0.04em"
                  }}>
                    {catData.length} categories
                  </span>
                </div>
              </div>
            </div>
        }
      </div>

      {/* ══ MONTH COMPARISON + BREAKDOWN ══ */}
      <div style={{ marginBottom: 0 }}>
        <div style={{ marginBottom: 16 }}>
          {/* ── MONTH COMPARISON ── */}
          <div className="panel" style={{ overflow: "visible", marginBottom: 0 }}>
            <div className="panel-header">
              <h3 className="panel-title">📅 Month Comparison</h3>
            </div>
            <div style={{ padding: "18px 20px" }}>
              {/* Pickers — single line: A [Month] [Year] vs B [Month] [Year] */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, overflow: "visible", flexWrap: "nowrap" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "6px 10px",
                  background: "#fffbeb", borderRadius: 10, border: "1.5px solid #fcd34d", overflow: "visible"
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 900, color: "#b45309", fontFamily: "Outfit,sans-serif",
                    background: "#fcd34d", padding: "2px 7px", borderRadius: 6, letterSpacing: "0.04em"
                  }}>A</span>
                  <MonthPicker value={cmpA.month} onChange={v => setCmpA(p => ({ ...p, month: Number(v) }))} />
                  <YearPicker value={cmpA.year} onChange={y => setCmpA(p => ({ ...p, year: y }))} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 900, color: "#c4b5fd", letterSpacing: "0.04em" }}>vs</span>
                <div style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "6px 10px",
                  background: "#f0f9ff", borderRadius: 10, border: "1.5px solid #7dd3fc", overflow: "visible"
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 900, color: "#0284c7", fontFamily: "Outfit,sans-serif",
                    background: "#7dd3fc", padding: "2px 7px", borderRadius: 6, letterSpacing: "0.04em"
                  }}>B</span>
                  <MonthPicker value={cmpB.month} onChange={v => setCmpB(p => ({ ...p, month: Number(v) }))} />
                  <YearPicker value={cmpB.year} onChange={y => setCmpB(p => ({ ...p, year: y }))} />
                </div>
              </div>

              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, marginBottom: 18, alignItems: "center" }}>
                <div style={{ background: "#fffbeb", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #fcd34d" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#d97706", letterSpacing: "0.06em", fontFamily: "Outfit,sans-serif", marginBottom: 4 }}>{labelA}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#1a0a3c", fontFamily: "Outfit,sans-serif", letterSpacing: "-0.04em" }}>{fmtAmt(dataA.total)}</div>
                  <div style={{ fontSize: 10, color: "#8b72be", marginTop: 3 }}>{dataA.count} transactions</div>
                </div>
                <div style={{ textAlign: "center", minWidth: 60 }}>
                  <div style={{ fontSize: 22, lineHeight: 1 }}>{diff === 0 ? "⟺" : isUp ? "↗" : "↙"}</div>
                  <div style={{ fontWeight: 900, fontSize: 12, fontFamily: "Outfit,sans-serif", color: diff === 0 ? "#8b72be" : isUp ? "#e11d48" : "#16a34a", marginTop: 3 }}>
                    {diff === 0 ? "Equal" : `${isUp ? "+" : ""}${fmtAmt(Math.abs(diff))}`}
                  </div>
                  {pctDiff && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, marginTop: 2, color: isUp ? "#0284c7" : "#16a34a",
                      background: isUp ? "#fff1f2" : "#f0fdf4", padding: "2px 6px", borderRadius: 20, display: "inline-block",
                      border: `1px solid ${isUp ? "#fda4af" : "#86efac"}`
                    }}>
                      {isUp ? "↑" : "↓"} {Math.abs(pctDiff)}%
                    </div>
                  )}
                </div>
                <div style={{ background: "#f0f9ff", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #7dd3fc" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#0284c7", letterSpacing: "0.06em", fontFamily: "Outfit,sans-serif", marginBottom: 4 }}>{labelB}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#1a0a3c", fontFamily: "Outfit,sans-serif", letterSpacing: "-0.04em" }}>{fmtAmt(dataB.total)}</div>
                  <div style={{ fontSize: 10, color: "#8b72be", marginTop: 3 }}>{dataB.count} transactions</div>
                </div>
              </div>

              {/* Grouped Bar chart for month comparison */}
              {allCatsEver.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={allCatsEver.map(cat => ({ cat, [labelA]: dataA.cats[cat] || 0, [labelB]: dataB.cats[cat] || 0 }))}
                    margin={{ top: 10, right: 16, left: 0, bottom: 0 }} barCategoryGap="28%">
                    <defs>
                      <linearGradient id="cmpGradA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0.65} />
                      </linearGradient>
                      <linearGradient id="cmpGradB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.65} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0eeff" vertical={false} />
                    <XAxis dataKey="cat" tick={{ fontSize: 11, fill: "#8b72be", fontFamily: "Outfit,sans-serif", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#b39ddb", fontFamily: "Outfit,sans-serif" }} axisLine={false} tickLine={false} tickFormatter={v => fmtAmt(v)} width={44} />
                    <Tooltip formatter={v => [fmtAmt(v)]}
                      contentStyle={{ borderRadius: 10, border: "1.5px solid #e4e0ff", fontSize: 12, fontFamily: "Outfit,sans-serif", boxShadow: "0 4px 16px rgba(124,58,237,0.12)" }}
                      cursor={{ fill: "rgba(124,58,237,0.05)" }} />
                    <Legend wrapperStyle={{ fontFamily: "Outfit,sans-serif", fontSize: 12, fontWeight: 700, paddingTop: 8 }} />
                    <Bar dataKey={labelA} name={labelA} fill="url(#cmpGradA)" radius={[5, 5, 0, 0]} maxBarSize={32} />
                    <Bar dataKey={labelB} name={labelB} fill="url(#cmpGradB)" radius={[5, 5, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#8b72be" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>No data for selected months</p>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* ── MONTH Category Breakdown ── */}
        {[...new Set([...Object.keys(dataA.cats), ...Object.keys(dataB.cats)])].length > 0 && (() => {
          const monthCats = [...new Set([...Object.keys(dataA.cats), ...Object.keys(dataB.cats)])];
          const Dash = ({ color }) => <span style={{ color, fontWeight: 700, fontSize: 13 }}>—</span>;
          const Delta = ({ d, p }) => d === 0
            ? <Dash color="#d4d0e8" />
            : <span style={{
              fontWeight: 800, fontSize: 11, whiteSpace: "nowrap",
              color: d > 0 ? "#e11d48" : "#16a34a",
              background: d > 0 ? "#fff1f2" : "#f0fdf4",
              padding: "3px 8px", borderRadius: 20,
              border: `1px solid ${d > 0 ? "#fda4af" : "#86efac"}`
            }}>
              {d > 0 ? "↑" : "↓"}{p ? ` ${Math.abs(p)}%` : ""} {fmtAmt(Math.abs(d))}
            </span>;
          return (
            <div className="panel" style={{ overflow: "hidden", marginBottom: 32 }}>
              <div className="panel-header">
                <h3 className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  📋 Category Breakdown
                  <span style={{ fontSize: 10, fontWeight: 800, background: "#fffbeb", color: "#d97706", padding: "3px 10px", borderRadius: 20, border: "1.5px solid #fcd34d", fontFamily: "Outfit,sans-serif" }}>📅 {labelA}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, background: "#f0f9ff", color: "#0284c7", padding: "3px 10px", borderRadius: 20, border: "1.5px solid #7dd3fc", fontFamily: "Outfit,sans-serif" }}>📅 {labelB}</span>
                </h3>
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "140px 1fr 1fr 1fr",
                background: "#faf9ff", borderBottom: "1.5px solid #e4e0ff"
              }}>
                {[
                  { label: "Category", bg: "transparent", color: "#8b72be", border: "none" },
                  { label: labelA, bg: "#fffbeb", color: "#d97706", border: "2px solid #fcd34d" },
                  { label: labelB, bg: "#fff1f2", color: "#e11d48", border: "none" },
                  { label: "Δ Change", bg: "#faf9ff", color: "#6b7280", border: "none" },
                ].map((h, i) => (
                  <div key={i} style={{
                    padding: "8px 12px", fontSize: 11, fontWeight: 800,
                    color: h.color, background: h.bg,
                    borderLeft: i > 0 ? h.border || "1px solid #e4e0ff" : "none",
                    textAlign: i > 0 ? "center" : "left", fontFamily: "Outfit,sans-serif",
                    letterSpacing: "0.05em", textTransform: "uppercase"
                  }}>
                    {h.label}
                  </div>
                ))}
              </div>
              <div>
                {monthCats.map((cat, ri) => {
                  const ma = dataA.cats[cat] || 0;
                  const mb = dataB.cats[cat] || 0;
                  const md = mb - ma;
                  const mp = ma > 0 ? ((md / ma) * 100).toFixed(0) : null;
                  return (
                    <div key={cat} style={{
                      display: "grid", gridTemplateColumns: "140px 1fr 1fr 1fr",
                      borderBottom: "1px solid #f0eeff",
                      background: ri % 2 === 0 ? "#fff" : "#fdfcff", transition: "background 0.12s"
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "#eef2ff"}
                      onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? "#fff" : "#fdfcff"}>
                      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center" }}>
                        <span className={`badge ${BADGE[cat] || "badge-other"}`}>{cat}</span>
                      </div>
                      <div style={{
                        padding: "12px 12px", display: "flex", alignItems: "center", justifyContent: "center",
                        background: ma > 0 ? "#eef2ff" : "transparent", borderLeft: "2px solid #a5b4fc"
                      }}>
                        {ma > 0 ? <span style={{ fontWeight: 800, color: "#4f46e5", fontSize: 13 }}>{fmtAmt(ma)}</span> : <Dash color="#a5b4fc" />}
                      </div>
                      <div style={{
                        padding: "12px 12px", display: "flex", alignItems: "center", justifyContent: "center",
                        background: mb > 0 ? "#fff1f2" : "transparent", borderLeft: "1px solid #f0eeff"
                      }}>
                        {mb > 0 ? <span style={{ fontWeight: 800, color: "#e11d48", fontSize: 13 }}>{fmtAmt(mb)}</span> : <Dash color="#fda4af" />}
                      </div>
                      <div style={{
                        padding: "12px 8px", display: "flex", alignItems: "center", justifyContent: "center",
                        borderLeft: "1px solid #f0eeff"
                      }}>
                        <Delta d={md} p={mp} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ══ YEAR COMPARISON + BREAKDOWN ══ */}
      <div style={{ marginBottom: 0 }}>
        <div style={{ marginBottom: 16 }}>
          {/* ── YEAR COMPARISON ── */}
          <div className="panel" style={{ overflow: "visible", marginBottom: 0 }}>
            <div className="panel-header">
              <h3 className="panel-title">📆 Year Comparison</h3>
            </div>
            <div style={{ padding: "18px 20px" }}>
              {/* Pickers */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap", overflow: "visible" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
                  background: "#ecfdf5", borderRadius: 12, border: "1.5px solid #6ee7b7", overflow: "visible"
                }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#059669", fontFamily: "Outfit,sans-serif" }}>A</span>
                  <YearPicker value={yrA} onChange={y => setYrA(y)} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 900, color: "#86efac" }}>vs</span>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
                  background: "#fdf2f8", borderRadius: 12, border: "1.5px solid #f9a8d4", overflow: "visible"
                }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#be185d", fontFamily: "Outfit,sans-serif" }}>B</span>
                  <YearPicker value={yrB} onChange={y => setYrB(y)} />
                </div>
              </div>

              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, marginBottom: 20, alignItems: "center" }}>
                <div style={{ background: "#ecfdf5", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #6ee7b7" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#059669", letterSpacing: "0.06em", fontFamily: "Outfit,sans-serif", marginBottom: 4 }}>{yrA}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#1a0a3c", fontFamily: "Outfit,sans-serif", letterSpacing: "-0.04em" }}>{fmtAmt(yrDataA.total)}</div>
                  <div style={{ fontSize: 10, color: "#8b72be", marginTop: 3 }}>{yrDataA.count} transactions</div>
                </div>
                <div style={{ textAlign: "center", minWidth: 60 }}>
                  <div style={{ fontSize: 22, lineHeight: 1 }}>{yrDiff === 0 ? "⟺" : yrIsUp ? "↗" : "↙"}</div>
                  <div style={{ fontWeight: 900, fontSize: 12, fontFamily: "Outfit,sans-serif", color: yrDiff === 0 ? "#8b72be" : yrIsUp ? "#e11d48" : "#16a34a", marginTop: 3 }}>
                    {yrDiff === 0 ? "Equal" : `${yrIsUp ? "+" : ""}${fmtAmt(Math.abs(yrDiff))}`}
                  </div>
                  {yrPct && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, marginTop: 2, color: yrIsUp ? "#e11d48" : "#16a34a",
                      background: yrIsUp ? "#fff1f2" : "#f0fdf4", padding: "2px 6px", borderRadius: 20, display: "inline-block",
                      border: `1px solid ${yrIsUp ? "#fda4af" : "#86efac"}`
                    }}>
                      {yrIsUp ? "↑" : "↓"} {Math.abs(yrPct)}%
                    </div>
                  )}
                </div>
                <div style={{ background: "#fdf2f8", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #f9a8d4" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#be185d", letterSpacing: "0.06em", fontFamily: "Outfit,sans-serif", marginBottom: 4 }}>{yrB}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#1a0a3c", fontFamily: "Outfit,sans-serif", letterSpacing: "-0.04em" }}>{fmtAmt(yrDataB.total)}</div>
                  <div style={{ fontSize: 10, color: "#8b72be", marginTop: 3 }}>{yrDataB.count} transactions</div>
                </div>
              </div>

              {/* Area Timeline — month-by-month for both years */}
              {(yrDataA.total > 0 || yrDataB.total > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={yrBarData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradYrA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="gradYrB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e0ff" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8b72be", fontFamily: "Outfit,sans-serif" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#b39ddb", fontFamily: "Outfit,sans-serif" }} axisLine={false} tickLine={false}
                      tickFormatter={v => v > 0 ? `₹${Math.round(v / 1000)}k` : ""} width={42} />
                    <Tooltip formatter={v => [fmtAmt(v)]}
                      contentStyle={{ borderRadius: 10, border: "1.5px solid #e4e0ff", fontSize: 12, fontFamily: "Outfit,sans-serif", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} />
                    <Legend wrapperStyle={{ fontFamily: "Outfit,sans-serif", fontSize: 12, fontWeight: 700, paddingTop: 8 }} />
                    <Area type="monotone" dataKey={String(yrA)} stroke="#10b981" strokeWidth={2.5} fill="url(#gradYrA)"
                      dot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 1.5 }} activeDot={{ r: 6, fill: "#34d399" }} />
                    <Area type="monotone" dataKey={String(yrB)} stroke="#ec4899" strokeWidth={2.5} fill="url(#gradYrB)"
                      dot={{ r: 4, fill: "#ec4899", stroke: "#fff", strokeWidth: 1.5 }} activeDot={{ r: 6, fill: "#f43f5e" }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#8b72be" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>No data for selected years</p>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* ── YEAR Category Breakdown ── */}
        {[...new Set([...Object.keys(yrDataA.cats), ...Object.keys(yrDataB.cats)])].length > 0 && (() => {
          const yearCats = [...new Set([...Object.keys(yrDataA.cats), ...Object.keys(yrDataB.cats)])];
          const Dash = ({ color }) => <span style={{ color, fontWeight: 700, fontSize: 13 }}>—</span>;
          const Delta = ({ d, p }) => d === 0
            ? <Dash color="#d4d0e8" />
            : <span style={{
              fontWeight: 800, fontSize: 11, whiteSpace: "nowrap",
              color: d > 0 ? "#e11d48" : "#16a34a",
              background: d > 0 ? "#fff1f2" : "#f0fdf4",
              padding: "3px 8px", borderRadius: 20,
              border: `1px solid ${d > 0 ? "#fda4af" : "#86efac"}`
            }}>
              {d > 0 ? "↑" : "↓"}{p ? ` ${Math.abs(p)}%` : ""} {fmtAmt(Math.abs(d))}
            </span>;
          return (
            <div className="panel" style={{ overflow: "hidden", marginBottom: 24 }}>
              <div className="panel-header">
                <h3 className="panel-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  📋 Category Breakdown
                  <span style={{ fontSize: 10, fontWeight: 800, background: "#ecfdf5", color: "#059669", padding: "3px 10px", borderRadius: 20, border: "1.5px solid #6ee7b7", fontFamily: "Outfit,sans-serif" }}>📆 {yrA}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, background: "#fdf2f8", color: "#be185d", padding: "3px 10px", borderRadius: 20, border: "1.5px solid #f9a8d4", fontFamily: "Outfit,sans-serif" }}>📆 {yrB}</span>
                </h3>
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "140px 1fr 1fr 1fr",
                background: "#faf9ff", borderBottom: "1.5px solid #e4e0ff"
              }}>
                {[
                  { label: "Category", bg: "transparent", color: "#8b72be", border: "none" },
                  { label: String(yrA), bg: "#ecfdf5", color: "#059669", border: "2px solid #6ee7b7" },
                  { label: String(yrB), bg: "#fdf2f8", color: "#be185d", border: "none" },
                  { label: "Δ Change", bg: "#faf9ff", color: "#6b7280", border: "none" },
                ].map((h, i) => (
                  <div key={i} style={{
                    padding: "8px 12px", fontSize: 11, fontWeight: 800,
                    color: h.color, background: h.bg,
                    borderLeft: i > 0 ? h.border || "1px solid #e4e0ff" : "none",
                    textAlign: i > 0 ? "center" : "left", fontFamily: "Outfit,sans-serif",
                    letterSpacing: "0.05em", textTransform: "uppercase"
                  }}>
                    {h.label}
                  </div>
                ))}
              </div>
              <div>
                {yearCats.map((cat, ri) => {
                  const ya = yrDataA.cats[cat] || 0;
                  const yb = yrDataB.cats[cat] || 0;
                  const yd = yb - ya;
                  const yp = ya > 0 ? ((yd / ya) * 100).toFixed(0) : null;
                  return (
                    <div key={cat} style={{
                      display: "grid", gridTemplateColumns: "140px 1fr 1fr 1fr",
                      borderBottom: "1px solid #f0eeff",
                      background: ri % 2 === 0 ? "#fff" : "#fdfcff", transition: "background 0.12s"
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "#ecfdf5"}
                      onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? "#fff" : "#fdfcff"}>
                      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center" }}>
                        <span className={`badge ${BADGE[cat] || "badge-other"}`}>{cat}</span>
                      </div>
                      <div style={{
                        padding: "12px 12px", display: "flex", alignItems: "center", justifyContent: "center",
                        background: ya > 0 ? "#ecfdf5" : "transparent", borderLeft: "2px solid #6ee7b7"
                      }}>
                        {ya > 0 ? <span style={{ fontWeight: 800, color: "#059669", fontSize: 13 }}>{fmtAmt(ya)}</span> : <Dash color="#6ee7b7" />}
                      </div>
                      <div style={{
                        padding: "12px 12px", display: "flex", alignItems: "center", justifyContent: "center",
                        background: yb > 0 ? "#fdf2f8" : "transparent", borderLeft: "1px solid #f0eeff"
                      }}>
                        {yb > 0 ? <span style={{ fontWeight: 800, color: "#be185d", fontSize: 13 }}>{fmtAmt(yb)}</span> : <Dash color="#f9a8d4" />}
                      </div>
                      <div style={{
                        padding: "12px 8px", display: "flex", alignItems: "center", justifyContent: "center",
                        borderLeft: "1px solid #f0eeff"
                      }}>
                        <Delta d={yd} p={yp} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════
   PROFILE TAB
══════════════════════════════════════════════ */
function ProfileTab({ userName, setUserName, onLogout }) {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const saveName = () => {
    if (tempName.trim()) setUserName(tempName.trim());
    setEditingName(false);
  };

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Profile Card */}
      <div className="panel">
        <div className="panel-header"><h3 className="panel-title">👤 My Profile</h3></div>
        <div style={{ padding: "28px 24px" }}>
          {/* Avatar + Name */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, paddingBottom: 24, borderBottom: "1.5px solid #f0eeff" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30,
              color: "#fff", fontWeight: 900, fontFamily: "Outfit,sans-serif",
              boxShadow: "0 0 24px rgba(124,58,237,0.40)", flexShrink: 0
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              {editingName ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    autoFocus
                    className="form-control"
                    style={{ fontSize: 15, padding: "8px 12px" }}
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveName}
                      style={{
                        flex: 1, padding: "8px", borderRadius: 8, border: "none",
                        background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff",
                        fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "Outfit,sans-serif"
                      }}>
                      ✅ Save
                    </button>
                    <button onClick={() => setEditingName(false)}
                      style={{
                        flex: 1, padding: "8px", borderRadius: 8, border: "1.5px solid #e4e0ff",
                        background: "#fff", color: "#5a3f8a", fontWeight: 600, fontSize: 13, cursor: "pointer"
                      }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#1a0a3c", fontFamily: "Outfit,sans-serif", letterSpacing: "-0.03em" }}>{userName}</div>
                  <div style={{ fontSize: 13, color: "#8b72be", marginTop: 3 }}>Personal Account</div>
                  <button onClick={() => { setTempName(userName); setEditingName(true); }}
                    style={{
                      marginTop: 8, padding: "5px 14px", borderRadius: 8, border: "1.5px solid #ddd6fe",
                      background: "#f5f0ff", color: "#7c3aed", fontWeight: 700, fontSize: 12,
                      cursor: "pointer", fontFamily: "Outfit,sans-serif"
                    }}>
                    ✏️ Edit Name
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Info rows */}
          {[
            { icon: "🗂️", label: "Account Type", val: "Personal" },
            { icon: "📅", label: "Member Since", val: "2024" },
            { icon: "💸", label: "App", val: "SpendWise" },
          ].map(({ icon, label, val }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "13px 0", borderBottom: "1px solid #f0eeff"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#5a3f8a", fontFamily: "Outfit,sans-serif" }}>{label}</span>
              </div>
              <span style={{
                fontSize: 13, color: "#7c3aed", fontWeight: 700, background: "#ede9fe",
                padding: "4px 12px", borderRadius: 20, border: "1px solid #c4b5fd"
              }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><h3 className="panel-title">🔐 Account Actions</h3></div>
        <div style={{ padding: "20px 24px" }}>
          <button
            onClick={onLogout}
            style={{
              width: "100%", padding: "13px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#e11d48,#f97316)", color: "#fff",
              fontFamily: "Outfit,sans-serif", fontSize: 15, fontWeight: 800,
              cursor: "pointer", letterSpacing: "0.01em",
              boxShadow: "0 4px 18px rgba(225,29,72,0.30)", transition: "all 0.2s ease"
            }}
            onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
            onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
          >
            🚪 Logout
          </button>
          <p style={{ textAlign: "center", fontSize: 12, color: "#b39ddb", marginTop: 10 }}>
            You will be returned to the login screen.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SETTINGS TAB
══════════════════════════════════════════════ */
function SettingsTab({ onLogout }) {
  return (
    <div style={{ maxWidth: 560 }}>
      {/* App Settings */}
      <div className="panel">
        <div className="panel-header"><h3 className="panel-title">⚙️ App Settings</h3></div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "App Name", val: "SpendWise", icon: "💸" },
            { label: "Currency", val: "INR (₹)", icon: "💰" },
            { label: "Backend API", val: "localhost:8081", icon: "🔌" },
          ].map(({ label, val, icon }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: "#faf9ff", borderRadius: 10, border: "1.5px solid #e4e0ff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "#2d1b5e", fontFamily: "Outfit,sans-serif" }}>{label}</span>
              </div>
              <span style={{ fontSize: 13, color: "#7c3aed", fontWeight: 700, background: "#ede9fe", padding: "4px 12px", borderRadius: 20, border: "1px solid #c4b5fd" }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><h3 className="panel-title">🔐 Account</h3></div>
        <div style={{ padding: "20px 24px" }}>
          <button
            onClick={onLogout}
            style={{
              width: "100%", padding: "13px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #e11d48, #f97316)",
              color: "#fff", fontFamily: "Outfit,sans-serif", fontSize: 15,
              fontWeight: 800, cursor: "pointer", letterSpacing: "0.01em",
              boxShadow: "0 4px 18px rgba(225,29,72,0.30)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
            onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
          >
            🚪 Logout
          </button>
          <p style={{ textAlign: "center", fontSize: 12, color: "#b39ddb", marginTop: 10 }}>
            You will be returned to the login screen.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SPLITZO — DASHBOARD TAB
══════════════════════════════════════════════ */
function ActivityRow({ exp, iDidPay, share, settled, paidCount, pendingCount, dateStr, isLast, userName }) {
  const [open, setOpen] = useState(false);
  const SP_C = ["#7c3aed","#ec4899","#06b6d4","#f97316","#16a34a","#f59e0b","#3b82f6"];
  const Av = ({ name, size=22 }) => {
    const c = SP_C[name.charCodeAt(0) % SP_C.length];
    return <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0, background:`${c}22`, border:`1.5px solid ${c}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.38, fontWeight:900, color:c, fontFamily:"Outfit,sans-serif" }}>{name[0].toUpperCase()}</div>;
  };
  const paidMembers    = (exp.members||[]).filter(m => settled.includes(m));
  const pendingMembers = (exp.members||[]).filter(m => !settled.includes(m));
  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid #f0eeff" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 20px" }}>
        <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#ede9fe,#ddd6fe)", border:"1.5px solid #c4b5fd", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>💸</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:14, color:"#1a0a3c", fontFamily:"Outfit,sans-serif" }}>{exp.description}</div>
          <div style={{ fontSize:12, color:"#8b72be", marginTop:2 }}>
            Paid by <span style={{ fontWeight:800, color:"#7c3aed" }}>{iDidPay ? "you" : exp.paidBy}</span>
            {" · "}<span style={{ color:"#a78bfa" }}>{exp.groupEmoji} {exp.groupName}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:"#8b72be", fontWeight:700 }}>Split {exp.members?.length||1} ways · ₹{share}/person</span>
            <span style={{ fontSize:11, fontWeight:800, padding:"2px 9px", borderRadius:20, background:"#f0fdf4", border:"1.5px solid #86efac", color:"#16a34a" }}>✓ {paidCount} paid</span>
            {pendingCount > 0 && <span style={{ fontSize:11, fontWeight:800, padding:"2px 9px", borderRadius:20, background:"#fff7f0", border:"1.5px solid #fed7aa", color:"#ea580c" }}>⏳ {pendingCount} pending</span>}
            <button onClick={() => setOpen(o => !o)} style={{ fontSize:11, fontWeight:700, color:"#7c3aed", background:"#f5f0ff", border:"1.5px solid #c4b5fd", borderRadius:20, padding:"2px 10px", cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
              {open ? "Hide ▲" : "View all ▼"}
            </button>
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:16, fontWeight:900, color:"#7c3aed", fontFamily:"Outfit,sans-serif" }}>{fmtAmt(Number(exp.amount))}</div>
          {dateStr && <div style={{ fontSize:11, color:"#8b72be", marginTop:2 }}>{dateStr}</div>}
        </div>
      </div>
      {open && (
        <div style={{ margin:"0 20px 14px", background:"#faf9ff", border:"1.5px solid #e4e0ff", borderRadius:12, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
            <div style={{ padding:"10px 14px", borderRight:"1px solid #e4e0ff" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#16a34a", marginBottom:8, letterSpacing:"0.04em" }}>✓ PAID ({paidMembers.length})</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {paidMembers.map(m => (
                  <div key={m} style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <Av name={m} size={22}/>
                    <span style={{ fontSize:12, fontWeight:700, color:"#1a0a3c", flex:1 }}>{m === userName ? "you" : m}</span>
                    <span style={{ fontSize:11, color:"#16a34a", fontWeight:700 }}>₹{share}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding:"10px 14px" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#ea580c", marginBottom:8, letterSpacing:"0.04em" }}>⏳ PENDING ({pendingMembers.length})</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {pendingMembers.length === 0
                  ? <div style={{ fontSize:12, color:"#16a34a", fontWeight:700 }}>All settled! 🎉</div>
                  : pendingMembers.map(m => (
                    <div key={m} style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <Av name={m} size={22}/>
                      <span style={{ fontSize:12, fontWeight:700, color:"#1a0a3c", flex:1 }}>{m === userName ? "you" : m}</span>
                      <span style={{ fontSize:11, color:"#ea580c", fontWeight:700 }}>₹{share}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SplitzoDashboard({ userName, setActiveTab }) {
  const [balances, setBalances]   = useState([]);
  const [groups, setGroups]       = useState([]);
  const [friends, setFriends]     = useState([]);
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [totalSplits, setTotalSplits]     = useState(0);
  const [myShareTotal, setMyShareTotal]   = useState(0);
  const [splitsPaid, setSplitsPaid]       = useState(0);
  const [pendingSplits, setPendingSplits] = useState(0);
  const now = new Date();
  const [bsMonth, setBsMonth]       = useState(now.getMonth() + 1);
  const [bsYear,  setBsYear]        = useState(now.getFullYear());
  const [bsBalances, setBsBalances] = useState({ owedToMe: 0, iOwe: 0 });
  const [bsLoading, setBsLoading]   = useState(false);
  const [allExpenses, setAllExpenses] = useState([]);
  const [dashTab, setDashTab] = useState("overview");

  useEffect(() => {
    const load = async () => {
      try {
        const [bRes, gRes, fRes, rRes] = await Promise.all([
          axios.get(`${SPLIT_URL}/balances`),
          axios.get(`${SPLIT_URL}/groups`),
          axios.get(`${SPLIT_URL}/friends`),
          axios.get(`${SPLIT_URL}/friends/requests`),
        ]);
        const grps = gRes.data;
        setBalances(bRes.data);
        setGroups(grps);
        setFriends(fRes.data);
        setRequests(rRes.data);

        const expenseArrays = await Promise.all(
          grps.map(g => Promise.all([
            axios.get(`${SPLIT_URL}/groups/${g.id}/expenses`).then(r => r.data).catch(() => []),
            axios.get(`${SPLIT_URL}/balances/settlements/${g.id}`).then(r => r.data).catch(() => []),
          ]).then(([expenses, settlements]) => ({ expenses, settlements, members: g.members || [] })))
        );

        let splits=0, myShare=0, paid=0, pending=0;
        const allExps = [];
        expenseArrays.forEach(({ expenses, settlements, members }, gi) => {
          const mc = members.length || 1;
          const g  = grps[gi];
          const approvedByExp = {};
          settlements.filter(s => s.status === "APPROVED").forEach(s => {
            if (!approvedByExp[s.expenseId]) approvedByExp[s.expenseId] = new Set();
            approvedByExp[s.expenseId].add(s.fromUsername);
          });
          expenses.forEach(exp => {
            splits++;
            const share = Number(exp.amount) / mc;
            myShare += share;
            if (exp.paidBy === userName) paid++;
            else pending++;
            const settledBy = [...new Set([exp.paidBy, ...(approvedByExp[exp.id] || [])])];
            allExps.push({ ...exp, members, groupName:g?.name||"", groupEmoji:g?.emoji||"🏘️", groupId:g?.id, settledBy });
          });
        });
        allExps.sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
        setAllExpenses(allExps);
        setTotalSplits(splits); setMyShareTotal(myShare); setSplitsPaid(paid); setPendingSplits(pending);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    const fetchBsBalances = async () => {
      setBsLoading(true);
      try {
        const r = await axios.get(`${SPLIT_URL}/balances/summary?month=${bsMonth}&year=${bsYear}`);
        setBsBalances(r.data);
      } catch (e) { console.error(e); }
      finally { setBsLoading(false); }
    };
    fetchBsBalances();
  }, [bsMonth, bsYear]);

  const respondRequest = async (id, action) => {
    try {
      await axios.post(`${SPLIT_URL}/friends/request/${id}/${action}`);
      setRequests(prev => prev.filter(r => r.id !== id));
      if (action === "accept") { const fRes = await axios.get(`${SPLIT_URL}/friends`); setFriends(fRes.data); }
    } catch (e) { console.error(e); }
  };

  const SP_COL = ["#7c3aed","#ec4899","#06b6d4","#f97316","#16a34a","#f59e0b","#3b82f6"];
  const Av = ({ name, size=38 }) => {
    const c = SP_COL[name.charCodeAt(0) % SP_COL.length];
    return <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0, background:`linear-gradient(135deg,${c}22,${c}55)`, border:`1.5px solid ${c}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.4, fontWeight:900, color:c, fontFamily:"Outfit,sans-serif" }}>{name[0].toUpperCase()}</div>;
  };

  const iOwe      = balances.filter(b => b.from === userName && b.amount > 0);
  const owedMe    = balances.filter(b => b.to   === userName && b.amount > 0);
  const totalOwe  = iOwe.reduce((s,b)  => s + Number(b.amount), 0);
  const totalOwed = owedMe.reduce((s,b) => s + Number(b.amount), 0);
  const bsArr     = Array.isArray(bsBalances) ? bsBalances : [];
  const bsIOwe    = bsArr.filter(b => b.from === userName && b.amount > 0);
  const bsOwedMe  = bsArr.filter(b => b.to   === userName && b.amount > 0);
  const bsOwe     = bsBalances?.iOwe    ? Number(bsBalances.iOwe)    : 0;
  const bsOwd     = bsBalances?.owedToMe ? Number(bsBalances.owedToMe) : 0;
  const bsNet     = bsOwd - bsOwe;
  const bsEmpty   = bsOwe + bsOwd === 0;
  const bsDonut   = bsEmpty ? [{name:"e",value:1}] : [{name:"Owed to You",value:bsOwd},{name:"You Owe",value:bsOwe}];

  const SmallCard = ({ icon, label, value, meta, from, to, big }) => (
    <div style={{
      background: `linear-gradient(135deg,${from},${to})`,
      borderRadius: big ? 18 : 16,
      padding: big ? "20px 22px" : "14px 16px",
      display: "flex", flexDirection: big ? "row" : "column",
      alignItems: big ? "center" : "flex-start",
      gap: big ? 16 : 6,
      boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
    }}>
      <div style={{ width: big?48:36, height: big?48:36, borderRadius: big?14:10, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: big?24:18, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Outfit,sans-serif", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: big?28:22, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, fontFamily: "Outfit,sans-serif" }}>{value}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 3, fontFamily: "Outfit,sans-serif", fontWeight: 600 }}>{meta}</div>
      </div>
    </div>
  );

  if (loading) return null;

  return (
    <div>
      {/* TABBED TOP SECTION */}
      <div className="panel" style={{ marginBottom:20 }}>
        <div style={{ display:"flex", borderBottom:"1.5px solid #e4e0ff", background:"#faf9ff" }}>
          {[
            { id:"overview", label:"📊 Overview" },
            { id:"balance",  label:"💰 Balance Snapshot" },
            { id:"activity", label:"📅 Split Activity" },
          ].map(t => (
            <button key={t.id} onClick={() => setDashTab(t.id)} style={{
              flex:1, padding:"14px 8px", border:"none",
              borderBottom:`2.5px solid ${dashTab===t.id?"#7c3aed":"transparent"}`,
              background: dashTab===t.id?"#fff":"transparent",
              color: dashTab===t.id?"#7c3aed":"#8b72be",
              fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif",
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ padding:"20px" }}>
          {dashTab === "overview" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
              <SmallCard icon="👥" label="Total Groups"    value={groups.length}  meta="you're part of" from="#6d28d9" to="#8b5cf6"/>
              <SmallCard icon="🔀" label="Total Splits"    value={totalSplits}    meta="all groups"     from="#be123c" to="#fb7185"/>
              <SmallCard icon="✅" label="Splits You Paid" value={splitsPaid}     meta="you covered"    from="#0369a1" to="#38bdf8"/>
              <SmallCard icon="⏳" label="Pending Splits"  value={pendingSplits}  meta="you owe"        from="#b45309" to="#f59e0b"/>
            </div>
          )}
          {dashTab === "balance" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <SmallCard big icon="💰" label="Total Group Spend" value={fmtAmt(allExpenses.reduce((s,e)=>s+Number(e.amount),0))} meta={`${allExpenses.length} expenses`} from="#3730a3" to="#818cf8"/>
              <SmallCard big icon="📥" label="Owed to You"       value={fmtAmt(owedMe.reduce((s,b)=>s+Number(b.amount),0))}     meta="others owe you"                   from="#065f46" to="#6ee7b7"/>
              <SmallCard big icon="📤" label="You Owe"           value={fmtAmt(iOwe.reduce((s,b)=>s+Number(b.amount),0))}       meta="your pending dues"                from="#9a3412" to="#fdba74"/>
            </div>
          )}
          {dashTab === "activity" && (() => {
            const mnFull    = new Date(bsYear, bsMonth-1, 1).toLocaleString("default",{month:"long"});
            const yrExps    = allExpenses.filter(e => new Date(e.createdAt||0).getFullYear() === bsYear);
            const mnExps    = allExpenses.filter(e => { const d=new Date(e.createdAt||0); return d.getFullYear()===bsYear && d.getMonth()+1===bsMonth; });
            const yrMyShare = yrExps.reduce((s,e) => s + Number(e.amount)/(e.members?.length||1), 0);
            const mnPaid    = mnExps.filter(e => e.paidBy === userName).length;
            const mnPending = mnExps.filter(e => { const mc=e.members?.length||1; return (e.settledBy||[e.paidBy]).length < mc; }).length;
            return (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
                  <SmallCard icon="💰" label={`${bsYear} Splits`}     value={yrExps.length}    meta={fmtAmt(yrExps.reduce((s,e)=>s+Number(e.amount),0))} from="#a21caf" to="#e879f9"/>
                  <SmallCard icon="🙋" label={`${bsYear} Your Share`} value={fmtAmt(yrMyShare)} meta="your portion"                                        from="#1d4ed8" to="#60a5fa"/>
                  <SmallCard icon="🗂️" label={`${mnFull} Splits`}    value={mnExps.length}    meta={fmtAmt(mnExps.reduce((s,e)=>s+Number(e.amount),0))}  from="#065f46" to="#34d399"/>
                  <SmallCard icon="✅" label={`${mnFull} Paid`}       value={mnPaid}           meta="you covered"                                          from="#92400e" to="#fbbf24"/>
                  <SmallCard icon="⏳" label={`${mnFull} Pending`}    value={mnPending}        meta="unsettled"                                            from="#9f1239" to="#f43f5e"/>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* BALANCE SPLIT — only when activity tab active */}
      {dashTab === "activity" && (
        <div className="panel" style={{ marginBottom:20 }}>
          <div className="panel-header">
            <h3 className="panel-title">⚖️ Balance Split</h3>
            <div style={{ display:"flex", gap:8 }}>
              <MonthPicker value={bsMonth} onChange={v => setBsMonth(Number(v))}/>
              <YearPicker  value={bsYear}  onChange={y => setBsYear(y)}/>
            </div>
          </div>
          <div style={{ padding:"24px 28px", display:"flex", alignItems:"center", gap:40, position:"relative" }}>
            {bsLoading && <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:12, zIndex:10, fontSize:13, fontWeight:700, color:"#8b72be", fontFamily:"Outfit,sans-serif" }}>⏳ Loading…</div>}
            <div style={{ position:"relative", width:200, height:200, flexShrink:0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bsDonut} dataKey="value" cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={bsEmpty?0:5} startAngle={90} endAngle={-270}>
                    {bsEmpty ? <Cell fill="#e4e0ff" strokeWidth={0}/> : bsDonut.map((_,i) => <Cell key={i} fill={["#16a34a","#f97316"][i]} strokeWidth={0}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center", pointerEvents:"none" }}>
                <div style={{ fontSize:13, fontWeight:900, color:"#16a34a", fontFamily:"Outfit,sans-serif" }}>↑ {fmtAmt(bsOwd)}</div>
                <div style={{ width:28, height:1.5, background:"#e4e0ff", margin:"5px auto" }}/>
                <div style={{ fontSize:13, fontWeight:900, color:"#f97316", fontFamily:"Outfit,sans-serif" }}>↓ {fmtAmt(bsOwe)}</div>
              </div>
            </div>
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:0 }}>
              {[
                { dot:"#16a34a", label:"Owed to You", sub:"people owe you",  val:fmtAmt(bsOwd), color:"#16a34a" },
                { dot:"#f97316", label:"You Owe",     sub:"you owe others",  val:fmtAmt(bsOwe), color:"#f97316" },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 0", borderBottom:i<arr.length-1?"1px solid #f0eeff":"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:11, height:11, borderRadius:"50%", background:row.dot, flexShrink:0 }}/>
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, color:"#1a0a3c", fontFamily:"Outfit,sans-serif" }}>{row.label}</div>
                      <div style={{ fontSize:12, color:"#8b72be", marginTop:1, fontFamily:"Outfit,sans-serif" }}>{row.sub}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:20, fontWeight:900, color:row.color, fontFamily:"Outfit,sans-serif", letterSpacing:"-0.02em" }}>{row.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FRIEND REQUESTS — above group activity */}
      {requests.length > 0 && (
        <div className="panel" style={{ marginBottom:16 }}>
          <div className="panel-header"><h3 className="panel-title">{`📨 Friend Requests · ${requests.length}`}</h3></div>
          <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            {requests.map(r => (
              <div key={r.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"linear-gradient(135deg,#fffbeb,#fef9c3)", borderRadius:12, border:"1.5px solid #fde68a" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}><Av name={r.fromUsername} size={40}/><div><div style={{ fontWeight:800, color:"#1a0a3c", fontFamily:"Outfit,sans-serif", fontSize:14 }}>{r.fromUsername}</div><div style={{ fontSize:11, color:"#92400e" }}>wants to be friends</div></div></div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => respondRequest(r.id,"accept")} style={{ padding:"6px 14px", borderRadius:8, border:"none", background:"#16a34a", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>✓ Accept</button>
                  <button onClick={() => respondRequest(r.id,"reject")} style={{ padding:"6px 12px", borderRadius:8, border:"1.5px solid #fda4af", background:"#fff1f2", color:"#e11d48", fontWeight:700, fontSize:12, cursor:"pointer" }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GROUP ACTIVITY FEED */}
      <div className="panel" style={{ marginBottom:16 }}>
        <div className="panel-header">
          <h3 className="panel-title">💸 Group Activity</h3>
          <button onClick={() => setActiveTab("Groups")} style={{ fontSize:12, fontWeight:700, color:"#7c3aed", background:"none", border:"none", cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>View all →</button>
        </div>
        {allExpenses.length === 0
          ? <div style={{ textAlign:"center", padding:"28px 0", color:"#8b72be", fontSize:13 }}>No group activity yet</div>
          : <div>
              {allExpenses.slice(0,8).map((exp, i, arr) => {
                const iDidPay      = exp.paidBy === userName;
                const mc           = exp.members?.length || 1;
                const share        = Math.round(Number(exp.amount) / mc);
                const settled      = exp.settledBy || [exp.paidBy];
                const paidCount    = settled.length;
                const pendingCount = mc - paidCount;
                const dateStr      = exp.createdAt ? new Date(exp.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) : "";
                return (
                  <ActivityRow key={exp.id} exp={exp} iDidPay={iDidPay} share={share}
                    settled={settled} paidCount={paidCount} pendingCount={pendingCount}
                    dateStr={dateStr} isLast={i===arr.length-1} userName={userName}/>
                );
              })}
            </div>
        }
      </div>

      {/* BOTTOM ROW */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div className="panel">
          <div className="panel-header"><h3 className="panel-title">🏘️ Active Groups</h3><button onClick={() => setActiveTab("Groups")} style={{ fontSize:12, fontWeight:700, color:"#7c3aed", background:"none", border:"none", cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>View all →</button></div>
          <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            {groups.filter(g => g.active !== false).length === 0
              ? <div style={{ textAlign:"center", padding:"20px 0", color:"#8b72be", fontSize:13 }}>No active groups yet</div>
              : groups.filter(g => g.active !== false).map(g => (
                <div key={g.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 13px", background:"#faf9ff", borderRadius:12, border:"1.5px solid #e4e0ff", cursor:"pointer", transition:"all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background="#f5f0ff"; e.currentTarget.style.borderColor="#c4b5fd"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="#faf9ff"; e.currentTarget.style.borderColor="#e4e0ff"; }}>
                  <div style={{ width:40, height:40, borderRadius:11, background:"linear-gradient(135deg,#f5f0ff,#e9d5ff)", border:"1.5px solid #ddd6fe", display:"flex", alignItems:"center", justifyContent:"center", fontSize:21, flexShrink:0 }}>{g.emoji||"🏘️"}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:13, color:"#1a0a3c", fontFamily:"Outfit,sans-serif", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{g.name}</div>
                    <div style={{ fontSize:11, color:"#8b72be", marginTop:2 }}>{(g.members||[]).length} members</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                    <div style={{ display:"flex" }}>{(g.members||[]).slice(0,3).map((m,j) => <div key={m} style={{ width:24, height:24, borderRadius:"50%", background:`linear-gradient(135deg,${SP_COL[j%7]}44,${SP_COL[j%7]}88)`, border:"2px solid #fff", marginLeft:j>0?-7:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:SP_COL[j%7] }}>{m[0].toUpperCase()}</div>)}</div>
                    <span style={{ fontSize:10, fontWeight:800, padding:"3px 8px", borderRadius:20, background:"linear-gradient(135deg,#f5f0ff,#e9d5ff)", color:"#7c3aed", border:"1.5px solid #ddd6fe", fontFamily:"Outfit,sans-serif" }}>{g.inviteCode}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><h3 className="panel-title">⚡ Quick Stats</h3></div>
          <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            {[
              { icon:"📈", label:"Largest Split",     value: allExpenses.length ? fmtAmt(Math.max(...allExpenses.map(e=>Number(e.amount)))) : "—",  sub:"single expense",   color:"#7c3aed", bg:"#f5f0ff", bd:"#a855f7" },
              { icon:"📊", label:"Avg Split Size",    value: allExpenses.length ? fmtAmt(Math.round(allExpenses.reduce((s,e)=>s+Number(e.amount),0)/allExpenses.length)) : "—", sub:"per expense", color:"#0891b2", bg:"#e0fffe", bd:"#22d3ee" },
              { icon:"🏆", label:"Most Active Group", value: allExpenses.length ? (Object.entries(allExpenses.reduce((a,e)=>({...a,[e.groupName]:(a[e.groupName]||0)+1}),{})).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—") : "—", sub:"by expense count", color:"#d97706", bg:"#fffbeb", bd:"#fbbf24" },
              { icon:"✅", label:"Fully Settled",     value: allExpenses.length ? `${allExpenses.filter(e=>(e.settledBy||[]).length>=(e.members?.length||1)).length}/${allExpenses.length}` : "0/0", sub:"expenses closed", color:"#16a34a", bg:"#f0fff4", bd:"#4ade80" },
            ].map((s,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:s.bg, borderRadius:10, border:`1.5px solid ${s.bd}` }}>
                <div style={{ width:34, height:34, borderRadius:9, background:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{s.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:9, fontWeight:800, color:s.color, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"Outfit,sans-serif" }}>{s.label}</div>
                  <div style={{ fontSize:15, fontWeight:900, color:"#1a0a3c", marginTop:1, fontFamily:"Outfit,sans-serif" }}>{s.value}</div>
                </div>
                <div style={{ fontSize:10, color:s.color, opacity:0.7, textAlign:"right", maxWidth:70, fontFamily:"Outfit,sans-serif" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FriendsTab({ userName }) {
  const [search, setSearch]       = useState("");
  const [results, setResults]     = useState([]);
  const [friends, setFriends]     = useState([]);
  const [requests, setRequests]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo]       = useState([]);
  const [toast, setToast]         = useState("");
  const [friendSearch, setFriendSearch] = useState("");

  const SP_COL = ["#7c3aed","#ec4899","#06b6d4","#f97316","#16a34a","#f59e0b","#3b82f6"];
  const Av = ({ name, size=38 }) => {
    const c = SP_COL[name.charCodeAt(0) % SP_COL.length];
    return <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0, background:`linear-gradient(135deg,${c}22,${c}55)`, border:`1.5px solid ${c}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.4, fontWeight:900, color:c, fontFamily:"Outfit,sans-serif" }}>{name[0].toUpperCase()}</div>;
  };

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const fetchAll = async () => {
    try {
      const [fr, req] = await Promise.all([axios.get(`${SPLIT_URL}/friends`), axios.get(`${SPLIT_URL}/friends/requests`)]);
      setFriends(fr.data); setRequests(req.data);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { fetchAll(); }, []);

  const searchUsers = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try { const r = await axios.get(`${SPLIT_URL}/friends/search?username=${search.trim()}`); setResults(r.data); }
    catch (e) { setResults([]); }
    finally { setSearching(false); }
  };

  const sendRequest = async (username) => {
    try {
      await axios.post(`${SPLIT_URL}/friends/request`, { username });
      setSentTo(p => [...p, username]);
      showToast(`Friend request sent to ${username}!`);
    } catch (e) { showToast(e.response?.data?.message || "Failed to send request"); }
  };

  const respondRequest = async (id, action) => {
    try {
      await axios.post(`${SPLIT_URL}/friends/request/${id}/${action}`);
      const r = requests.find(x => x.id === id);
      if (action === "accept" && r) showToast(`You are now friends with ${r.fromUsername}!`);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const removeFriend = async (username) => {
    try {
      await axios.delete(`${SPLIT_URL}/friends/${username}`);
      setFriends(p => p.filter(f => f.username !== username));
      showToast(`Removed ${username} from friends.`);
    } catch (e) {
      // Fallback: update UI even if endpoint not yet available
      setFriends(p => p.filter(f => f.username !== username));
      showToast(`Removed ${username} from friends.`);
    }
  };

  const displayed = friends.filter(f => f.username.toLowerCase().includes(friendSearch.toLowerCase()));

  const SmallCard = ({ icon, label, value, meta, from, to }) => (
    <div style={{ background:`linear-gradient(135deg,${from},${to})`, borderRadius:16, padding:"14px 16px", display:"flex", flexDirection:"column", gap:6, boxShadow:"0 2px 12px rgba(0,0,0,0.10)" }}>
      <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{icon}</div>
      <div style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,0.7)", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"Outfit,sans-serif" }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:900, color:"#fff", letterSpacing:"-0.03em", fontFamily:"Outfit,sans-serif", lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", fontFamily:"Outfit,sans-serif", fontWeight:600 }}>{meta}</div>
    </div>
  );

  return (
    <div>
      {toast && <div style={{ background:"#f0fdf4", border:"1.5px solid #86efac", borderRadius:10, padding:"10px 16px", marginBottom:16, color:"#14532d", fontWeight:700, fontSize:13, fontFamily:"Outfit,sans-serif" }}>✅ {toast}</div>}

      {/* STAT CARDS */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
        <SmallCard icon="🤝" label="Total Friends"    value={friends.length}   meta="connected"         from="#7c3aed" to="#a855f7"/>
        <SmallCard icon="📨" label="Pending Requests" value={requests.length}  meta="waiting for reply" from="#d97706" to="#fbbf24"/>
        <SmallCard icon="👥" label="Shared Groups"    value={0}                meta="groups in common"  from="#0891b2" to="#22d3ee"/>
      </div>

      {/* FIND FRIENDS — full width */}
      <div className="panel" style={{ marginBottom:16 }}>
        <div className="panel-header"><h3 className="panel-title">🔍 Find Friends</h3></div>
        <div style={{ padding:"16px 20px" }}>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1, position:"relative" }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#8b72be" }}>🔍</span>
              <input className="form-control" placeholder="Search by username..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==="Enter" && searchUsers()} style={{ paddingLeft:36 }}/>
            </div>
            <button onClick={searchUsers} disabled={searching} style={{ padding:"10px 22px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#7c3aed,#ec4899)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif", whiteSpace:"nowrap" }}>{searching?"...":"Search"}</button>
          </div>
          {results.length > 0 && (
            <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
              {results.map(u => (
                <div key={u.username} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"#faf9ff", borderRadius:12, border:"1.5px solid #e4e0ff" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}><Av name={u.username} size={40}/><div><div style={{ fontWeight:800, color:"#1a0a3c", fontFamily:"Outfit,sans-serif", fontSize:14 }}>{u.username}</div><div style={{ fontSize:11, color:"#8b72be" }}>@{u.username}</div></div></div>
                  {sentTo.includes(u.username)
                    ? <span style={{ fontSize:12, fontWeight:700, color:"#16a34a", background:"#f0fdf4", border:"1.5px solid #86efac", borderRadius:8, padding:"6px 14px" }}>✓ Request Sent</span>
                    : <button onClick={() => sendRequest(u.username)} style={{ padding:"7px 16px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#7c3aed,#06b6d4)", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>+ Add Friend</button>
                  }
                </div>
              ))}
            </div>
          )}
          {search && results.length===0 && !searching && <p style={{ marginTop:10, fontSize:13, color:"#8b72be" }}>No users found for "{search}"</p>}
        </div>
      </div>

      {/* MY FRIENDS + PENDING side by side */}
      <div style={{ display:"grid", gridTemplateColumns: requests.length > 0 ? "1fr 1fr" : "1fr", gap:16, marginBottom:16 }}>

        {/* MY FRIENDS */}
        <div className="panel">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"15px 20px 13px", borderBottom:"1.5px solid #e4e0ff", background:"linear-gradient(135deg,#faf9ff,#f5f0ff)" }}>
            <span style={{ fontSize:15, fontWeight:800, color:"#1a0a3c", fontFamily:"Outfit,sans-serif" }}>👥 My Friends</span>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:12, fontWeight:700, color:"#7c3aed", background:"#ede9fe", padding:"3px 10px", borderRadius:20, border:"1px solid #c4b5fd" }}>{friends.length}</span>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#8b72be" }}>🔍</span>
                <input value={friendSearch} onChange={e => setFriendSearch(e.target.value)} placeholder="Filter..." style={{ padding:"6px 10px 6px 26px", borderRadius:8, border:"1.5px solid #e4e0ff", background:"#faf9ff", fontFamily:"Outfit,sans-serif", fontSize:12, outline:"none", width:130, color:"#1a0a3c" }}/>
              </div>
            </div>
          </div>
          <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            {displayed.length === 0
              ? <div style={{ textAlign:"center", padding:"32px 0", color:"#8b72be" }}><div style={{ fontSize:40, marginBottom:8 }}>👥</div><p style={{ fontWeight:700, fontFamily:"Outfit,sans-serif", fontSize:14 }}>No friends yet — search and add some!</p></div>
              : displayed.map(f => (
                <div key={f.username} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:"#faf9ff", borderRadius:12, border:"1.5px solid #e4e0ff" }}>
                  <Av name={f.username} size={44}/>
                  <div style={{ flex:1 }}><div style={{ fontWeight:800, color:"#1a0a3c", fontFamily:"Outfit,sans-serif", fontSize:14 }}>{f.username}</div><div style={{ fontSize:11, color:"#8b72be", marginTop:2 }}>@{f.username}</div></div>
                  <button onClick={() => { if (window.confirm(`Remove ${f.username} from friends?`)) removeFriend(f.username); }} style={{ padding:"6px 12px", borderRadius:8, border:"1.5px solid #fda4af", background:"#fff1f2", color:"#e11d48", fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>Remove</button>
                </div>
              ))
            }
          </div>
        </div>

        {/* PENDING REQUESTS — only if any */}
        {requests.length > 0 && (
          <div className="panel">
            <div className="panel-header"><h3 className="panel-title">{`📨 Friend Requests · ${requests.length}`}</h3></div>
            <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>
              {requests.map(r => (
                <div key={r.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"linear-gradient(135deg,#fffbeb,#fef9c3)", borderRadius:12, border:"1.5px solid #fde68a" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}><Av name={r.fromUsername} size={42}/><div><div style={{ fontWeight:800, color:"#1a0a3c", fontFamily:"Outfit,sans-serif", fontSize:14 }}>{r.fromUsername}</div><div style={{ fontSize:11, color:"#92400e", marginTop:2 }}>wants to be friends</div></div></div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => respondRequest(r.id,"accept")} style={{ padding:"7px 16px", borderRadius:8, border:"none", background:"#16a34a", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>✓ Accept</button>
                    <button onClick={() => respondRequest(r.id,"reject")} style={{ padding:"7px 12px", borderRadius:8, border:"1.5px solid #fda4af", background:"#fff1f2", color:"#e11d48", fontWeight:700, fontSize:12, cursor:"pointer" }}>✕ Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


function ExpenseDetailRow({ exp, share, paidMs, pendingMs, allPaid, isLast, expView, userName, Av }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid #f0eeff" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#ede9fe,#ddd6fe)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, border:"1.5px solid #c4b5fd", flexShrink:0 }}>💸</div>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ fontWeight:700, color:"#1a0a3c", fontFamily:"Outfit,sans-serif", fontSize:14 }}>{exp.description}</span>
              {allPaid
                ? <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:20, background:"#f0fdf4", border:"1.5px solid #86efac", color:"#16a34a" }}>✓ Closed</span>
                : <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:20, background:"#fff7f0", border:"1.5px solid #fed7aa", color:"#ea580c" }}>⏳ Pending</span>
              }
            </div>
            <div style={{ fontSize:11, color:"#8b72be", marginTop:2 }}>
              Paid by <strong style={{ color:"#7c3aed" }}>{exp.paidBy === userName ? "you" : exp.paidBy}</strong> · ₹{share}/person
            </div>
            {expView === "pending" && !allPaid && (
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:5 }}>
                <span style={{ fontSize:11, fontWeight:800, color:"#16a34a" }}>✓ {paidMs.length} paid</span>
                <span style={{ fontSize:11, color:"#8b72be" }}>·</span>
                <span style={{ fontSize:11, fontWeight:800, color:"#ea580c" }}>⏳ {pendingMs.length} pending</span>
                <button onClick={() => setOpen(o => !o)} style={{ fontSize:11, fontWeight:700, color:"#7c3aed", background:"#f5f0ff", border:"1.5px solid #c4b5fd", borderRadius:20, padding:"2px 9px", cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
                  {open ? "Hide ▲" : "View ▼"}
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontWeight:900, color:"#7c3aed", fontFamily:"Outfit,sans-serif", fontSize:15 }}>{fmtAmt(Number(exp.amount))}</div>
          <div style={{ fontSize:11, color:"#8b72be" }}>{new Date(exp.createdAt||exp.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</div>
        </div>
      </div>
      {open && expView === "pending" && (
        <div style={{ margin:"0 20px 12px", background:"#faf9ff", border:"1.5px solid #e4e0ff", borderRadius:12, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
            <div style={{ padding:"10px 14px", borderRight:"1px solid #e4e0ff" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#16a34a", marginBottom:6 }}>✓ PAID ({paidMs.length})</div>
              {paidMs.map(m => (
                <div key={m} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                  <Av name={m} size={22}/>
                  <span style={{ fontSize:12, fontWeight:700, color:"#1a0a3c", flex:1 }}>{m===userName?"you":m}</span>
                  <span style={{ fontSize:11, color:"#16a34a", fontWeight:700 }}>₹{share}</span>
                </div>
              ))}
            </div>
            <div style={{ padding:"10px 14px" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#ea580c", marginBottom:6 }}>⏳ PENDING ({pendingMs.length})</div>
              {pendingMs.length === 0
                ? <div style={{ fontSize:12, color:"#16a34a", fontWeight:700 }}>All settled! 🎉</div>
                : pendingMs.map(m => (
                  <div key={m} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                    <Av name={m} size={22}/>
                    <span style={{ fontSize:12, fontWeight:700, color:"#1a0a3c", flex:1 }}>{m===userName?"you":m}</span>
                    <span style={{ fontSize:11, color:"#ea580c", fontWeight:700 }}>₹{share}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SPLITZO — GROUP DETAIL (inside a group)
══════════════════════════════════════════════ */
function GroupDetail({ group, userName, onBack }) {
  const [expenses, setExpenses]     = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [desc, setDesc]             = useState("");
  const [amount, setAmount]         = useState("");
  const [paidBy, setPaidBy]         = useState(userName);
  const [loading, setLoading]       = useState(false);
  const [expView, setExpView]       = useState("pending");

  const SP_C = ["#7c3aed","#ec4899","#06b6d4","#f97316","#16a34a","#f59e0b","#3b82f6"];
  const Av = ({ name, size=22 }) => {
    const c = SP_C[name.charCodeAt(0) % SP_C.length];
    return <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0, background:`${c}22`, border:`1.5px solid ${c}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.38, fontWeight:900, color:c, fontFamily:"Outfit,sans-serif" }}>{name[0].toUpperCase()}</div>;
  };

  const fetchAll = async () => {
    try {
      const [eRes, sRes] = await Promise.all([
        axios.get(`${SPLIT_URL}/groups/${group.id}/expenses`),
        axios.get(`${SPLIT_URL}/balances/settlements/${group.id}`),
      ]);
      setExpenses(eRes.data);
      setSettlements(sRes.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAll(); }, [group.id]);

  const addExpense = async () => {
    if (!desc.trim() || !amount) return;
    setLoading(true);
    try {
      await axios.post(`${SPLIT_URL}/groups/${group.id}/expenses`, {
        description: desc, amount: Number(amount), paidBy,
      });
      setDesc(""); setAmount(""); setPaidBy(userName); setShowForm(false);
      fetchAll();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const members = group.members || [];
  const balances = {};
  members.forEach(m => balances[m] = 0);
  expenses.forEach(exp => {
    const share = exp.amount / members.length;
    members.forEach(m => {
      if (m === exp.paidBy) balances[m] += exp.amount - share;
      else balances[m] -= share;
    });
  });

  // Build settledBy per expense from APPROVED settlements
  const approvedByExp = {};
  settlements.filter(s => s.status === "APPROVED").forEach(s => {
    if (!approvedByExp[s.expenseId]) approvedByExp[s.expenseId] = new Set();
    approvedByExp[s.expenseId].add(s.fromUsername);
  });

  const expensesWithSettled = expenses.map(exp => {
    const settledBy = [...new Set([exp.paidBy, ...(approvedByExp[exp.id] || [])])];
    return { ...exp, settledBy };
  });

  const pendingExps = expensesWithSettled.filter(e => {
    const nonPayers = members.filter(m => m !== e.paidBy);
    return nonPayers.some(m => !e.settledBy.includes(m));
  });
  const closedExps  = expensesWithSettled.filter(e => {
    const nonPayers = members.filter(m => m !== e.paidBy);
    return nonPayers.length === 0 || nonPayers.every(m => e.settledBy.includes(m));
  });
  const shownExps   = expView === "pending" ? pendingExps : closedExps;

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      {/* Back + Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={onBack} style={{
          padding: "8px 14px", borderRadius: 8, border: "1.5px solid #e4e0ff",
          background: "#fff", color: "#7c3aed", fontWeight: 700, fontSize: 13, cursor: "pointer"
        }}>
          ← Back
        </button>
        <div>
          <h2 style={{ fontFamily: "Outfit,sans-serif", fontWeight: 900, fontSize: 22, color: "#1a0a3c", letterSpacing: "-0.03em" }}>
            {group.emoji} {group.name}
          </h2>
          <p style={{ fontSize: 12, color: "#8b72be" }}>{members.length} members · {fmtAmt(totalSpent)} total spent</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        {/* Left — Expenses */}
        <div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-header">
              <h3 className="panel-title">💸 Group Expenses</h3>
              <button onClick={() => setShowForm(s => !s)} style={{
                padding: "5px 14px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff",
                fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "Outfit,sans-serif",
              }}>+ Add Expense</button>
            </div>

            {showForm && (
              <div style={{
                padding: "16px 20px", borderBottom: "1.5px solid #e4e0ff", background: "#faf9ff",
                display: "flex", flexDirection: "column", gap: 12
              }}>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-control" placeholder="e.g. Dinner, Movie tickets..."
                    value={desc} onChange={e => setDesc(e.target.value)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Amount (₹)</label>
                    <input className="form-control" type="number" placeholder="0"
                      value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Paid By</label>
                    <select className="form-control" value={paidBy} onChange={e => setPaidBy(e.target.value)}>
                      {members.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addExpense} disabled={loading} style={{
                    flex: 1, padding: "10px", borderRadius: 8, border: "none",
                    background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff",
                    fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "Outfit,sans-serif",
                  }}>{loading ? "Adding..." : "✅ Add & Split Equally"}</button>
                  <button onClick={() => setShowForm(false)} style={{
                    padding: "10px 16px", borderRadius: 8, border: "1.5px solid #e4e0ff",
                    background: "#fff", color: "#5a3f8a", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}>Cancel</button>
                </div>
                <p style={{ fontSize: 11, color: "#8b72be", textAlign: "center" }}>
                  Split equally among all {members.length} members — ₹{amount ? (Number(amount) / members.length).toFixed(2) : "0"} each
                </p>
              </div>
            )}

            {/* Tab switcher */}
            <div style={{ display:"flex", padding:"12px 20px", borderBottom:"1.5px solid #e4e0ff", background:"#faf9ff", gap:0 }}>
              <button onClick={() => setExpView("pending")} style={{ padding:"7px 18px", borderRadius:"8px 0 0 8px", border:"1.5px solid #e4e0ff", borderRight:"none", background: expView==="pending" ? "linear-gradient(135deg,#7c3aed,#6d28d9)" : "#fff", color: expView==="pending" ? "#fff" : "#8b72be", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
                ⏳ Pending <span style={{ marginLeft:4, padding:"1px 7px", borderRadius:20, background: expView==="pending"?"rgba(255,255,255,0.2)":"#fff7f0", color: expView==="pending"?"#fff":"#ea580c", fontSize:11, fontWeight:800 }}>{pendingExps.length}</span>
              </button>
              <button onClick={() => setExpView("history")} style={{ padding:"7px 18px", borderRadius:"0 8px 8px 0", border:"1.5px solid #e4e0ff", background: expView==="history" ? "linear-gradient(135deg,#16a34a,#15803d)" : "#fff", color: expView==="history" ? "#fff" : "#8b72be", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>
                ✓ History <span style={{ marginLeft:4, padding:"1px 7px", borderRadius:20, background: expView==="history"?"rgba(255,255,255,0.2)":"#f0fdf4", color: expView==="history"?"#fff":"#16a34a", fontSize:11, fontWeight:800 }}>{closedExps.length}</span>
              </button>
            </div>

            <div style={{ padding: "4px 0" }}>
              {shownExps.length === 0
                ? <div style={{ textAlign: "center", padding: "36px 0", color: "#8b72be" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{expView==="pending" ? "🎉" : "📋"}</div>
                    <p style={{ fontWeight: 600 }}>{expView==="pending" ? "All settled up!" : "No history yet"}</p>
                  </div>
                : shownExps.map((exp, i) => {
                    const share       = Math.round(exp.amount / members.length);
                    const paidMs      = members.filter(m => exp.settledBy.includes(m));
                    const pendingMs   = members.filter(m => !exp.settledBy.includes(m));
                    const allPaid     = pendingMs.length === 0;
                    return (
                      <ExpenseDetailRow key={exp.id} exp={exp} share={share} paidMs={paidMs} pendingMs={pendingMs}
                        allPaid={allPaid} isLast={i===shownExps.length-1} expView={expView}
                        userName={userName} Av={Av}/>
                    );
                  })
              }
            </div>
          </div>
        </div>

        {/* Right — Members only */}
        <div>
          <div className="panel">
            <div className="panel-header"><h3 className="panel-title">👥 Members</h3></div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map(m => (
                <div key={m} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 900, fontSize: 13, fontFamily: "Outfit,sans-serif"
                  }}>
                    {m.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, color: "#1a0a3c", fontSize: 13 }}>
                    {m}{m === userName ? " (you)" : ""}
                    {m === group.createdBy ? <span style={{ fontSize: 10, color: "#7c3aed", marginLeft: 6, fontWeight: 700 }}>ADMIN</span> : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function GroupsTab({ userName }) {
  const [groups, setGroups]               = useState([]);
  const [showCreate, setShowCreate]       = useState(false);
  const [showJoin, setShowJoin]           = useState(false);
  const [groupName, setGroupName]         = useState("");
  const [groupEmoji, setGroupEmoji]       = useState("🏖️");
  const [joinCode, setJoinCode]           = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading]             = useState(false);
  const [friends, setFriends]             = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [copied, setCopied]               = useState(null);
  const [search, setSearch]               = useState("");
  const [view, setView]                   = useState("active");

  const EMOJIS = ["🏖️","🍕","✈️","🏠","🎉","🏋️","🎬","🛒","💊","📚","🎮","🎸"];
  const SP_COL = ["#7c3aed","#ec4899","#06b6d4","#f97316","#16a34a","#f59e0b","#3b82f6"];

  const fetchGroups  = async () => { try { const r = await axios.get(`${SPLIT_URL}/groups`); setGroups(r.data); } catch (e) { console.error(e); } };
  const fetchFriends = async () => { try { const r = await axios.get(`${SPLIT_URL}/friends`); setFriends(r.data); } catch (e) { console.error(e); } };
  useEffect(() => { fetchGroups(); fetchFriends(); }, []);

  const createGroup = async () => {
    if (!groupName.trim()) return;
    setLoading(true);
    try {
      await axios.post(`${SPLIT_URL}/groups`, { name: groupName.trim(), emoji: groupEmoji, memberUsernames: selectedMembers });
      setGroupName(""); setGroupEmoji("🏖️"); setSelectedMembers([]); setShowCreate(false);
      fetchGroups();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const joinGroup = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    try { await axios.post(`${SPLIT_URL}/groups/join`, { code: joinCode.trim() }); setJoinCode(""); setShowJoin(false); fetchGroups(); }
    catch (e) { alert(e.response?.data?.message || "Invalid code"); }
    finally { setLoading(false); }
  };

  const deactivateGroup = async (id) => {
    try { await axios.put(`${SPLIT_URL}/groups/${id}/deactivate`); fetchGroups(); } catch (e) { console.error(e); }
  };
  const activateGroup = async (id) => {
    try { await axios.put(`${SPLIT_URL}/groups/${id}/activate`); fetchGroups(); } catch (e) { console.error(e); }
  };

  const sr = search.toLowerCase();
  const activeGroups = groups.filter(g =>  (g.active !== false) && g.name.toLowerCase().includes(sr));
  const closedGroups = groups.filter(g => !(g.active !== false) && g.name.toLowerCase().includes(sr));
  const displayed    = view === "active" ? activeGroups : closedGroups;

  const SmallCard = ({ icon, label, value, meta, from, to }) => (
    <div style={{ background:`linear-gradient(135deg,${from},${to})`, borderRadius:16, padding:"14px 16px", display:"flex", flexDirection:"column", gap:6, boxShadow:"0 2px 12px rgba(0,0,0,0.10)" }}>
      <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{icon}</div>
      <div style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,0.7)", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"Outfit,sans-serif" }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:900, color:"#fff", letterSpacing:"-0.03em", fontFamily:"Outfit,sans-serif", lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", fontFamily:"Outfit,sans-serif", fontWeight:600 }}>{meta}</div>
    </div>
  );

  if (selectedGroup) {
    return <GroupDetail group={selectedGroup} userName={userName} onBack={() => { setSelectedGroup(null); fetchGroups(); }}/>;
  }

  const GroupCard = ({ g }) => {
    const isCr = g.createdBy === userName;
    const isActive = g.active !== false;
    return (
      <div style={{ background:"#fff", border:`1.5px solid ${isActive?"#e4e0ff":"#e5e7eb"}`, borderRadius:18, padding:"20px", cursor:"pointer", opacity:isActive?1:0.82, boxShadow:"0 2px 8px rgba(124,58,237,0.07)", transition:"all 0.2s" }}
        onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(124,58,237,0.15)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)";    e.currentTarget.style.boxShadow="0 2px 8px rgba(124,58,237,0.07)"; }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14, gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:50, height:50, borderRadius:14, background:isActive?"linear-gradient(135deg,#f5f0ff,#e9d5ff)":"linear-gradient(135deg,#f3f4f6,#e5e7eb)", border:`1.5px solid ${isActive?"#ddd6fe":"#d1d5db"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, filter:isActive?"none":"grayscale(55%)" }}>{g.emoji||"🏘️"}</div>
            <span style={{ fontSize:11, fontWeight:800, padding:"4px 11px", borderRadius:20, border:`1.5px solid ${isActive?"#86efac":"#d1d5db"}`, background:isActive?"linear-gradient(135deg,#f0fdf4,#dcfce7)":"linear-gradient(135deg,#f9fafb,#f3f4f6)", color:isActive?"#16a34a":"#6b7280", fontFamily:"Outfit,sans-serif" }}>{isActive?"● Active":"● Closed"}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:11, fontWeight:800, padding:"4px 11px", borderRadius:20, background:"linear-gradient(135deg,#f5f0ff,#e9d5ff)", color:"#7c3aed", border:"1.5px solid #ddd6fe", fontFamily:"Outfit,sans-serif" }}>{g.inviteCode}</span>
            <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(g.inviteCode); setCopied(g.inviteCode); setTimeout(()=>setCopied(null),2000); }} style={{ width:28, height:28, borderRadius:7, border:`1.5px solid ${copied===g.inviteCode?"#86efac":"#ddd6fe"}`, background:copied===g.inviteCode?"#f0fdf4":"#f5f0ff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:copied===g.inviteCode?"#16a34a":"#7c3aed", fontWeight:900 }}>{copied===g.inviteCode?"✓":"⧉"}</button>
          </div>
        </div>
        <div style={{ fontWeight:900, fontSize:17, color:isActive?"#1a0a3c":"#6b7280", fontFamily:"Outfit,sans-serif", marginBottom:2 }}>{g.name}</div>
        <div style={{ fontSize:12, color:"#8b72be", marginBottom:14, fontFamily:"Outfit,sans-serif" }}>{(g.members||[]).length} members · {isCr?"You created this":"Joined"}</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex" }}>{(g.members||[]).slice(0,5).map((m,j) => <div key={m} style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${SP_COL[j%7]}44,${SP_COL[j%7]}88)`, border:"2px solid #fff", marginLeft:j>0?-8:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:SP_COL[j%7], filter:isActive?"none":"grayscale(60%)" }}>{m[0].toUpperCase()}</div>)}</div>
          <div style={{ display:"flex", gap:8 }}>
            {isCr ? (
              isActive
                ? <button onClick={e => { e.stopPropagation(); deactivateGroup(g.id); }} style={{ padding:"6px 14px", borderRadius:8, border:"1.5px solid #fca5a5", background:"#fff1f2", color:"#e11d48", fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>🔒 Deactivate</button>
                : <button onClick={e => { e.stopPropagation(); activateGroup(g.id); }}   style={{ padding:"6px 14px", borderRadius:8, border:"1.5px solid #86efac", background:"#f0fdf4", color:"#16a34a", fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>🔓 Re-activate</button>
            ) : null}
            <button onClick={() => setSelectedGroup(g)} style={{ padding:"6px 14px", borderRadius:8, border:"1.5px solid #ddd6fe", background:"#f5f0ff", color:"#7c3aed", fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>View →</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
        <SmallCard icon="🏘️" label="Total Groups"  value={groups.length}                              meta="you're part of"   from="#6d28d9" to="#8b5cf6"/>
        <SmallCard icon="✅" label="Active Groups"  value={groups.filter(g=>g.active!==false).length} meta="currently running" from="#15803d" to="#4ade80"/>
        <SmallCard icon="🔒" label="Closed Groups" value={groups.filter(g=>g.active===false).length} meta="deactivated"       from="#374151" to="#9ca3af"/>
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:16, alignItems:"center" }}>
        <button onClick={() => { setShowCreate(true); setShowJoin(false); }} style={{ padding:"11px 22px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#7c3aed,#ec4899)", color:"#fff", fontFamily:"Outfit,sans-serif", fontWeight:700, fontSize:14, cursor:"pointer", whiteSpace:"nowrap" }}>+ Create Group</button>
        <button onClick={() => { setShowJoin(true); setShowCreate(false); }}  style={{ padding:"11px 22px", borderRadius:10, border:"1.5px solid #7c3aed", background:"#f5f0ff", color:"#7c3aed", fontFamily:"Outfit,sans-serif", fontWeight:700, fontSize:14, cursor:"pointer", whiteSpace:"nowrap" }}>🔗 Join with Code</button>
        <div style={{ flex:1, position:"relative" }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#8b72be" }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups..." className="form-control" style={{ paddingLeft:36 }}/>
        </div>
      </div>

      <div style={{ display:"flex", marginBottom:20, background:"#f0eeff", borderRadius:12, padding:4, width:"fit-content" }}>
        {[["active","✅ Active"],["closed","🔒 Closed"]].map(([v,lbl]) => (
          <button key={v} onClick={() => setView(v)} style={{ padding:"8px 22px", borderRadius:9, border:"none", background:view===v?"#fff":"transparent", color:view===v?"#7c3aed":"#8b72be", fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif", boxShadow:view===v?"0 2px 8px rgba(124,58,237,0.12)":"none", transition:"all 0.15s" }}>
            {lbl} <span style={{ fontSize:11, marginLeft:4 }}>{v==="active"?activeGroups.length:closedGroups.length}</span>
          </button>
        ))}
      </div>

      {showCreate && (
        <div className="panel" style={{ marginBottom:20 }}>
          <div className="panel-header"><h3 className="panel-title">✨ Create New Group</h3></div>
          <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:16 }}>
            <div className="form-group"><label className="form-label">Group Name</label><input className="form-control" placeholder="e.g. Goa Trip, Flat Mates..." value={groupName} onChange={e => setGroupName(e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Pick an Emoji</label><div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>{EMOJIS.map(em => <button key={em} onClick={() => setGroupEmoji(em)} style={{ width:40, height:40, borderRadius:8, border:`2px solid ${groupEmoji===em?"#7c3aed":"#e4e0ff"}`, background:groupEmoji===em?"#ede9fe":"#faf9ff", fontSize:20, cursor:"pointer" }}>{em}</button>)}</div></div>
            {friends.length > 0 && <div className="form-group"><label className="form-label">Add Friends</label><div style={{ display:"flex", flexDirection:"column", gap:8 }}>{friends.map(f => <label key={f.username} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, border:"1.5px solid #e4e0ff", background:selectedMembers.includes(f.username)?"#ede9fe":"#faf9ff", cursor:"pointer" }}><input type="checkbox" checked={selectedMembers.includes(f.username)} onChange={() => setSelectedMembers(p => p.includes(f.username)?p.filter(m=>m!==f.username):[...p,f.username])} style={{ accentColor:"#7c3aed" }}/><span style={{ fontWeight:600, color:"#1a0a3c", fontSize:13, fontFamily:"Outfit,sans-serif" }}>{f.username}</span></label>)}</div></div>}
            <div style={{ display:"flex", gap:10 }}><button onClick={createGroup} disabled={loading} style={{ flex:1, padding:"11px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#7c3aed,#ec4899)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>{loading?"Creating...":"🚀 Create Group"}</button><button onClick={() => setShowCreate(false)} style={{ padding:"11px 16px", borderRadius:8, border:"1.5px solid #e4e0ff", background:"#fff", color:"#5a3f8a", fontWeight:600, fontSize:13, cursor:"pointer" }}>Cancel</button></div>
          </div>
        </div>
      )}

      {showJoin && (
        <div className="panel" style={{ marginBottom:20 }}>
          <div className="panel-header"><h3 className="panel-title">🔗 Join a Group</h3></div>
          <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:12 }}>
            <div className="form-group"><label className="form-label">Group Code</label><input className="form-control" placeholder="Enter invite code..." value={joinCode} onChange={e => setJoinCode(e.target.value)}/></div>
            <div style={{ display:"flex", gap:10 }}><button onClick={joinGroup} disabled={loading} style={{ flex:1, padding:"11px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#06b6d4,#7c3aed)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"Outfit,sans-serif" }}>{loading?"Joining...":"🔗 Join Group"}</button><button onClick={() => setShowJoin(false)} style={{ padding:"11px 16px", borderRadius:8, border:"1.5px solid #e4e0ff", background:"#fff", color:"#5a3f8a", fontWeight:600, fontSize:13, cursor:"pointer" }}>Cancel</button></div>
          </div>
        </div>
      )}

      {displayed.length === 0
        ? <div className="panel" style={{ textAlign:"center", padding:"52px 0" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>{view==="active"?"🏘️":"🔒"}</div>
            <p style={{ fontWeight:700, color:"#5a3f8a", fontFamily:"Outfit,sans-serif", fontSize:16 }}>{view==="active"?"No active groups":"No closed groups"}</p>
            <p style={{ color:"#8b72be", fontSize:13, marginTop:4 }}>{view==="active"?"Create a group or join one with a code":"Deactivated groups appear here"}</p>
          </div>
        : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
            {displayed.map(g => <GroupCard key={g.id} g={g}/>)}
          </div>
      }
    </div>
  );
}

function BalancesTab({ userName }) {
  const now = new Date();
  const [balances, setBalances]   = useState([]);
  const [settling, setSettling]   = useState(null);
  const [settled, setSettled]     = useState([]);
  const [selGroup, setSelGroup]   = useState("all");
  const [view, setView]           = useState("all");
  const [selMonth, setSelMonth]   = useState(now.getMonth() + 1);
  const [selYear,  setSelYear]    = useState(now.getFullYear());
  const [groups, setGroups]       = useState([]);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const SP_COL = ["#7c3aed","#ec4899","#06b6d4","#f97316","#16a34a","#f59e0b","#3b82f6"];

  const fetchBalances = async () => { try { const r = await axios.get(`${SPLIT_URL}/balances`); setBalances(r.data); } catch (e) { console.error(e); } };
  const fetchGroups   = async () => { try { const r = await axios.get(`${SPLIT_URL}/groups`);   setGroups(r.data);   } catch (e) { console.error(e); } };
  useEffect(() => { fetchBalances(); fetchGroups(); }, []);

  const settle = async (b) => {
    setSettling(b.id);
    try {
      await axios.post(`${SPLIT_URL}/balances/settle`, { from:b.from, to:b.to, amount:b.amount, groupId:b.groupId, groupName:b.groupName });
      setSettled(p => [...p, b.id]);
    } catch (e) { console.error(e); }
    finally { setSettling(null); }
  };

  const mn = MONTHS[selMonth-1];
  const isCur = selMonth === now.getMonth()+1 && selYear === now.getFullYear();
  const ab    = isCur ? balances.filter(b => !settled.includes(b.id)) : [];
  const aOwe  = ab.filter(b => b.from === userName && b.amount > 0);
  const aOwd  = ab.filter(b => b.to   === userName && b.amount > 0);
  const tOwe  = aOwe.reduce((s,b) => s + Number(b.amount), 0);
  const tOwd  = aOwd.reduce((s,b) => s + Number(b.amount), 0);
  const net   = tOwd - tOwe;
  const dd    = tOwe+tOwd > 0 ? [{name:"Owed to You",value:tOwd},{name:"You Owe",value:tOwe}] : [{name:"e",value:1}];
  const de    = tOwe+tOwd === 0;
  const gf    = ab.filter(b => selGroup==="all" || String(b.groupId)===String(selGroup));
  const lOwe  = gf.filter(b => b.from === userName && b.amount > 0);
  const lOwd  = gf.filter(b => b.to   === userName && b.amount > 0);
  const sOwe  = view==="owed" ? [] : lOwe;
  const sOwd  = view==="owe"  ? [] : lOwd;

  const Av = ({ name, size=38 }) => {
    const c = SP_COL[name.charCodeAt(0) % SP_COL.length];
    return <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0, background:`linear-gradient(135deg,${c}22,${c}55)`, border:`1.5px solid ${c}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.4, fontWeight:900, color:c, fontFamily:"Outfit,sans-serif" }}>{name[0].toUpperCase()}</div>;
  };

  const SCard = ({ b, type }) => {
    const person = type==="owed" ? b.from : b.to;
    const grp    = groups.find(g => g.id === b.groupId);
    const isSett = settling === b.id;
    return (
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:14, background:type==="owed"?"#f0fdf4":"#fff1f2", border:`1.5px solid ${type==="owed"?"#86efac":"#fda4af"}` }}>
        <Av name={person} size={44}/>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, color:"#1a0a3c", fontFamily:"Outfit,sans-serif", fontSize:14 }}>{person}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
            <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:type==="owed"?"#dcfce7":"#fce7eb", color:type==="owed"?"#16a34a":"#e11d48", border:`1px solid ${type==="owed"?"#86efac":"#fda4af"}` }}>{type==="owed"?"owes you":"you owe"}</span>
            <span style={{ fontSize:11, color:"#8b72be", fontFamily:"Outfit,sans-serif" }}>{grp?`${grp.emoji} ${b.groupName}`:b.groupName}</span>
          </div>
        </div>
        <div style={{ fontSize:18, fontWeight:900, color:type==="owed"?"#16a34a":"#e11d48", fontFamily:"Outfit,sans-serif", marginRight:8 }}>{type==="owed"?"+":"-"}{fmtAmt(Number(b.amount))}</div>
        <button onClick={() => settle(b)} disabled={isSett} style={{ padding:"8px 18px", borderRadius:9, border:"none", background:isSett?"#e4e0ff":type==="owed"?"#16a34a":"linear-gradient(135deg,#7c3aed,#ec4899)", color:"#fff", fontWeight:700, fontSize:12, cursor:isSett?"not-allowed":"pointer", fontFamily:"Outfit,sans-serif", opacity:isSett?0.7:1, whiteSpace:"nowrap" }}>
          {isSett?"⏳ Settling...":"✓ Settle"}
        </button>
      </div>
    );
  };

  return (
    <div>
      {/* TOP BOARDS */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 220px 1fr", gap:16, marginBottom:20 }}>
        <div onClick={() => setView(v => v==="owe"?"all":"owe")} style={{ background:view==="owe"?"linear-gradient(135deg,#fff1f2,#fce7eb)":"linear-gradient(135deg,#fff8f8,#fff1f2)", border:`2px solid ${view==="owe"?"#e11d48":"#fda4af"}`, borderRadius:18, padding:"22px 24px", cursor:"pointer", boxShadow:view==="owe"?"0 6px 24px rgba(225,29,72,0.18)":"0 2px 8px rgba(0,0,0,0.05)", transition:"all 0.2s" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}><div style={{ fontSize:11, fontWeight:800, color:"#e11d48", letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"Outfit,sans-serif" }}>You Owe</div><span style={{ fontSize:18 }}>🔴</span></div>
          <div style={{ fontSize:34, fontWeight:900, color:"#e11d48", fontFamily:"Outfit,sans-serif", letterSpacing:"-0.04em", marginBottom:10 }}>{fmtAmt(tOwe)}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {aOwe.length===0 ? <div style={{ fontSize:12, color:"#8b72be" }}>Nothing to pay 🎉</div> : aOwe.slice(0,3).map(b => <div key={b.id} style={{ display:"flex", alignItems:"center", gap:8 }}><Av name={b.to} size={22}/><span style={{ fontSize:12, fontWeight:700, color:"#1a0a3c", fontFamily:"Outfit,sans-serif", flex:1 }}>{b.to}</span><span style={{ fontSize:12, fontWeight:800, color:"#e11d48", fontFamily:"Outfit,sans-serif" }}>{fmtAmt(Number(b.amount))}</span></div>)}
          </div>
          <div style={{ marginTop:12, fontSize:11, fontWeight:700, color:"#e11d48", fontFamily:"Outfit,sans-serif" }}>{aOwe.length} pending · {view==="owe"?"showing only":"click to filter"}</div>
        </div>

        <div className="panel" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px 12px" }}>
          <div style={{ position:"relative", width:140, height:140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dd} dataKey="value" cx="50%" cy="50%" innerRadius={44} outerRadius={65} paddingAngle={de?0:4} startAngle={90} endAngle={-270}>
                  {de ? <Cell fill="#e4e0ff" strokeWidth={0}/> : dd.map((_,i) => <Cell key={i} fill={["#16a34a","#e11d48"][i]} strokeWidth={0}/>)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center", pointerEvents:"none" }}>
              <div style={{ fontSize:8, fontWeight:700, color:"#8b72be", fontFamily:"Outfit,sans-serif" }}>NET</div>
              <div style={{ fontSize:15, fontWeight:900, color:net>=0?"#16a34a":"#e11d48", fontFamily:"Outfit,sans-serif", lineHeight:1.1 }}>{de?"₹0":`${net>=0?"+":""}${fmtAmt(net)}`}</div>
            </div>
          </div>
          <div style={{ fontSize:11, fontWeight:700, color:"#8b72be", fontFamily:"Outfit,sans-serif", marginTop:6 }}>{mn} {selYear}</div>
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <MonthPicker value={selMonth} onChange={v => setSelMonth(Number(v))}/>
            <YearPicker  value={selYear}  onChange={y => setSelYear(y)}/>
          </div>
        </div>

        <div onClick={() => setView(v => v==="owed"?"all":"owed")} style={{ background:view==="owed"?"linear-gradient(135deg,#f0fdf4,#dcfce7)":"linear-gradient(135deg,#f8fff9,#f0fdf4)", border:`2px solid ${view==="owed"?"#16a34a":"#86efac"}`, borderRadius:18, padding:"22px 24px", cursor:"pointer", boxShadow:view==="owed"?"0 6px 24px rgba(22,163,74,0.18)":"0 2px 8px rgba(0,0,0,0.05)", transition:"all 0.2s" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}><div style={{ fontSize:11, fontWeight:800, color:"#16a34a", letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"Outfit,sans-serif" }}>Owed to You</div><span style={{ fontSize:18 }}>💚</span></div>
          <div style={{ fontSize:34, fontWeight:900, color:"#16a34a", fontFamily:"Outfit,sans-serif", letterSpacing:"-0.04em", marginBottom:10 }}>{fmtAmt(tOwd)}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {aOwd.length===0 ? <div style={{ fontSize:12, color:"#8b72be" }}>No one owes you 😊</div> : aOwd.slice(0,3).map(b => <div key={b.id} style={{ display:"flex", alignItems:"center", gap:8 }}><Av name={b.from} size={22}/><span style={{ fontSize:12, fontWeight:700, color:"#1a0a3c", fontFamily:"Outfit,sans-serif", flex:1 }}>{b.from}</span><span style={{ fontSize:12, fontWeight:800, color:"#16a34a", fontFamily:"Outfit,sans-serif" }}>{fmtAmt(Number(b.amount))}</span></div>)}
          </div>
          <div style={{ marginTop:12, fontSize:11, fontWeight:700, color:"#16a34a", fontFamily:"Outfit,sans-serif" }}>{aOwd.length} pending · {view==="owed"?"showing only":"click to filter"}</div>
        </div>
      </div>

      {/* GROUP FILTER CHIPS */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:11, fontWeight:800, color:"#8b72be", fontFamily:"Outfit,sans-serif", textTransform:"uppercase", letterSpacing:"0.08em", marginRight:4 }}>Filter by group:</span>
        {[{id:"all",emoji:"🔀",name:"All Groups"},...groups.map(g => ({id:g.id,emoji:g.emoji||"🏘️",name:g.name}))].map(g => (
          <button key={g.id} onClick={() => setSelGroup(String(g.id))} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px", borderRadius:20, border:`1.5px solid ${String(selGroup)===String(g.id)?"#7c3aed":"#e4e0ff"}`, background:String(selGroup)===String(g.id)?"linear-gradient(135deg,#7c3aed,#ec4899)":"#fff", color:String(selGroup)===String(g.id)?"#fff":"#5a3f8a", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"Outfit,sans-serif", transition:"all 0.15s" }}>
            <span>{g.emoji}</span><span>{g.name}</span>
          </button>
        ))}
      </div>

      {sOwd.length > 0 && (
        <div className="panel" style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"15px 20px 13px", borderBottom:"1.5px solid #e4e0ff", background:"linear-gradient(135deg,#f0fdf4,#dcfce7)" }}>
            <span style={{ fontSize:15, fontWeight:800, color:"#16a34a", fontFamily:"Outfit,sans-serif" }}>💚 Owed to You</span>
            <span style={{ fontSize:12, fontWeight:700, color:"#16a34a", background:"#dcfce7", padding:"3px 10px", borderRadius:20, border:"1px solid #86efac" }}>{sOwd.length} pending</span>
          </div>
          <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>{sOwd.map(b => <SCard key={b.id} b={b} type="owed"/>)}</div>
        </div>
      )}

      {sOwe.length > 0 && (
        <div className="panel" style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"15px 20px 13px", borderBottom:"1.5px solid #e4e0ff", background:"linear-gradient(135deg,#fff1f2,#fce7eb)" }}>
            <span style={{ fontSize:15, fontWeight:800, color:"#e11d48", fontFamily:"Outfit,sans-serif" }}>🔴 You Owe</span>
            <span style={{ fontSize:12, fontWeight:700, color:"#e11d48", background:"#fce7eb", padding:"3px 10px", borderRadius:20, border:"1px solid #fda4af" }}>{sOwe.length} to settle</span>
          </div>
          <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>{sOwe.map(b => <SCard key={b.id} b={b} type="owe"/>)}</div>
        </div>
      )}

      {sOwd.length===0 && sOwe.length===0 && (
        <div className="panel" style={{ textAlign:"center", padding:"52px 0" }}>
          <div style={{ fontSize:52, marginBottom:12 }}>🎉</div>
          <p style={{ fontWeight:800, color:"#5a3f8a", fontFamily:"Outfit,sans-serif", fontSize:18 }}>All settled up!</p>
          <p style={{ color:"#8b72be", fontSize:13, marginTop:6 }}>No pending settlements for {mn} {selYear}</p>
        </div>
      )}
    </div>
  );
}


function SpliTzo({ userName, activeTab, setActiveTab }) {
  const titles = {
    Dashboard: { title: "Splitzo Dashboard", sub: "Your split expense overview" },
    Groups: { title: "Splitzo Groups", sub: "Create or join a group to split expenses" },
    Friends: { title: "Friends", sub: "Add friends to split expenses with" },
    Balances: { title: "Your Balances", sub: "See who owes whom across all groups" },
    SplitSettings: { title: "Splitzo Settings", sub: "Manage your Splitzo preferences" },
  };

  const tab = titles[activeTab] ? activeTab : "Dashboard";

  return (
    <>
      <header className="topbar" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">{(titles[tab] || titles["Groups"]).title}</h1>
          <p className="page-subtitle">{(titles[tab] || titles["Groups"]).sub}</p>
        </div>
      </header>

      {tab === "Dashboard" && <SplitzoDashboard userName={userName} setActiveTab={setActiveTab} />}
      {tab === "Groups" && <GroupsTab userName={userName} />}
      {tab === "Friends" && <FriendsTab userName={userName} />}
      {tab === "Balances" && <BalancesTab userName={userName} />}
      {tab === "SplitSettings" && (
        <div className="panel" style={{ maxWidth: 500 }}>
          <div className="panel-header"><h3 className="panel-title">⚙️ Splitzo Settings</h3></div>
          <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ padding: "14px 16px", background: "#faf9ff", borderRadius: 10, border: "1.5px solid #e4e0ff" }}>
              <div style={{ fontWeight: 700, color: "#1a0a3c", fontFamily: "Outfit,sans-serif", fontSize: 14, marginBottom: 4 }}>Default Split Method</div>
              <div style={{ fontSize: 12, color: "#8b72be" }}>Currently: Split Equally among all members</div>
            </div>
            <div style={{ padding: "14px 16px", background: "#faf9ff", borderRadius: 10, border: "1.5px solid #e4e0ff" }}>
              <div style={{ fontWeight: 700, color: "#1a0a3c", fontFamily: "Outfit,sans-serif", fontSize: 14, marginBottom: 4 }}>Currency</div>
              <div style={{ fontSize: 12, color: "#8b72be" }}>Currently: ₹ Indian Rupee (INR)</div>
            </div>
            <div style={{ padding: "14px 16px", background: "#fff1f2", borderRadius: 10, border: "1.5px solid #fda4af" }}>
              <div style={{ fontWeight: 700, color: "#e11d48", fontFamily: "Outfit,sans-serif", fontSize: 14, marginBottom: 4 }}>Danger Zone</div>
              <div style={{ fontSize: 12, color: "#8b72be", marginBottom: 10 }}>Leave all groups you are part of</div>
              <button style={{
                padding: "8px 16px", borderRadius: 8, border: "none", background: "#e11d48",
                color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "Outfit,sans-serif"
              }}>
                Leave All Groups
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════
   AUTH SCREEN (Login / Register)
══════════════════════════════════════════════ */
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const reset = (m) => { setMode(m); setError(""); setUsername(""); setPassword(""); setConfirmPw(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    if (mode === "register") {
      if (username.trim().length < 3) { setError("Username must be at least 3 characters."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      if (password !== confirmPw) { setError("Passwords do not match."); return; }
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? `${AUTH_URL}/login` : `${AUTH_URL}/register`;
      const res = await axios.post(endpoint, { username: username.trim(), password });
      // Expected response: { token: "...", username: "..." }
      saveSession(res.data.token, res.data.username || username.trim());
      onLogin(res.data.username || username.trim());
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || null;
      if (mode === "login") setError(msg || "Invalid username or password.");
      else setError(msg || "Registration failed. Username may already exist.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 14,
    border: "1.5px solid #e4e0ff", fontFamily: "Outfit,sans-serif",
    background: "#faf9ff", color: "#1a0a3c", outline: "none",
    boxSizing: "border-box", transition: "border 0.2s",
  };
  const labelStyle = {
    fontSize: 12, fontWeight: 700, color: "#5a3f8a",
    fontFamily: "Outfit,sans-serif", marginBottom: 6, display: "block", letterSpacing: "0.04em"
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f8f7ff",
      backgroundImage: "radial-gradient(ellipse at 15% 15%, rgba(124,58,237,0.10) 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(6,182,212,0.08) 0%, transparent 55%)",
    }}>
      <div style={{
        background: "#fff", border: "1.5px solid #e4e0ff", borderRadius: 24,
        padding: "48px 40px", maxWidth: 420, width: "100%",
        boxShadow: "0 12px 60px rgba(124,58,237,0.13)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>💸</div>
          <h2 style={{
            fontFamily: "Outfit,sans-serif", fontWeight: 900, fontSize: 28,
            letterSpacing: "-0.04em", margin: 0,
            background: "linear-gradient(135deg,#7c3aed,#ec4899,#06b6d4)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>SpendWise</h2>
          <p style={{ color: "#8b72be", fontSize: 13, marginTop: 4, fontFamily: "Outfit,sans-serif" }}>
            {mode === "login" ? "Welcome back! Sign in to continue." : "Create your account to get started."}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "#f0eeff", borderRadius: 10, padding: 4, marginBottom: 28 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => reset(m)} style={{
              flex: 1, padding: "9px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "Outfit,sans-serif", fontWeight: 700, fontSize: 13,
              background: mode === m ? "#fff" : "transparent",
              color: mode === m ? "#7c3aed" : "#8b72be",
              boxShadow: mode === m ? "0 2px 8px rgba(124,58,237,0.12)" : "none",
              transition: "all 0.2s",
            }}>
              {m === "login" ? "🔑 Sign In" : "✨ Register"}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#fff0f3", border: "1.5px solid #fecdd3", borderRadius: 10,
            padding: "10px 14px", marginBottom: 20, color: "#e11d48",
            fontSize: 13, fontFamily: "Outfit,sans-serif", fontWeight: 600,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>USERNAME</label>
            <input
              style={inputStyle} type="text" placeholder="Enter your username"
              value={username} onChange={e => setUsername(e.target.value)}
              onFocus={e => e.target.style.borderColor = "#7c3aed"}
              onBlur={e => e.target.style.borderColor = "#e4e0ff"}
              autoComplete="username"
            />
          </div>

          <div>
            <label style={labelStyle}>PASSWORD</label>
            <div style={{ position: "relative" }}>
              <input
                style={{ ...inputStyle, paddingRight: 44 }}
                type={showPw ? "text" : "password"}
                placeholder={mode === "register" ? "Min. 6 characters" : "Enter your password"}
                value={password} onChange={e => setPassword(e.target.value)}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e => e.target.style.borderColor = "#e4e0ff"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button type="button" onClick={() => setShowPw(p => !p)} style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 0,
              }}>{showPw ? "🙈" : "👁️"}</button>
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label style={labelStyle}>CONFIRM PASSWORD</label>
              <input
                style={inputStyle} type="password" placeholder="Re-enter your password"
                value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e => e.target.style.borderColor = "#e4e0ff"}
                autoComplete="new-password"
              />
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "13px", borderRadius: 10, border: "none", marginTop: 4,
            background: loading ? "#c4b5fd" : "linear-gradient(135deg,#7c3aed,#ec4899,#06b6d4)",
            color: "#fff", fontFamily: "Outfit,sans-serif", fontSize: 15, fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 4px 20px rgba(124,58,237,0.35)",
            letterSpacing: "0.01em", transition: "all 0.2s",
          }}>
            {loading ? "⏳ Please wait..." : mode === "login" ? "🔑 Sign In" : "✨ Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#8b72be", fontFamily: "Outfit,sans-serif" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => reset(mode === "login" ? "register" : "login")} style={{
            color: "#7c3aed", fontWeight: 700, cursor: "pointer", textDecoration: "underline",
          }}>
            {mode === "login" ? "Register here" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════════ */
export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [userName, setUserName] = useState(getUser() || "User");
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(getUser() || "User");
  const [mode, setMode] = useState("expenszo"); // "expenszo" | "splitzo"

  const saveName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      sessionStorage.setItem("sw_user", tempName.trim());
    }
    setEditingName(false);
  };

  const fetchExpenses = async () => {
    try {
      const r = await axios.get(API_URL);
      // Sanitize: ensure amount is always a plain number, never a concatenated string
      const cleaned = (r.data || []).map(e => ({
        ...e,
        amount: parseFloat(String(e.amount).replace(/[^0-9.]/g, "")) || 0
      }));
      setExpenses(cleaned);
    }
    catch (e) { console.error("Error fetching expenses", e); }
  };

  useEffect(() => { if (loggedIn) fetchExpenses(); }, [loggedIn]);

  const handleLogout = () => {
    clearSession();
    setLoggedIn(false);
    setExpenses([]);
    setActiveTab("Dashboard");
    setProfileOpen(false);
  };

  const handleLogin = (username) => {
    setUserName(username);
    setTempName(username);
    setLoggedIn(true);
  };

  const NAV = [
    { icon: "📊", label: "Dashboard" },
    { icon: "📋", label: "Expenses" },
    { icon: "📈", label: "Analytics" },
    { icon: "⚙️", label: "Settings" },
    { icon: "👤", label: "Profile" },
  ];

  const titles = {
    Dashboard: { title: "Expense Dashboard", sub: "Overview of your spending" },
    Expenses: { title: "Manage Expenses", sub: "Add, edit and filter transactions" },
    Analytics: { title: "Analytics", sub: "Visualise your spending patterns" },
    Settings: { title: "Settings", sub: "App configuration" },
    Profile: { title: "My Profile", sub: "Manage your account" },
  };

  /* ── Not logged in → show Auth screen ── */
  if (!loggedIn) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-root">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">💸</span>
          <span className="logo-text">{mode === "expenszo" ? "Expenszo" : "Splitzo"}</span>
        </div>

        {/* Mode Switcher */}
        <div style={{
          display: "flex", background: "rgba(167,139,250,0.12)", borderRadius: 10,
          padding: 4, marginBottom: 18, gap: 2
        }}>
          {["expenszo", "splitzo"].map(m => (
            <button key={m} onClick={() => { setMode(m); setActiveTab(m === "splitzo" ? "Dashboard" : "Dashboard"); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{
              flex: 1, padding: "8px 4px", borderRadius: 7, border: "none", cursor: "pointer",
              fontFamily: "Outfit,sans-serif", fontWeight: 800, fontSize: 11,
              background: mode === m ? "linear-gradient(135deg,#7c3aed,#ec4899)" : "transparent",
              color: mode === m ? "#fff" : "#9f7aea",
              boxShadow: mode === m ? "0 2px 8px rgba(124,58,237,0.35)" : "none",
              transition: "all 0.18s", letterSpacing: "0.02em",
            }}>
              {m === "expenszo" ? "💸 Expenszo" : "🤝 Splitzo"}
            </button>
          ))}
        </div>

        <nav className="sidebar-nav">
          {mode === "expenszo" && NAV.map(({ icon, label }) => (
            <div
              key={label}
              className={`nav-item${activeTab === label ? " active" : ""}`}
              onClick={() => { setActiveTab(label); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            >
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
          {mode === "splitzo" && [
            { icon: "📊", label: "Dashboard" },
            { icon: "👥", label: "Groups" },
            { icon: "🤝", label: "Friends" },
            { icon: "⚖️", label: "Balances" },
            { icon: "⚙️", label: "SplitSettings" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className={`nav-item${activeTab === label ? " active" : ""}`}
              onClick={() => { setActiveTab(label); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            >
              <span className="nav-icon">{icon}</span>
              <span>{label === "SplitSettings" ? "Settings" : label}</span>
            </div>
          ))}
        </nav>

        {/* Outside click backdrop for profile popup */}
        {profileOpen && (
          <div onClick={() => setProfileOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 98 }} />
        )}

        <div className="sidebar-footer" onClick={() => setProfileOpen(p => !p)} style={{ cursor: "pointer", position: "relative", zIndex: 99 }} title="My Profile">
          <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div className="user-name">{userName}</div>
            <div className="user-role">Personal Account</div>
          </div>
        </div>

        {/* Profile Popup — fixed position above footer */}
        {profileOpen && (
          <div style={{ position: "fixed", bottom: 80, left: 12, zIndex: 200, animation: "slideUp 0.2s ease" }}>
            <div
              style={{
                background: "#fff", border: "1.5px solid #e4e0ff", borderRadius: 16,
                padding: "20px", width: 232, boxShadow: "0 8px 40px rgba(124,58,237,0.22)"
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Avatar + name */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: "1.5px solid #f0eeff" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff",
                  fontWeight: 900, fontFamily: "Outfit,sans-serif", boxShadow: "0 0 14px rgba(124,58,237,0.35)", flexShrink: 0
                }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  {editingName ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <input autoFocus className="form-control"
                        style={{ padding: "5px 8px", fontSize: 13, width: "100%" }}
                        value={tempName}
                        onChange={e => setTempName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                      />
                      <div style={{ display: "flex", gap: 5 }}>
                        <button onClick={saveName} style={{ flex: 1, padding: "4px", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>Save</button>
                        <button onClick={() => setEditingName(false)} style={{ flex: 1, padding: "4px", borderRadius: 6, border: "1.5px solid #e4e0ff", background: "#fff", color: "#5a3f8a", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#1a0a3c", fontFamily: "Outfit,sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
                      <div style={{ fontSize: 11, color: "#8b72be" }}>Personal Account</div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <button onClick={() => { setTempName(userName); setEditingName(true); }}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #ddd6fe",
                    background: "#f5f0ff", color: "#7c3aed", fontFamily: "Outfit,sans-serif",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left"
                  }}>
                  ✏️ Edit Name
                </button>
                <button onClick={() => { setProfileOpen(false); setMode("expenszo"); setActiveTab("Settings"); }}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e4e0ff",
                    background: "#faf9ff", color: "#5a3f8a", fontFamily: "Outfit,sans-serif",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left"
                  }}>
                  ⚙️ Go to Settings
                </button>
                <button onClick={() => { setProfileOpen(false); handleLogout(); }}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8, border: "none",
                    background: "linear-gradient(135deg,#e11d48,#f97316)", color: "#fff",
                    fontFamily: "Outfit,sans-serif", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", textAlign: "left", boxShadow: "0 3px 12px rgba(225,29,72,0.25)"
                  }}>
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        {mode === "expenszo" ? (
          <>
            <header className="topbar">
              <div>
                <h1 className="page-title">{titles[activeTab].title}</h1>
                <p className="page-subtitle">{titles[activeTab].sub}</p>
              </div>
            </header>
            {activeTab === "Dashboard" && <DashboardTab expenses={expenses} />}
            {activeTab === "Expenses" && <ExpensesTab expenses={expenses} onRefresh={fetchExpenses} />}
            {activeTab === "Analytics" && <AnalyticsTab expenses={expenses} />}
            {activeTab === "Settings" && <SettingsTab onLogout={handleLogout} />}
            {activeTab === "Profile" && <ProfileTab userName={userName} setUserName={setUserName} onLogout={handleLogout} />}
          </>
        ) : (
          <SpliTzo userName={userName} activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
      </main>
    </div>
  );
}