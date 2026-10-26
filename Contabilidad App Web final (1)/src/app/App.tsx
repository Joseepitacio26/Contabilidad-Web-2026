import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase, getUserId } from "../utils/supabase";
import * as api from "../utils/api";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Toaster, toast } from "sonner";
import {
  LayoutDashboard, Briefcase, Users, Settings as SettingsIcon, LogOut,
  Plus, Search, X, Edit2, Trash2, Download, Menu, ArrowLeft, CheckCircle2,
} from "lucide-react";

// ─── Palette ──────────────────────────────────────────────────────────────────
const P = {
  bg1: "#F5EEE0", bg2: "#ECE0C8",
  t1: "#3A2415", t2: "#6B5643",
  br1: "#5B3A28", br2: "#31200F", br3: "#22150B",
  g1: "#C99A2E", g2: "#E7C468", g3: "#F4E4B8",
  s1: "#5F7A54", s2: "#E6EDDF",
  o1: "#B04F35", o2: "#F5DFD5",
  ln: "#DDCBA6",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = "dashboard" | "trabajos" | "empleados" | "ajustes";
type Status = "Activo" | "Completado" | "Cancelado";
type JobTab = "general" | "nomina" | "gasolina" | "material" | "otros" | "resumen";

interface Employee { id: number; name: string; rate: number; phone: string; notes: string; }
interface PayrollEntry { employeeId: number; hours: number; }
interface MaterialEntry { name: string; qty: number; price: number; unit: string; }
interface GasolineEntry { vehicle: string; days: number; dailyRate: number; }
interface OtherItem { desc: string; amount: number; }

interface Job {
  id: number; name: string; client: string; address: string;
  phone: string; startDate: string; endDate: string; status: Status;
  baseIncome: number; notes: string;
  payroll: PayrollEntry[]; gasoline: GasolineEntry[];
  materials: MaterialEntry[]; basura: number;
  otherExpenses: OtherItem[]; otherIncome: OtherItem[];
}

interface AppSettings {
  companyName: string;
  insuranceRate: number; taxRate: number;
  companyFee: number; utilityFee: number;
  vehicles: string[];
  materialCatalog: { name: string; unit: string; price: number }[];
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const INIT_EMPLOYEES: Employee[] = [
  { id: 1, name: "Juan Pérez",    rate: 22, phone: "(555) 123-4567", notes: "Encargado de cuadrilla" },
  { id: 2, name: "María García",  rate: 18, phone: "(555) 234-5678", notes: "" },
  { id: 3, name: "Carlos Soto",   rate: 20, phone: "(555) 345-6789", notes: "Especialista en tejas" },
  { id: 4, name: "Roberto Díaz",  rate: 25, phone: "(555) 456-7890", notes: "Operador de equipo" },
  { id: 5, name: "Ana López",     rate: 16, phone: "(555) 567-8901", notes: "" },
];

const INIT_JOBS: Job[] = [
  {
    id: 1, name: "Casa García", client: "Juan García", address: "123 Calle Roble, San José",
    phone: "(555) 111-2222", startDate: "2024-06-01", endDate: "2024-06-15", status: "Completado",
    baseIncome: 18000, notes: "Reparación completa de techo de tejas arquitectónicas",
    payroll: [{ employeeId: 1, hours: 40 }, { employeeId: 3, hours: 35 }, { employeeId: 2, hours: 30 }],
    gasoline: [{ vehicle: "Camión F-250", days: 12, dailyRate: 45 }],
    materials: [
      { name: "Tejas asfalto", qty: 25, price: 180, unit: "sq" },
      { name: "Underlayment", qty: 25, price: 35, unit: "sq" },
      { name: "Clavos galvanizados", qty: 10, price: 28, unit: "caja" },
    ],
    basura: 350, otherExpenses: [], otherIncome: [],
  },
  {
    id: 2, name: "Almacén López", client: "Carlos López", address: "456 Av. Industrial, Heredia",
    phone: "(555) 222-3333", startDate: "2024-07-10", endDate: "", status: "Activo",
    baseIncome: 35000, notes: "Techo metálico nave industrial — 4,500 sq ft",
    payroll: [
      { employeeId: 1, hours: 60 }, { employeeId: 4, hours: 55 },
      { employeeId: 3, hours: 50 }, { employeeId: 5, hours: 40 },
    ],
    gasoline: [
      { vehicle: "Camión F-250", days: 18, dailyRate: 45 },
      { vehicle: "Pickup Silverado", days: 12, dailyRate: 38 },
    ],
    materials: [
      { name: "Panel metálico 26g", qty: 120, price: 95, unit: "pc" },
      { name: "Tornillos TEK", qty: 20, price: 22, unit: "caja" },
      { name: "Flashing aluminio", qty: 80, price: 12, unit: "ft" },
      { name: "Silicón industrial", qty: 15, price: 18, unit: "tubo" },
    ],
    basura: 650, otherExpenses: [{ desc: "Renta de andamio", amount: 800 }], otherIncome: [],
  },
  {
    id: 3, name: "Residencial Torres", client: "Luis Torres", address: "789 Urb. Las Palmas, Alajuela",
    phone: "(555) 333-4444", startDate: "2024-05-20", endDate: "2024-06-10", status: "Completado",
    baseIncome: 22000, notes: "Instalación nueva en casa de dos pisos",
    payroll: [{ employeeId: 1, hours: 45 }, { employeeId: 2, hours: 40 }, { employeeId: 5, hours: 35 }],
    gasoline: [{ vehicle: "Camión F-250", days: 14, dailyRate: 45 }],
    materials: [
      { name: "Tejas architectural", qty: 30, price: 220, unit: "sq" },
      { name: "Underlayment sintético", qty: 30, price: 42, unit: "sq" },
      { name: "Ridge cap", qty: 5, price: 65, unit: "bundle" },
    ],
    basura: 420, otherExpenses: [], otherIncome: [{ desc: "Trabajo extra gotera", amount: 800 }],
  },
  {
    id: 4, name: "Oficinas Norte", client: "Constructora Norte S.A.", address: "321 Zona Franca, Heredia",
    phone: "(555) 444-5555", startDate: "2024-08-01", endDate: "", status: "Activo",
    baseIncome: 45000, notes: "Membrana EPDM en edificio comercial 3 plantas",
    payroll: [{ employeeId: 1, hours: 30 }, { employeeId: 4, hours: 25 }],
    gasoline: [{ vehicle: "Camión F-250", days: 8, dailyRate: 45 }],
    materials: [{ name: "Membrana EPDM", qty: 60, price: 180, unit: "sq" }],
    basura: 200, otherExpenses: [], otherIncome: [],
  },
  {
    id: 5, name: "Casa Rodríguez", client: "Ana Rodríguez", address: "555 Calle Cedro, Cartago",
    phone: "(555) 555-6666", startDate: "2024-06-25", endDate: "2024-06-26", status: "Cancelado",
    baseIncome: 0, notes: "Cancelado — no hubo acuerdo en precio final",
    payroll: [], gasoline: [], materials: [],
    basura: 0, otherExpenses: [{ desc: "Viáticos visita", amount: 150 }], otherIncome: [],
  },
  {
    id: 6, name: "Nave Sanz", client: "Roberto Sanz", address: "900 Parque Industrial Este",
    phone: "(555) 666-7777", startDate: "2024-07-28", endDate: "2024-08-20", status: "Completado",
    baseIncome: 28500, notes: "Reparación y sellado de techo metálico existente",
    payroll: [{ employeeId: 2, hours: 38 }, { employeeId: 3, hours: 42 }, { employeeId: 4, hours: 40 }],
    gasoline: [{ vehicle: "Pickup Silverado", days: 16, dailyRate: 38 }],
    materials: [
      { name: "Sealant elastomérico", qty: 30, price: 55, unit: "gal" },
      { name: "Malla fibra de vidrio", qty: 20, price: 28, unit: "rollo" },
      { name: "Pintura reflectiva", qty: 15, price: 75, unit: "gal" },
    ],
    basura: 280, otherExpenses: [], otherIncome: [],
  },
];

const INIT_SETTINGS: AppSettings = {
  companyName: "SD Techado & Construcción",
  insuranceRate: 12, taxRate: 13, companyFee: 15, utilityFee: 5,
  vehicles: ["Camión F-250", "Pickup Silverado", "Van de Trabajo"],
  materialCatalog: [
    { name: "Tejas asfalto 3-tab", unit: "sq", price: 155 },
    { name: "Tejas architectural", unit: "sq", price: 220 },
    { name: "Underlayment 15lb", unit: "sq", price: 28 },
    { name: "Panel metálico 26g", unit: "pc", price: 95 },
    { name: "Flashing aluminio", unit: "ft", price: 12 },
    { name: "Membrana EPDM", unit: "sq", price: 180 },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcJob(job: Job, emps: Employee[], s: AppSettings) {
  const payBase = job.payroll.reduce((a, p) => {
    const e = emps.find(x => x.id === p.employeeId);
    return e ? a + p.hours * e.rate : a;
  }, 0);
  const insurance = payBase * (s.insuranceRate / 100);
  const nomina = payBase + insurance;
  const gasoline = job.gasoline.reduce((a, g) => a + g.days * g.dailyRate, 0);
  const materials = job.materials.reduce((a, m) => a + m.qty * m.price, 0);
  const { basura } = job;
  const otherExp = job.otherExpenses.reduce((a, e) => a + e.amount, 0);
  const otherInc = job.otherIncome.reduce((a, i) => a + i.amount, 0);
  const totalExp = nomina + gasoline + materials + basura + otherExp;
  const totalInc = job.baseIncome + otherInc;
  const grossProfit = totalInc - totalExp;
  const taxes = Math.max(0, grossProfit * (s.taxRate / 100));
  const companyFee = Math.max(0, grossProfit * (s.companyFee / 100));
  const utilityFee = Math.max(0, grossProfit * (s.utilityFee / 100));
  const netProfit = grossProfit - taxes - companyFee - utilityFee;
  const margin = totalInc > 0 ? (netProfit / totalInc) * 100 : 0;
  return { payBase, insurance, nomina, gasoline, materials, basura, otherExp, otherInc, totalExp, totalInc, grossProfit, taxes, companyFee, utilityFee, netProfit, margin };
}

const fmt = (n: number) =>
  "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtS = (n: number) => (n < 0 ? "-" : "") + fmt(n);

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Badge({ status }: { status: Status }) {
  const cfg = {
    Activo:     { bg: P.s2, color: P.s1, border: P.s1 + "55" },
    Completado: { bg: P.g3, color: P.br2, border: P.g1 + "66" },
    Cancelado:  { bg: P.o2, color: P.o1, border: P.o1 + "55" },
  }[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-mono border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
    >
      {status}
    </span>
  );
}

function Btn({
  children, variant = "primary", onClick, className = "", type = "button", disabled = false,
}: {
  children: React.ReactNode; variant?: "primary" | "gold" | "ghost" | "danger";
  onClick?: () => void; className?: string; type?: "button" | "submit"; disabled?: boolean;
}) {
  const v = {
    primary: { bg: P.br1, color: P.g3, border: P.br1 },
    gold:    { bg: P.g1,  color: P.br2, border: P.g1 },
    ghost:   { bg: "transparent", color: P.t1, border: P.ln },
    danger:  { bg: P.o1,  color: "#fff", border: P.o1 },
  }[variant];
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-opacity hover:opacity-80 disabled:opacity-40 ${className}`}
      style={{ background: v.bg, color: v.color, borderColor: v.border }}
    >
      {children}
    </button>
  );
}

function FInput({
  label, value, onChange, type = "text", placeholder = "", className = "",
}: {
  label?: string; value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs font-medium" style={{ color: P.t2 }}>{label}</label>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-1.5 rounded-md text-sm outline-none transition-colors"
        style={{
          background: P.bg1, color: P.t1,
          border: `1px solid ${P.ln}`,
          fontFamily: type === "number" ? "'IBM Plex Mono', monospace" : undefined,
        }}
        onFocus={e => (e.target.style.borderColor = P.g1)}
        onBlur={e => (e.target.style.borderColor = P.ln)}
      />
    </div>
  );
}

function FTextarea({ label, value, onChange, rows = 3 }: {
  label?: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium" style={{ color: P.t2 }}>{label}</label>}
      <textarea
        value={value} onChange={e => onChange(e.target.value)} rows={rows}
        className="px-3 py-1.5 rounded-md text-sm outline-none transition-colors resize-none"
        style={{ background: P.bg1, color: P.t1, border: `1px solid ${P.ln}` }}
        onFocus={e => (e.target.style.borderColor = P.g1)}
        onBlur={e => (e.target.style.borderColor = P.ln)}
      />
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg p-4 ${className}`} style={{ background: P.bg2, border: `1px solid ${P.ln}` }}>
      {children}
    </div>
  );
}

// ─── Summary Row (used inside Job Modal) ─────────────────────────────────────
function SRow({ label, value, bold, gold, red, light, big, isPercent }: {
  label: string; value: number; bold?: boolean; gold?: boolean; red?: boolean;
  light?: boolean; big?: boolean; isPercent?: boolean;
}) {
  const color = big ? P.g2 : gold ? P.g1 : red ? P.o1 : light ? P.g3 : P.t1;
  return (
    <div className={`flex justify-between items-center ${big ? "text-base" : "text-sm"}`}>
      <span style={{ color: light ? P.g3 + "99" : P.t2 }}>{label}</span>
      <span className={`font-mono ${bold ? "font-bold" : "font-medium"}`} style={{ color }}>
        {isPercent ? `${value.toFixed(1)}%` : value < 0 ? `-${fmt(Math.abs(value))}` : fmt(value)}
      </span>
    </div>
  );
}

// ─── Modal Wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide = false }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(34,21,11,0.65)" }}
    >
      <div
        className={`relative flex flex-col w-full ${wide ? "sm:max-w-4xl" : "sm:max-w-lg"} max-h-[92vh] rounded-t-2xl sm:rounded-xl overflow-hidden`}
        style={{ background: P.bg1, border: `1px solid ${P.ln}` }}
      >
        <div
          className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          style={{ borderColor: P.ln, background: P.bg2 }}
        >
          <h2 className="text-sm font-semibold font-serif" style={{ color: P.t1 }}>{title}</h2>
          <button onClick={onClose} className="p-1 rounded transition-opacity hover:opacity-60" style={{ color: P.t2 }}>
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
type AuthView = "login" | "register" | "forgot" | "forgot-sent";

function AuthLogo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center border-2"
        style={{ background: P.br3, borderColor: P.g1 }}
      >
        <span className="text-xl font-bold font-serif" style={{ color: P.g2 }}>SD</span>
      </div>
      <div className="text-center">
        <p className="text-xs tracking-widest uppercase font-medium" style={{ color: P.g1 }}>Control de Gastos</p>
        <h1 className="text-base font-semibold font-serif" style={{ color: P.t1 }}>Techado</h1>
      </div>
    </div>
  );
}

function AuthInput({
  label, type = "text", value, onChange, placeholder,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: P.t2 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-2 rounded-md text-sm outline-none transition-colors"
        style={{ background: P.bg1, color: P.t1, border: `1px solid ${P.ln}` }}
        onFocus={e => (e.target.style.borderColor = P.g1)}
        onBlur={e => (e.target.style.borderColor = P.ln)}
      />
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [view, setView] = useState<AuthView>("login");
  const [busy, setBusy] = useState(false);

  // login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // forgot fields
  const [forgotEmail, setForgotEmail] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail || !loginPass) { toast.error("Completa todos los campos"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    // onLogin is called by the auth listener in App
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regName || !regEmail || !regPass) { toast.error("Completa todos los campos"); return; }
    if (regPass !== regConfirm) { toast.error("Las contraseñas no coinciden"); return; }
    if (regPass.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPass,
      options: { data: { full_name: regName } },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Cuenta creada — Bienvenido, ${regName}`);
    // session is created automatically; auth listener fires onLogin
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail) { toast.error("Ingresa tu correo electrónico"); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setView("forgot-sent");
  }

  const bgGrid = {
    backgroundImage: `repeating-linear-gradient(0deg,${P.br1}18 0,${P.br1}18 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,${P.br1}18 0,${P.br1}18 1px,transparent 1px,transparent 48px)`,
  };

  const submitBtn = (label: string) => (
    <button
      type="submit"
      disabled={busy}
      className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85 active:opacity-75 disabled:opacity-50"
      style={{ background: P.br1, color: P.g3 }}
    >
      {busy ? "Cargando…" : label}
    </button>
  );

  const linkBtn = (label: string, onClick: () => void) => (
    <button
      type="button" onClick={onClick}
      className="text-xs font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
      style={{ color: P.g1 }}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: P.bg1 }}>
      <div className="absolute inset-0 pointer-events-none" style={bgGrid} />

      <div className="relative w-full max-w-sm">

        {/* ── LOGIN ── */}
        {view === "login" && (
          <form onSubmit={handleLogin} className="rounded-2xl p-8 space-y-5 shadow-xl"
            style={{ background: P.bg2, border: `1px solid ${P.ln}` }}>
            <AuthLogo />
            <div className="space-y-3">
              <AuthInput label="Correo electrónico" type="email" value={loginEmail} onChange={setLoginEmail} placeholder="correo@empresa.com" />
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ color: P.t2 }}>Contraseña</label>
                  {linkBtn("¿Olvidaste tu contraseña?", () => setView("forgot"))}
                </div>
                <input
                  type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  className="px-3 py-2 rounded-md text-sm outline-none transition-colors"
                  style={{ background: P.bg1, color: P.t1, border: `1px solid ${P.ln}` }}
                  onFocus={e => (e.target.style.borderColor = P.g1)}
                  onBlur={e => (e.target.style.borderColor = P.ln)}
                />
              </div>
            </div>
            {submitBtn("Iniciar Sesión")}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <span className="text-xs" style={{ color: P.t2 }}>¿No tienes cuenta?</span>
              {linkBtn("Crear cuenta", () => setView("register"))}
            </div>
            <p className="text-center text-xs" style={{ color: P.t2 }}>SD Techado & Construcción · v2.4</p>
          </form>
        )}

        {/* ── REGISTER ── */}
        {view === "register" && (
          <form onSubmit={handleRegister} className="rounded-2xl p-8 space-y-4 shadow-xl"
            style={{ background: P.bg2, border: `1px solid ${P.ln}` }}>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setView("login")}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
                style={{ color: P.t2, background: P.bg1, border: `1px solid ${P.ln}` }}>
                <ArrowLeft size={14} />
              </button>
              <div>
                <h2 className="text-sm font-semibold font-serif" style={{ color: P.t1 }}>Crear cuenta</h2>
                <p className="text-xs" style={{ color: P.t2 }}>SD Techado & Construcción</p>
              </div>
            </div>

            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
              style={{ background: P.g3 + "88", border: `1px solid ${P.g1}44`, color: P.br2 }}
            >
              <span>💼</span>
              <span>Se creará una cuenta de empresa. Podrás agregar más usuarios después.</span>
            </div>

            <div className="space-y-3">
              <AuthInput label="Tu nombre completo" value={regName} onChange={setRegName} placeholder="Juan García" />
              <AuthInput label="Correo electrónico" type="email" value={regEmail} onChange={setRegEmail} placeholder="correo@empresa.com" />
              <div className="grid grid-cols-2 gap-2">
                <AuthInput label="Contraseña" type="password" value={regPass} onChange={setRegPass} placeholder="Mín. 8 caracteres" />
                <AuthInput label="Confirmar contraseña" type="password" value={regConfirm} onChange={setRegConfirm} placeholder="Repetir" />
              </div>
            </div>

            {submitBtn("Crear cuenta")}

            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs" style={{ color: P.t2 }}>¿Ya tienes cuenta?</span>
              {linkBtn("Iniciar sesión", () => setView("login"))}
            </div>
          </form>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {view === "forgot" && (
          <form onSubmit={handleForgot} className="rounded-2xl p-8 space-y-5 shadow-xl"
            style={{ background: P.bg2, border: `1px solid ${P.ln}` }}>
            <div className="flex items-center gap-3 mb-1">
              <button type="button" onClick={() => setView("login")}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
                style={{ color: P.t2, background: P.bg1, border: `1px solid ${P.ln}` }}>
                <ArrowLeft size={14} />
              </button>
              <div>
                <h2 className="text-sm font-semibold font-serif" style={{ color: P.t1 }}>Recuperar contraseña</h2>
                <p className="text-xs" style={{ color: P.t2 }}>Te enviaremos instrucciones por correo</p>
              </div>
            </div>

            <AuthInput
              label="Correo electrónico de tu cuenta"
              type="email" value={forgotEmail} onChange={setForgotEmail}
              placeholder="correo@empresa.com"
            />

            {submitBtn("Enviar instrucciones")}

            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs" style={{ color: P.t2 }}>¿Recordaste tu contraseña?</span>
              {linkBtn("Iniciar sesión", () => setView("login"))}
            </div>
          </form>
        )}

        {/* ── FORGOT SENT CONFIRMATION ── */}
        {view === "forgot-sent" && (
          <div className="rounded-2xl p-8 space-y-5 shadow-xl text-center"
            style={{ background: P.bg2, border: `1px solid ${P.ln}` }}>
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: P.s2, border: `2px solid ${P.s1}` }}
              >
                <CheckCircle2 size={28} style={{ color: P.s1 }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold font-serif mb-1" style={{ color: P.t1 }}>Revisa tu correo</h2>
                <p className="text-xs leading-relaxed" style={{ color: P.t2 }}>
                  Enviamos las instrucciones de recuperación a
                </p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: P.g1 }}>{forgotEmail}</p>
              </div>
            </div>

            <div
              className="rounded-lg px-4 py-3 text-xs leading-relaxed text-left space-y-1"
              style={{ background: P.bg1, border: `1px solid ${P.ln}`, color: P.t2 }}
            >
              <p>1. Abre el correo enviado desde <span style={{ color: P.t1 }}>noreply@sdtechado.com</span></p>
              <p>2. Haz clic en el enlace <span style={{ color: P.t1 }}>"Restablecer contraseña"</span></p>
              <p>3. El enlace expira en <span style={{ color: P.t1 }}>30 minutos</span></p>
            </div>

            <p className="text-xs" style={{ color: P.t2 }}>
              ¿No llegó el correo?{" "}
              <button
                type="button"
                onClick={() => { setForgotEmail(""); setView("forgot"); }}
                className="font-medium underline underline-offset-2 hover:opacity-70 transition-opacity"
                style={{ color: P.g1 }}
              >
                Intentar de nuevo
              </button>
            </p>

            <button
              type="button" onClick={() => setView("login")}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85"
              style={{ background: P.br1, color: P.g3 }}
            >
              Volver al inicio de sesión
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { id: "trabajos",   label: "Trabajos",   icon: Briefcase },
  { id: "empleados",  label: "Empleados",  icon: Users },
  { id: "ajustes",    label: "Ajustes",    icon: SettingsIcon },
] as const;

function Sidebar({ screen, setScreen, onLogout, companyName, onClose }: {
  screen: Screen; setScreen: (s: Screen) => void;
  onLogout: () => void; companyName: string; onClose?: () => void;
}) {
  return (
    <aside className="flex flex-col h-full w-56" style={{ background: P.br2, borderRight: `1px solid ${P.br1}` }}>
      <div className="flex items-center gap-2.5 px-4 py-4 border-b" style={{ borderColor: P.br1 }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0"
          style={{ background: P.br3, borderColor: P.g1 }}>
          <span className="text-xs font-bold font-serif" style={{ color: P.g2 }}>SD</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate leading-tight" style={{ color: P.g3 }}>{companyName}</p>
          <p className="text-xs leading-tight" style={{ color: P.t2 }}>Sistema Contable</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="flex-shrink-0 hover:opacity-60 transition-opacity" style={{ color: P.t2 }}>
            <X size={14} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = screen === id;
          return (
            <button
              key={id}
              onClick={() => { setScreen(id); onClose?.(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ background: active ? P.br1 : "transparent", color: active ? P.g3 : P.t2 }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = P.br1 + "44"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="px-2 pb-4">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:opacity-70 transition-opacity"
          style={{ color: P.t2 }}
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardPage({ jobs, employees, settings }: { jobs: Job[]; employees: Employee[]; settings: AppSettings }) {
  const { totals, donutData, barData, payrollByEmp, recentJobs } = useMemo(() => {
    const calcs = jobs.map(j => ({ job: j, ...calcJob(j, employees, settings) }));
    const totalInc = calcs.reduce((a, c) => a + c.totalInc, 0);
    const totalExp = calcs.reduce((a, c) => a + c.totalExp, 0);
    const netProfit = calcs.reduce((a, c) => a + c.netProfit, 0);
    const margin = totalInc > 0 ? (netProfit / totalInc) * 100 : 0;
    const totals = {
      totalInc, totalExp, netProfit, margin,
      nomina:    calcs.reduce((a, c) => a + c.payBase, 0),
      insurance: calcs.reduce((a, c) => a + c.insurance, 0),
      gasoline:  calcs.reduce((a, c) => a + c.gasoline, 0),
      materials: calcs.reduce((a, c) => a + c.materials, 0),
      basura:    calcs.reduce((a, c) => a + c.basura, 0),
      otros:     calcs.reduce((a, c) => a + c.otherExp, 0),
    };

    const donutData = [
      { name: "Nómina",    value: totals.nomina,    color: P.br1 },
      { name: "Aseguranza",value: totals.insurance, color: P.g1 },
      { name: "Gasolina",  value: totals.gasoline,  color: P.o1 },
      { name: "Material",  value: totals.materials, color: P.s1 },
      { name: "Basura",    value: totals.basura,    color: P.t2 },
      { name: "Otros",     value: totals.otros,     color: P.g2 },
    ].filter(d => d.value > 0);

    const barData = calcs
      .filter(c => c.totalInc > 0)
      .map(c => ({ name: c.job.name.split(" ")[0] + (c.job.name.split(" ")[1] ? " " + c.job.name.split(" ")[1] : ""), ganancia: Math.max(0, c.netProfit) }))
      .sort((a, b) => b.ganancia - a.ganancia);

    const empHoursMap = new Map<number, number>();
    jobs.forEach(job => {
      job.payroll.forEach(p => {
        const e = employees.find(x => x.id === p.employeeId);
        if (e) empHoursMap.set(p.employeeId, (empHoursMap.get(p.employeeId) || 0) + p.hours * e.rate);
      });
    });
    const payrollByEmp = employees
      .map(e => ({ emp: e, total: empHoursMap.get(e.id) || 0 }))
      .filter(x => x.total > 0)
      .sort((a, b) => b.total - a.total);

    const recentJobs = [...calcs].sort((a, b) => b.job.id - a.job.id).slice(0, 5);
    return { totals, donutData, barData, payrollByEmp, recentJobs };
  }, [jobs, employees, settings]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold font-serif" style={{ color: P.t1 }}>Dashboard</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Ingresos Totales", value: fmt(totals.totalInc), sub: `${jobs.length} trabajos` },
          { label: "Gastos Totales",   value: fmt(totals.totalExp), sub: "nómina + otros" },
          { label: "Ganancia Neta",    value: fmtS(totals.netProfit), sub: totals.netProfit >= 0 ? "▲ positivo" : "▼ negativo", pos: totals.netProfit >= 0 },
          { label: "Margen Neto",      value: `${totals.margin.toFixed(1)}%`, sub: `sobre ${fmt(totals.totalInc)}`, pos: totals.margin >= 0 },
        ].map(c => (
          <div key={c.label} className="rounded-lg p-4 flex flex-col gap-1.5" style={{ background: P.bg2, border: `1px solid ${P.ln}` }}>
            <p className="text-xs" style={{ color: P.t2 }}>{c.label}</p>
            <p className="text-xl font-bold font-mono" style={{ color: P.t1 }}>{c.value}</p>
            <p className="text-xs font-mono" style={{ color: c.pos === undefined ? P.t2 : c.pos ? P.s1 : P.o1 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold font-serif mb-4" style={{ color: P.t1 }}>Gastos por Categoría</h3>
          <div className="flex items-center gap-5">
            <div className="flex-shrink-0">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" strokeWidth={0}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmt(v)]}
                    contentStyle={{ background: P.br3, border: `1px solid ${P.br1}`, borderRadius: "6px", color: P.g3, fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {donutData.map(d => (
                <div key={d.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs" style={{ color: P.t2 }}>{d.name}</span>
                  </div>
                  <span className="text-xs font-mono font-medium" style={{ color: P.t1 }}>{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold font-serif mb-4" style={{ color: P.t1 }}>Ganancia Neta por Trabajo</h3>
          <ResponsiveContainer width="100%" height={155}>
            <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 24, top: 0, bottom: 0 }}>
              <XAxis
                type="number" tick={{ fontSize: 10, fill: P.t2, fontFamily: "IBM Plex Mono" }}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                axisLine={false} tickLine={false}
              />
              <YAxis
                type="category" dataKey="name"
                tick={{ fontSize: 10, fill: P.t2 }} width={80}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                formatter={(v: number) => [fmt(v), "Ganancia"]}
                contentStyle={{ background: P.br3, border: `1px solid ${P.br1}`, borderRadius: "6px", color: P.g3, fontSize: "12px" }}
              />
              <Bar dataKey="ganancia" fill={P.s1} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent jobs */}
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${P.ln}` }}>
        <div className="px-4 py-3 border-b" style={{ background: P.bg2, borderColor: P.ln }}>
          <h3 className="text-sm font-semibold font-serif" style={{ color: P.t1 }}>Trabajos Recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr style={{ background: P.bg2, borderBottom: `1px solid ${P.ln}` }}>
                {["Trabajo", "Cliente", "Estado", "Ingresos", "Gastos", "Ganancia"].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: P.t2 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentJobs.map(({ job, totalInc, totalExp, netProfit }, i) => (
                <tr key={job.id} style={{ background: i % 2 === 0 ? P.bg1 : P.bg2, borderBottom: `1px solid ${P.ln}` }}>
                  <td className="px-4 py-2.5 font-medium text-sm" style={{ color: P.t1 }}>{job.name}</td>
                  <td className="px-4 py-2.5 text-sm" style={{ color: P.t2 }}>{job.client}</td>
                  <td className="px-4 py-2.5"><Badge status={job.status} /></td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: P.t1 }}>{fmt(totalInc)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: P.o1 }}>{fmt(totalExp)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold" style={{ color: netProfit >= 0 ? P.s1 : P.o1 }}>
                    {fmtS(netProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payroll table */}
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${P.ln}` }}>
        <div className="px-4 py-3 border-b" style={{ background: P.bg2, borderColor: P.ln }}>
          <h3 className="text-sm font-semibold font-serif" style={{ color: P.t1 }}>Nómina Acumulada</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: P.bg2, borderBottom: `1px solid ${P.ln}` }}>
              {["Empleado", "Tarifa/hr", "Total Ganado"].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: P.t2 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payrollByEmp.map(({ emp, total }, i) => (
              <tr key={emp.id} style={{ background: i % 2 === 0 ? P.bg1 : P.bg2, borderBottom: `1px solid ${P.ln}` }}>
                <td className="px-4 py-2.5 font-medium" style={{ color: P.t1 }}>{emp.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs" style={{ color: P.t2 }}>${emp.rate}/hr</td>
                <td className="px-4 py-2.5 font-mono text-xs font-semibold" style={{ color: P.s1 }}>{fmt(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Jobs Page ────────────────────────────────────────────────────────────────
function JobsPage({ jobs, employees, settings, onNew, onEdit }: {
  jobs: Job[]; employees: Employee[]; settings: AppSettings;
  onNew: () => void; onEdit: (j: Job) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"Todos" | Status>("Todos");

  const filtered = useMemo(() =>
    jobs.filter(j => {
      const ok = j.name.toLowerCase().includes(search.toLowerCase()) ||
        j.client.toLowerCase().includes(search.toLowerCase());
      return ok && (filter === "Todos" || j.status === filter);
    }), [jobs, search, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold font-serif" style={{ color: P.t1 }}>Trabajos</h1>
        <Btn variant="gold" onClick={onNew}><Plus size={13} /> Nuevo trabajo</Btn>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.t2 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar trabajo o cliente…"
            className="w-full pl-8 pr-3 py-1.5 rounded-md text-sm outline-none"
            style={{ background: P.bg2, color: P.t1, border: `1px solid ${P.ln}` }}
          />
        </div>
        <div className="flex gap-1.5">
          {(["Todos", "Activo", "Completado", "Cancelado"] as const).map(s => (
            <button
              key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors"
              style={{
                background: filter === s ? P.br1 : P.bg2,
                color: filter === s ? P.g3 : P.t2,
                borderColor: filter === s ? P.br1 : P.ln,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(job => {
          const c = calcJob(job, employees, settings);
          return (
            <button
              key={job.id} onClick={() => onEdit(job)}
              className="text-left rounded-xl p-4 space-y-3 transition-all hover:shadow-md group"
              style={{ background: P.bg2, border: `1px solid ${P.ln}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm group-hover:opacity-80 transition-opacity" style={{ color: P.t1 }}>{job.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: P.t2 }}>{job.client}</p>
                </div>
                <Badge status={job.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2.5 border-t" style={{ borderColor: P.ln }}>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: P.t2 }}>Ingresos</p>
                  <p className="text-sm font-mono font-semibold" style={{ color: P.t1 }}>{fmt(c.totalInc)}</p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: P.t2 }}>Gastos</p>
                  <p className="text-sm font-mono font-semibold" style={{ color: P.o1 }}>{fmt(c.totalExp)}</p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: P.t2 }}>Ganancia</p>
                  <p className="text-sm font-mono font-semibold" style={{ color: c.netProfit >= 0 ? P.s1 : P.o1 }}>{fmtS(c.netProfit)}</p>
                </div>
              </div>
              {job.startDate && (
                <p className="text-xs" style={{ color: P.t2 }}>
                  {job.startDate}{job.endDate ? ` → ${job.endDate}` : " → en curso"}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 flex flex-col items-center gap-3" style={{ color: P.t2 }}>
          <Briefcase size={36} className="opacity-30" />
          <p className="text-sm">No se encontraron trabajos</p>
        </div>
      )}
    </div>
  );
}

// ─── Employees Page ────────────────────────────────────────────────────────────
function EmployeesPage({ employees, jobs, onNew, onEdit, onDelete }: {
  employees: Employee[]; jobs: Job[];
  onNew: () => void; onEdit: (e: Employee) => void; onDelete: (id: number) => void;
}) {
  const earnings = useMemo(() => {
    const m = new Map<number, number>();
    jobs.forEach(job => {
      job.payroll.forEach(p => {
        const e = employees.find(x => x.id === p.employeeId);
        if (e) m.set(p.employeeId, (m.get(p.employeeId) || 0) + p.hours * e.rate);
      });
    });
    return m;
  }, [jobs, employees]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold font-serif" style={{ color: P.t1 }}>Empleados</h1>
        <Btn variant="gold" onClick={onNew}><Plus size={13} /> Nuevo empleado</Btn>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${P.ln}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr style={{ background: P.bg2, borderBottom: `1px solid ${P.ln}` }}>
                {["Nombre", "Tarifa/hr", "Teléfono", "Total Ganado", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: P.t2 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => (
                <tr key={emp.id} style={{ background: i % 2 === 0 ? P.bg1 : P.bg2, borderBottom: `1px solid ${P.ln}` }}>
                  <td className="px-4 py-3 font-medium" style={{ color: P.t1 }}>{emp.name}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: P.t2 }}>${emp.rate}/hr</td>
                  <td className="px-4 py-3 text-xs" style={{ color: P.t2 }}>{emp.phone}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: P.s1 }}>
                    {fmt(earnings.get(emp.id) || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onEdit(emp)} className="p-1.5 rounded hover:opacity-60 transition-opacity" style={{ color: P.g1 }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => onDelete(emp.id)} className="p-1.5 rounded hover:opacity-60 transition-opacity" style={{ color: P.o1 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Page ─────────────────────────────────────────────────────────────
function SettingsPage({ settings, onSave }: { settings: AppSettings; onSave: (s: AppSettings) => void }) {
  const [s, setS] = useState<AppSettings>({ ...settings, vehicles: [...settings.vehicles], materialCatalog: settings.materialCatalog.map(m => ({ ...m })) });
  const [newV, setNewV] = useState("");
  const [newM, setNewM] = useState({ name: "", unit: "", price: "" });

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-serif" style={{ color: P.t1 }}>Ajustes</h1>
        <Btn onClick={() => { onSave(s); toast.success("Ajustes guardados"); }}>Guardar cambios</Btn>
      </div>

      <Card>
        <h3 className="text-sm font-semibold font-serif mb-3" style={{ color: P.t1 }}>Empresa</h3>
        <FInput label="Nombre de la compañía" value={s.companyName} onChange={v => setS({ ...s, companyName: v })} />
      </Card>

      <Card>
        <h3 className="text-sm font-semibold font-serif mb-3" style={{ color: P.t1 }}>Tasas</h3>
        <div className="grid grid-cols-2 gap-3">
          <FInput label="Aseguranza (% sobre nómina)" type="number" value={s.insuranceRate} onChange={v => setS({ ...s, insuranceRate: parseFloat(v) || 0 })} />
          <FInput label="Impuestos (% sobre ganancia)" type="number" value={s.taxRate} onChange={v => setS({ ...s, taxRate: parseFloat(v) || 0 })} />
          <FInput label="Comisión compañía (%)" type="number" value={s.companyFee} onChange={v => setS({ ...s, companyFee: parseFloat(v) || 0 })} />
          <FInput label="Utilidades (%)" type="number" value={s.utilityFee} onChange={v => setS({ ...s, utilityFee: parseFloat(v) || 0 })} />
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold font-serif mb-3" style={{ color: P.t1 }}>Vehículos</h3>
        <div className="space-y-2">
          {s.vehicles.map((v, i) => (
            <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md"
              style={{ background: P.bg1, border: `1px solid ${P.ln}` }}>
              <span className="text-sm" style={{ color: P.t1 }}>{v}</span>
              <button onClick={() => setS({ ...s, vehicles: s.vehicles.filter((_, j) => j !== i) })}
                className="hover:opacity-60 transition-opacity" style={{ color: P.o1 }}>
                <X size={13} />
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <input value={newV} onChange={e => setNewV(e.target.value)} placeholder="Agregar vehículo…"
              className="flex-1 px-3 py-1.5 rounded-md text-sm outline-none"
              style={{ background: P.bg1, color: P.t1, border: `1px solid ${P.ln}` }} />
            <Btn variant="ghost" onClick={() => { if (newV.trim()) { setS({ ...s, vehicles: [...s.vehicles, newV.trim()] }); setNewV(""); } }}>
              <Plus size={13} />
            </Btn>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold font-serif mb-3" style={{ color: P.t1 }}>Catálogo de Materiales</h3>
        <div className="space-y-2">
          {s.materialCatalog.map((m, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-md"
              style={{ background: P.bg1, border: `1px solid ${P.ln}` }}>
              <span className="flex-1 text-sm" style={{ color: P.t1 }}>{m.name}</span>
              <span className="text-xs font-mono w-10 text-right" style={{ color: P.t2 }}>{m.unit}</span>
              <span className="text-xs font-mono font-semibold w-14 text-right" style={{ color: P.g1 }}>${m.price}</span>
              <button onClick={() => setS({ ...s, materialCatalog: s.materialCatalog.filter((_, j) => j !== i) })}
                className="hover:opacity-60 transition-opacity" style={{ color: P.o1 }}>
                <X size={13} />
              </button>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_70px_80px_auto] gap-2 pt-1">
            <input value={newM.name} onChange={e => setNewM({ ...newM, name: e.target.value })} placeholder="Material"
              className="px-3 py-1.5 rounded-md text-sm outline-none"
              style={{ background: P.bg1, color: P.t1, border: `1px solid ${P.ln}` }} />
            <input value={newM.unit} onChange={e => setNewM({ ...newM, unit: e.target.value })} placeholder="Unidad"
              className="px-3 py-1.5 rounded-md text-sm outline-none"
              style={{ background: P.bg1, color: P.t1, border: `1px solid ${P.ln}` }} />
            <input type="number" value={newM.price} onChange={e => setNewM({ ...newM, price: e.target.value })} placeholder="Precio"
              className="px-3 py-1.5 rounded-md text-sm outline-none font-mono"
              style={{ background: P.bg1, color: P.t1, border: `1px solid ${P.ln}` }} />
            <Btn variant="ghost" onClick={() => {
              if (newM.name.trim()) {
                setS({ ...s, materialCatalog: [...s.materialCatalog, { name: newM.name, unit: newM.unit, price: parseFloat(newM.price) || 0 }] });
                setNewM({ name: "", unit: "", price: "" });
              }
            }}><Plus size={13} /></Btn>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold font-serif mb-3" style={{ color: P.t1 }}>Datos</h3>
        <div className="flex gap-3 flex-wrap">
          <Btn variant="ghost" onClick={() => toast.success("Exportando CSV…")}><Download size={13} /> Exportar CSV</Btn>
          <Btn variant="danger" onClick={() => toast.error("Acción revertida (simulado)")}><Trash2 size={13} /> Borrar datos</Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── Employee Modal ────────────────────────────────────────────────────────────
function EmployeeModal({ employee, onSave, onClose }: {
  employee: Employee | null; onSave: (e: Employee) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Employee>(
    employee ?? { id: Date.now(), name: "", rate: 18, phone: "", notes: "" }
  );

  return (
    <Modal title={employee ? "Editar Empleado" : "Nuevo Empleado"} onClose={onClose}>
      <div className="p-5 space-y-3">
        <FInput label="Nombre completo" value={form.name} onChange={v => setForm({ ...form, name: v })} />
        <FInput label="Tarifa por hora ($)" type="number" value={form.rate} onChange={v => setForm({ ...form, rate: parseFloat(v) || 0 })} />
        <FInput label="Teléfono" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
        <FTextarea label="Notas" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
        <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: P.ln }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={() => {
            if (!form.name.trim()) { toast.error("El nombre es requerido"); return; }
            onSave(form);
            toast.success(employee ? "Empleado actualizado" : "Empleado agregado");
            onClose();
          }}>Guardar</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── Job Modal ─────────────────────────────────────────────────────────────────
function JobModal({ job, employees, settings, onSave, onDelete, onClose }: {
  job: Job | null; employees: Employee[]; settings: AppSettings;
  onSave: (j: Job) => void; onDelete?: (id: number) => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<JobTab>("general");
  const [form, setForm] = useState<Job>(job ?? {
    id: Date.now(), name: "", client: "", address: "", phone: "",
    startDate: "", endDate: "", status: "Activo", baseIncome: 0, notes: "",
    payroll: [], gasoline: [], materials: [], basura: 0,
    otherExpenses: [], otherIncome: [],
  });

  const t = useMemo(() => calcJob(form, employees, settings), [form, employees, settings]);

  const TABS: { id: JobTab; label: string }[] = [
    { id: "general", label: "General" }, { id: "nomina", label: "Nómina" },
    { id: "gasolina", label: "Gasolina" }, { id: "material", label: "Material" },
    { id: "otros", label: "Otros" }, { id: "resumen", label: "Resumen" },
  ];

  function upPayroll(i: number, patch: Partial<PayrollEntry>) {
    const p = [...form.payroll]; p[i] = { ...p[i], ...patch }; setForm({ ...form, payroll: p });
  }
  function upGasoline(i: number, patch: Partial<GasolineEntry>) {
    const g = [...form.gasoline]; g[i] = { ...g[i], ...patch }; setForm({ ...form, gasoline: g });
  }
  function upMaterial(i: number, patch: Partial<MaterialEntry>) {
    const m = [...form.materials]; m[i] = { ...m[i], ...patch }; setForm({ ...form, materials: m });
  }
  function upOtherExp(i: number, patch: Partial<OtherItem>) {
    const e = [...form.otherExpenses]; e[i] = { ...e[i], ...patch }; setForm({ ...form, otherExpenses: e });
  }
  function upOtherInc(i: number, patch: Partial<OtherItem>) {
    const inc = [...form.otherIncome]; inc[i] = { ...inc[i], ...patch }; setForm({ ...form, otherIncome: inc });
  }

  const thStyle = { color: P.t2 };
  const cellInput = "px-2 py-1 rounded text-xs outline-none font-mono";
  const cellInputStyle = { background: P.bg2, color: P.t1, border: `1px solid ${P.ln}` };

  return (
    <Modal title={job ? `Editar: ${job.name}` : "Nuevo Trabajo"} onClose={onClose} wide>
      {/* Tab bar */}
      <div className="flex gap-0.5 overflow-x-auto px-5 pt-4 pb-0 border-b" style={{ borderColor: P.ln }}>
        {TABS.map(tb => (
          <button
            key={tb.id} onClick={() => setTab(tb.id)}
            className="px-3 pb-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors"
            style={{ color: tab === tb.id ? P.g1 : P.t2, borderColor: tab === tb.id ? P.g1 : "transparent" }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* GENERAL */}
        {tab === "general" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FInput label="Nombre del trabajo" value={form.name} onChange={v => setForm({ ...form, name: v })} />
              <FInput label="Cliente" value={form.client} onChange={v => setForm({ ...form, client: v })} />
              <FInput label="Dirección" value={form.address} onChange={v => setForm({ ...form, address: v })} />
              <FInput label="Teléfono" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
              <FInput label="Fecha inicio" type="date" value={form.startDate} onChange={v => setForm({ ...form, startDate: v })} />
              <FInput label="Fecha fin" type="date" value={form.endDate} onChange={v => setForm({ ...form, endDate: v })} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: P.t2 }}>Estado</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })}
                  className="px-3 py-1.5 rounded-md text-sm outline-none"
                  style={{ background: P.bg1, color: P.t1, border: `1px solid ${P.ln}` }}>
                  <option>Activo</option><option>Completado</option><option>Cancelado</option>
                </select>
              </div>
              <FInput label="Ingresos base ($)" type="number" value={form.baseIncome} onChange={v => setForm({ ...form, baseIncome: parseFloat(v) || 0 })} />
            </div>
            <FTextarea label="Notas" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
          </div>
        )}

        {/* NÓMINA */}
        {tab === "nomina" && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${P.ln}` }}>
                    <th className="text-left py-2 text-xs font-semibold pr-2" style={thStyle}>Empleado</th>
                    <th className="text-right py-2 text-xs font-semibold px-2" style={thStyle}>Horas</th>
                    <th className="text-right py-2 text-xs font-semibold px-2" style={thStyle}>Tarifa</th>
                    <th className="text-right py-2 text-xs font-semibold px-2" style={thStyle}>Subtotal</th>
                    <th className="py-2 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {form.payroll.map((p, i) => {
                    const emp = employees.find(e => e.id === p.employeeId);
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${P.ln}` }}>
                        <td className="py-2 pr-2">
                          <select value={p.employeeId} onChange={e => upPayroll(i, { employeeId: parseInt(e.target.value) })}
                            className="w-full px-2 py-1 rounded text-xs outline-none"
                            style={cellInputStyle}>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input type="number" value={p.hours} onChange={e => upPayroll(i, { hours: parseFloat(e.target.value) || 0 })}
                            className={`${cellInput} w-16 text-right`} style={cellInputStyle} />
                        </td>
                        <td className="py-2 px-2 text-right text-xs font-mono" style={{ color: P.t2 }}>
                          ${emp?.rate ?? 0}/hr
                        </td>
                        <td className="py-2 px-2 text-right text-xs font-mono font-medium" style={{ color: P.t1 }}>
                          {fmt(p.hours * (emp?.rate ?? 0))}
                        </td>
                        <td className="py-2 pl-2">
                          <button onClick={() => setForm({ ...form, payroll: form.payroll.filter((_, j) => j !== i) })}
                            className="hover:opacity-60 transition-opacity" style={{ color: P.o1 }}><X size={13} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Btn variant="ghost" onClick={() => setForm({ ...form, payroll: [...form.payroll, { employeeId: employees[0]?.id ?? 1, hours: 0 }] })}>
              <Plus size={13} /> Agregar empleado
            </Btn>
            <div className="pt-3 space-y-1.5 border-t" style={{ borderColor: P.ln }}>
              <div className="flex justify-between text-sm"><span style={{ color: P.t2 }}>Subtotal nómina</span><span className="font-mono" style={{ color: P.t1 }}>{fmt(t.payBase)}</span></div>
              <div className="flex justify-between text-sm"><span style={{ color: P.t2 }}>Aseguranza ({settings.insuranceRate}%)</span><span className="font-mono" style={{ color: P.t1 }}>{fmt(t.insurance)}</span></div>
              <div className="flex justify-between text-sm font-semibold pt-1 border-t" style={{ borderColor: P.ln }}>
                <span style={{ color: P.t1 }}>Total nómina</span><span className="font-mono" style={{ color: P.g1 }}>{fmt(t.nomina)}</span>
              </div>
            </div>
          </div>
        )}

        {/* GASOLINA */}
        {tab === "gasolina" && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${P.ln}` }}>
                    {["Vehículo", "Días", "$/día", "Subtotal", ""].map(h => (
                      <th key={h} className="text-left py-2 text-xs font-semibold pr-2" style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.gasoline.map((g, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${P.ln}` }}>
                      <td className="py-2 pr-2">
                        <select value={g.vehicle} onChange={e => upGasoline(i, { vehicle: e.target.value })}
                          className="w-full px-2 py-1 rounded text-xs outline-none" style={cellInputStyle}>
                          {settings.vehicles.map(v => <option key={v}>{v}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" value={g.days} onChange={e => upGasoline(i, { days: parseFloat(e.target.value) || 0 })}
                          className={`${cellInput} w-16 text-right`} style={cellInputStyle} />
                      </td>
                      <td className="py-2 px-2">
                        <input type="number" value={g.dailyRate} onChange={e => upGasoline(i, { dailyRate: parseFloat(e.target.value) || 0 })}
                          className={`${cellInput} w-16 text-right`} style={cellInputStyle} />
                      </td>
                      <td className="py-2 px-2 text-xs font-mono font-medium" style={{ color: P.t1 }}>{fmt(g.days * g.dailyRate)}</td>
                      <td className="py-2">
                        <button onClick={() => setForm({ ...form, gasoline: form.gasoline.filter((_, j) => j !== i) })}
                          className="hover:opacity-60" style={{ color: P.o1 }}><X size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Btn variant="ghost" onClick={() => setForm({ ...form, gasoline: [...form.gasoline, { vehicle: settings.vehicles[0] ?? "", days: 0, dailyRate: 45 }] })}>
              <Plus size={13} /> Agregar vehículo
            </Btn>
            <div className="flex justify-between text-sm pt-3 border-t font-semibold" style={{ borderColor: P.ln }}>
              <span style={{ color: P.t1 }}>Total gasolina</span>
              <span className="font-mono" style={{ color: P.g1 }}>{fmt(t.gasoline)}</span>
            </div>
          </div>
        )}

        {/* MATERIAL */}
        {tab === "material" && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${P.ln}` }}>
                    {["Material", "Unidad", "Cant.", "Precio", "Subtotal", ""].map(h => (
                      <th key={h} className="text-left py-2 text-xs font-semibold pr-2" style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.materials.map((m, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${P.ln}` }}>
                      <td className="py-2 pr-2">
                        <input value={m.name} onChange={e => upMaterial(i, { name: e.target.value })}
                          className="w-full px-2 py-1 rounded text-xs outline-none" style={cellInputStyle} />
                      </td>
                      <td className="py-2 pr-2">
                        <input value={m.unit} onChange={e => upMaterial(i, { unit: e.target.value })}
                          className={`${cellInput} w-14`} style={cellInputStyle} />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" value={m.qty} onChange={e => upMaterial(i, { qty: parseFloat(e.target.value) || 0 })}
                          className={`${cellInput} w-16 text-right`} style={cellInputStyle} />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" value={m.price} onChange={e => upMaterial(i, { price: parseFloat(e.target.value) || 0 })}
                          className={`${cellInput} w-20 text-right`} style={cellInputStyle} />
                      </td>
                      <td className="py-2 pr-2 text-xs font-mono font-medium" style={{ color: P.t1 }}>{fmt(m.qty * m.price)}</td>
                      <td className="py-2">
                        <button onClick={() => setForm({ ...form, materials: form.materials.filter((_, j) => j !== i) })}
                          className="hover:opacity-60" style={{ color: P.o1 }}><X size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Btn variant="ghost" onClick={() => setForm({ ...form, materials: [...form.materials, { name: "", unit: "", qty: 1, price: 0 }] })}>
              <Plus size={13} /> Agregar material
            </Btn>
            <div className="flex justify-between text-sm pt-3 border-t font-semibold" style={{ borderColor: P.ln }}>
              <span style={{ color: P.t1 }}>Total material</span>
              <span className="font-mono" style={{ color: P.g1 }}>{fmt(t.materials)}</span>
            </div>
          </div>
        )}

        {/* OTROS */}
        {tab === "otros" && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: P.t2 }}>Basura</p>
              <FInput label="Costo de basura ($)" type="number" value={form.basura} onChange={v => setForm({ ...form, basura: parseFloat(v) || 0 })} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: P.t2 }}>Otros Gastos</p>
              <div className="space-y-2">
                {form.otherExpenses.map((e, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={e.desc} onChange={ev => upOtherExp(i, { desc: ev.target.value })}
                      placeholder="Descripción" className="flex-1 px-3 py-1.5 rounded-md text-sm outline-none"
                      style={{ background: P.bg2, color: P.t1, border: `1px solid ${P.ln}` }} />
                    <input type="number" value={e.amount} onChange={ev => upOtherExp(i, { amount: parseFloat(ev.target.value) || 0 })}
                      className="w-24 px-3 py-1.5 rounded-md text-sm text-right font-mono outline-none"
                      style={{ background: P.bg2, color: P.t1, border: `1px solid ${P.ln}` }} />
                    <button onClick={() => setForm({ ...form, otherExpenses: form.otherExpenses.filter((_, j) => j !== i) })}
                      className="hover:opacity-60" style={{ color: P.o1 }}><X size={15} /></button>
                  </div>
                ))}
                <Btn variant="ghost" onClick={() => setForm({ ...form, otherExpenses: [...form.otherExpenses, { desc: "", amount: 0 }] })}>
                  <Plus size={13} /> Agregar gasto
                </Btn>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: P.t2 }}>Otros Ingresos</p>
              <div className="space-y-2">
                {form.otherIncome.map((inc, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={inc.desc} onChange={ev => upOtherInc(i, { desc: ev.target.value })}
                      placeholder="Descripción" className="flex-1 px-3 py-1.5 rounded-md text-sm outline-none"
                      style={{ background: P.bg2, color: P.t1, border: `1px solid ${P.ln}` }} />
                    <input type="number" value={inc.amount} onChange={ev => upOtherInc(i, { amount: parseFloat(ev.target.value) || 0 })}
                      className="w-24 px-3 py-1.5 rounded-md text-sm text-right font-mono outline-none"
                      style={{ background: P.bg2, color: P.t1, border: `1px solid ${P.ln}` }} />
                    <button onClick={() => setForm({ ...form, otherIncome: form.otherIncome.filter((_, j) => j !== i) })}
                      className="hover:opacity-60" style={{ color: P.o1 }}><X size={15} /></button>
                  </div>
                ))}
                <Btn variant="ghost" onClick={() => setForm({ ...form, otherIncome: [...form.otherIncome, { desc: "", amount: 0 }] })}>
                  <Plus size={13} /> Agregar ingreso
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* RESUMEN */}
        {tab === "resumen" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold font-serif" style={{ color: P.t1 }}>
              {form.name || "Sin nombre"} — Resumen Financiero
            </p>

            <div className="rounded-lg p-4 space-y-1.5" style={{ background: P.bg2, border: `1px solid ${P.ln}` }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: P.t2 }}>Ingresos</p>
              <SRow label="Ingresos base" value={form.baseIncome} />
              {t.otherInc > 0 && <SRow label="Otros ingresos" value={t.otherInc} />}
              <SRow label="Total ingresos" value={t.totalInc} bold gold />
            </div>

            <div className="rounded-lg p-4 space-y-1.5" style={{ background: P.bg2, border: `1px solid ${P.ln}` }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: P.t2 }}>Gastos</p>
              <SRow label="Nómina base" value={t.payBase} />
              <SRow label={`Aseguranza (${settings.insuranceRate}%)`} value={t.insurance} />
              <SRow label="Gasolina" value={t.gasoline} />
              <SRow label="Material" value={t.materials} />
              {t.basura > 0 && <SRow label="Basura" value={t.basura} />}
              {t.otherExp > 0 && <SRow label="Otros gastos" value={t.otherExp} />}
              <SRow label="Total gastos" value={t.totalExp} bold red />
            </div>

            <div className="rounded-lg p-4 space-y-1.5" style={{ background: P.br2, border: `1px solid ${P.br1}` }}>
              <SRow label="Ganancia bruta" value={t.grossProfit} bold light />
              <SRow label={`Impuestos (${settings.taxRate}%)`} value={-t.taxes} light />
              <SRow label={`Comisión compañía (${settings.companyFee}%)`} value={-t.companyFee} light />
              <SRow label={`Utilidades (${settings.utilityFee}%)`} value={-t.utilityFee} light />
              <div style={{ height: 1, background: P.br1, margin: "6px 0" }} />
              <SRow label="GANANCIA NETA" value={t.netProfit} bold light big />
              <SRow label="Margen neto" value={t.margin} isPercent light />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t" style={{ borderColor: P.ln }}>
          <div>
            {job && onDelete && (
              <Btn variant="danger" onClick={() => { onDelete(job.id); toast.error("Trabajo eliminado"); onClose(); }}>
                <Trash2 size={13} /> Eliminar
              </Btn>
            )}
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn onClick={() => {
              if (!form.name.trim()) { toast.error("El nombre del trabajo es requerido"); return; }
              onSave(form);
              toast.success(job ? "Trabajo actualizado" : "Trabajo creado");
              onClose();
            }}>Guardar</Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INIT_SETTINGS);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const jobsRef = useRef<Job[]>([]);
  const employeesRef = useRef<Employee[]>([]);

  const toastStyle = { background: P.br3, color: P.g3, border: `1px solid ${P.br1}`, fontFamily: "Inter, sans-serif" };

  // Keep refs in sync so async callbacks always see latest state
  useEffect(() => { jobsRef.current = jobs; }, [jobs]);
  useEffect(() => { employeesRef.current = employees; }, [employees]);

  async function loadData(uid: string) {
    setDataLoading(true);
    try {
      const [j, e, s] = await Promise.all([
        api.getJobs(uid),
        api.getEmployees(uid),
        api.getSettings(uid),
      ]);
      setJobs(Array.isArray(j) ? j : []);
      setEmployees(Array.isArray(e) ? e : []);
      if (s && typeof s === "object" && !Array.isArray(s)) setSettings(s as AppSettings);
    } catch (err: any) {
      toast.error("Error cargando datos: " + err.message);
    } finally {
      setDataLoading(false);
    }
  }

  // Auth listener — fires on mount and on every login/logout
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setLoggedIn(true); loadData(session.user.id); }
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setLoggedIn(true);
        loadData(session.user.id);
      } else {
        setLoggedIn(false);
        setJobs([]);
        setEmployees([]);
        setSettings(INIT_SETTINGS);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function saveJob(j: Job) {
    const exists = jobsRef.current.some(x => x.id === j.id);
    setJobs(exists
      ? jobsRef.current.map(x => x.id === j.id ? j : x)
      : [...jobsRef.current, j]);
    try {
      const uid = await getUserId();
      await api.upsertJob(uid, j);
    } catch (err: any) {
      toast.error("Error guardando trabajo: " + err.message);
    }
  }

  async function deleteJob(id: number) {
    setJobs(jobsRef.current.filter(j => j.id !== id));
    try {
      const uid = await getUserId();
      await api.deleteJob(uid, id);
    } catch (err: any) {
      toast.error("Error eliminando trabajo: " + err.message);
    }
  }

  async function saveEmployee(e: Employee) {
    const exists = employeesRef.current.some(x => x.id === e.id);
    setEmployees(exists
      ? employeesRef.current.map(x => x.id === e.id ? e : x)
      : [...employeesRef.current, e]);
    try {
      const uid = await getUserId();
      await api.upsertEmployee(uid, e);
    } catch (err: any) {
      toast.error("Error guardando empleado: " + err.message);
    }
  }

  async function deleteEmployee(id: number) {
    setEmployees(employeesRef.current.filter(e => e.id !== id));
    toast.error("Empleado eliminado");
    try {
      const uid = await getUserId();
      await api.deleteEmployee(uid, id);
    } catch (err: any) {
      toast.error("Error eliminando empleado: " + err.message);
    }
  }

  async function handleSaveSettings(s: AppSettings) {
    setSettings(s);
    try {
      const uid = await getUserId();
      await api.saveSettings(uid, s);
    } catch (err: any) {
      toast.error("Error guardando ajustes: " + err.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // Splash while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: P.bg1 }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 animate-pulse"
          style={{ background: P.br3, borderColor: P.g1 }}>
          <span className="text-xl font-bold font-serif" style={{ color: P.g2 }}>SD</span>
        </div>
        <p className="text-xs tracking-widest uppercase" style={{ color: P.t2 }}>Cargando…</p>
        <Toaster position="bottom-right" toastOptions={{ style: toastStyle }} />
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <>
        <LoginScreen onLogin={() => {}} />
        <Toaster position="bottom-right" toastOptions={{ style: toastStyle }} />
      </>
    );
  }

  // Data loading overlay
  if (dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: P.bg1 }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center border-2"
          style={{ background: P.br3, borderColor: P.g1 }}>
          <span className="text-xl font-bold font-serif" style={{ color: P.g2 }}>SD</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium" style={{ color: P.t1 }}>Cargando datos…</p>
          <p className="text-xs" style={{ color: P.t2 }}>Conectando con Supabase</p>
        </div>
        <Toaster position="bottom-right" toastOptions={{ style: toastStyle }} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: P.bg1, color: P.t1 }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50">
            <Sidebar
              screen={screen} setScreen={setScreen}
              onLogout={handleLogout}
              companyName={settings.companyName}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar
          screen={screen} setScreen={setScreen}
          onLogout={handleLogout}
          companyName={settings.companyName}
        />
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 lg:hidden"
          style={{ background: P.bg2, borderColor: P.ln }}>
          <button onClick={() => setSidebarOpen(true)} style={{ color: P.t1 }}><Menu size={20} /></button>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif"
              style={{ background: P.br3, color: P.g2, border: `1px solid ${P.g1}` }}>SD</span>
            <span className="font-semibold font-serif text-sm" style={{ color: P.t1 }}>{settings.companyName}</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {screen === "dashboard" && (
            <DashboardPage jobs={jobs} employees={employees} settings={settings} />
          )}
          {screen === "trabajos" && (
            <JobsPage
              jobs={jobs} employees={employees} settings={settings}
              onNew={() => { setEditingJob(null); setJobModalOpen(true); }}
              onEdit={j => { setEditingJob(j); setJobModalOpen(true); }}
            />
          )}
          {screen === "empleados" && (
            <EmployeesPage
              employees={employees} jobs={jobs}
              onNew={() => { setEditingEmp(null); setEmpModalOpen(true); }}
              onEdit={e => { setEditingEmp(e); setEmpModalOpen(true); }}
              onDelete={deleteEmployee}
            />
          )}
          {screen === "ajustes" && (
            <SettingsPage settings={settings} onSave={handleSaveSettings} />
          )}
        </main>
      </div>

      {/* Modals */}
      {jobModalOpen && (
        <JobModal
          job={editingJob} employees={employees} settings={settings}
          onSave={saveJob} onDelete={deleteJob}
          onClose={() => { setJobModalOpen(false); setEditingJob(null); }}
        />
      )}
      {empModalOpen && (
        <EmployeeModal
          employee={editingEmp}
          onSave={saveEmployee}
          onClose={() => { setEmpModalOpen(false); setEditingEmp(null); }}
        />
      )}

      <Toaster position="bottom-right" toastOptions={{ style: toastStyle }} />
    </div>
  );
}
