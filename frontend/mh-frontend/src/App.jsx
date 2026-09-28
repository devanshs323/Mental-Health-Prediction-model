import { useState, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig, animate } from "framer-motion";
import {
  Brain, Loader2, RotateCcw, Sparkles, AlertCircle, X, Smartphone,
  Moon, Dumbbell, BookOpen, UserRound, Wind, HeartPulse, Leaf,
} from "lucide-react";

/* ---------- Config ---------- */
const API_URL = "http://localhost:3000/predict";
const MAX_SCORE = 10; // adjust if your model's target uses a different scale

const OPTIONS = {
  gender: ["Male", "Female"],
  academic_level: ["High School", "Undergraduate", "Graduate"],
  most_used_platform: ["Facebook", "LinkedIn", "Instagram", "Snapchat", "Twitter", "YouTube", "TikTok", "LINE", "KakaoTalk", "VKontakte", "WhatsApp", "WeChat"],
  purpose_of_use: ["Networking", "Education", "Entertainment", "News"],
  stress_level: ["Low", "Medium", "High", "Very High"],
};
const COUNTRIES = ["India", "USA", "Canada", "Australia", "UK", "Germany", "Mexico", "Turkey", "France"];

const INITIAL = {
  age: "", gender: "", country: "", academic_level: "", most_used_platform: "",
  purpose_of_use: "", avg_daily_usage_hours: 4, daily_unlocks: "",
  study_hours: 3, physical_activity_hours: 1, sleep_hours_per_night: 7, stress_level: "",
};

const BANDS = [
  { min: 0.7, color: "#10b981", icon: Leaf, label: "Thriving", text: "You are doing great! Keep up the healthy habits." },
  { min: 0.4, color: "#f59e0b", icon: Wind, label: "Holding steady", text: "You're getting by, but a few small changes to sleep, screen time, or movement could lift your score." },
  { min: 0, color: "#f43f5e", icon: HeartPulse, label: "Needs care", text: "Take a deep breath. It's time for a break. Consider talking with someone you trust or a counselor." },
];
const bandFor = (s) => BANDS.find((b) => s / MAX_SCORE >= b.min) ?? BANDS[2];

/* ---------- Small UI pieces ---------- */
const inputCls =
  "w-full rounded-xl border border-white/70 bg-white/70 px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:bg-white/90 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-300/40 aria-[invalid=true]:border-rose-400";

function Field({ label, error, children, htmlFor }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function Select({ id, value, onChange, options, error }) {
  return (
    <select id={id} value={value} onChange={onChange} aria-invalid={!!error} className={inputCls}>
      <option value="" disabled>Select…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Slider({ id, label, value, onChange, icon: Icon, unit = "h" }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
          {Icon && <Icon className="h-4 w-4 text-indigo-500" aria-hidden />} {label}
        </label>
        <span className="rounded-lg bg-white/80 px-2 py-0.5 text-sm font-semibold tabular-nums text-indigo-700 shadow-sm">
          {value}{unit}
        </span>
      </div>
      <input
        id={id} type="range" min={0} max={24} step={0.5} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-indigo-200/70 accent-indigo-600 outline-none focus-visible:ring-4 focus-visible:ring-indigo-300/50"
      />
    </div>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16 }}
      className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-rose-200 bg-white/90 p-4 shadow-xl backdrop-blur-md"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
      <p className="text-sm text-slate-700">{message}</p>
      <button onClick={onClose} aria-label="Dismiss" className="rounded p-0.5 text-slate-400 hover:text-slate-700">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

function Gauge({ score, color }) {
  const R = 80, C = 2 * Math.PI * R;
  const pct = Math.min(Math.max(score / MAX_SCORE, 0), 1);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const c = animate(0, score, { duration: 1.4, ease: "easeOut", onUpdate: setShown });
    return () => c.stop();
  }, [score]);
  return (
    <div className="relative h-56 w-56">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={R} fill="none" strokeWidth="14" className="stroke-white/80" />
        <motion.circle
          cx="100" cy="100" r={R} fill="none" strokeWidth="14" strokeLinecap="round"
          stroke={color} strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold tabular-nums text-slate-800">{shown.toFixed(1)}</span>
        <span className="text-sm text-slate-500">out of {MAX_SCORE}</span>
      </div>
    </div>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState("form"); // form | loading | result
  const [score, setScore] = useState(null);
  const [toast, setToast] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target?.value ?? e }));

  const validate = () => {
    const e = {};
    const age = Number(form.age);
    if (form.age === "" || !Number.isInteger(age) || age < 10 || age > 100) e.age = "Enter a whole number from 10 to 100.";
    if (form.daily_unlocks === "" || !Number.isInteger(Number(form.daily_unlocks)) || Number(form.daily_unlocks) < 0)
      e.daily_unlocks = "Enter a whole number, 0 or higher.";
    if (!form.country.trim()) e.country = "Enter your country.";
    ["gender", "academic_level", "most_used_platform", "purpose_of_use", "stress_level"].forEach((k) => {
      if (!form[k]) e[k] = "Choose an option.";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setPhase("loading");

    const payload = {
      ...form,
      age: Number(form.age),
      country: form.country.trim(),
      daily_unlocks: Number(form.daily_unlocks),
      avg_daily_usage_hours: Number(form.avg_daily_usage_hours),
      study_hours: Number(form.study_hours),
      physical_activity_hours: Number(form.physical_activity_hours),
      sleep_hours_per_night: Number(form.sleep_hours_per_night),
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let detail = `Server responded with status ${res.status}.`;
        try {
          const body = await res.json();
          if (Array.isArray(body.detail))
            detail = body.detail.map((d) => `${d.loc?.slice(1).join(".")}: ${d.msg}`).join(" · ");
        } catch { /* keep default message */ }
        throw new Error(detail);
      }
      const data = await res.json();
      setScore(data.predicted_mental_health_score);
      setPhase("result");
    } catch (err) {
      setPhase("form");
      setToast(
        err instanceof TypeError
          ? "Can't reach the server at localhost:3000. Check that the backend is running and try again."
          : err.message
      );
    }
  };

  const reset = () => {
    setForm(INITIAL); setErrors({}); setScore(null); setPhase("form");
  };

  const band = score !== null ? bandFor(score) : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-200 via-indigo-200 to-violet-300 px-4 py-10 font-[Inter,system-ui,sans-serif]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-sky-300/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-violet-400/40 blur-3xl" />

        <AnimatePresence>
          {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        </AnimatePresence>

        <main className="relative mx-auto max-w-4xl">
          <header className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-white/70 p-3 shadow-md backdrop-blur">
              <Brain className="h-7 w-7 text-indigo-600" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">Student Mental Health Predictor</h1>
              <p className="text-sm text-slate-600">Tell us about your daily routine to estimate your wellbeing score.</p>
            </div>
          </header>

          <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-2xl shadow-indigo-900/10 backdrop-blur-xl sm:p-8">
            <AnimatePresence mode="wait">
              {phase === "form" && (
                <motion.form
                  key="form" onSubmit={handleSubmit} noValidate
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
                    <section className="space-y-4">
                      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
                        <UserRound className="h-4 w-4 text-indigo-500" aria-hidden /> About you
                      </h2>
                      <Field label="Age" htmlFor="age" error={errors.age}>
                        <input id="age" type="number" min={10} max={100} inputMode="numeric" placeholder="e.g. 20"
                          value={form.age} onChange={set("age")} aria-invalid={!!errors.age} className={inputCls} />
                      </Field>
                      <Field label="Gender" htmlFor="gender" error={errors.gender}>
                        <Select id="gender" value={form.gender} onChange={set("gender")} options={OPTIONS.gender} error={errors.gender} />
                      </Field>
                      <Field label="Country" htmlFor="country" error={errors.country}>
                        <input id="country" list="countries" placeholder="Type or pick a country"
                          value={form.country} onChange={set("country")} aria-invalid={!!errors.country} className={inputCls} />
                        <datalist id="countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
                      </Field>
                      <Field label="Academic level" htmlFor="academic_level" error={errors.academic_level}>
                        <Select id="academic_level" value={form.academic_level} onChange={set("academic_level")} options={OPTIONS.academic_level} error={errors.academic_level} />
                      </Field>
                      <Field label="Current stress level" htmlFor="stress_level" error={errors.stress_level}>
                        <Select id="stress_level" value={form.stress_level} onChange={set("stress_level")} options={OPTIONS.stress_level} error={errors.stress_level} />
                      </Field>
                    </section>

                    <section className="space-y-4">
                      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
                        <Smartphone className="h-4 w-4 text-indigo-500" aria-hidden /> Social media use
                      </h2>
                      <Field label="Most used platform" htmlFor="most_used_platform" error={errors.most_used_platform}>
                        <Select id="most_used_platform" value={form.most_used_platform} onChange={set("most_used_platform")} options={OPTIONS.most_used_platform} error={errors.most_used_platform} />
                      </Field>
                      <Field label="Main purpose of use" htmlFor="purpose_of_use" error={errors.purpose_of_use}>
                        <Select id="purpose_of_use" value={form.purpose_of_use} onChange={set("purpose_of_use")} options={OPTIONS.purpose_of_use} error={errors.purpose_of_use} />
                      </Field>
                      <Field label="Phone unlocks per day" htmlFor="daily_unlocks" error={errors.daily_unlocks}>
                        <input id="daily_unlocks" type="number" min={0} inputMode="numeric" placeholder="e.g. 60"
                          value={form.daily_unlocks} onChange={set("daily_unlocks")} aria-invalid={!!errors.daily_unlocks} className={inputCls} />
                      </Field>
                      <Slider id="avg_daily_usage_hours" label="Daily social media time" icon={Smartphone}
                        value={form.avg_daily_usage_hours} onChange={set("avg_daily_usage_hours")} />
                    </section>
                  </div>

                  <section className="space-y-4">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
                      <Moon className="h-4 w-4 text-indigo-500" aria-hidden /> Daily balance
                    </h2>
                    <div className="grid gap-6 md:grid-cols-3">
                      <Slider id="study_hours" label="Study" icon={BookOpen} value={form.study_hours} onChange={set("study_hours")} />
                      <Slider id="physical_activity_hours" label="Exercise" icon={Dumbbell} value={form.physical_activity_hours} onChange={set("physical_activity_hours")} />
                      <Slider id="sleep_hours_per_night" label="Sleep per night" icon={Moon} value={form.sleep_hours_per_night} onChange={set("sleep_hours_per_night")} />
                    </div>
                  </section>

                  <motion.button
                    type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 outline-none transition hover:shadow-xl hover:shadow-indigo-500/40 focus-visible:ring-4 focus-visible:ring-indigo-300"
                  >
                    <Sparkles className="h-5 w-5" aria-hidden /> Predict my score
                  </motion.button>
                </motion.form>
              )}

              {phase === "loading" && (
                <motion.div
                  key="loading" role="status" aria-live="polite"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-6 py-12"
                >
                  <Loader2 className="h-12 w-12 animate-spin text-indigo-600" aria-hidden />
                  <p className="text-lg font-medium text-slate-700">Analyzing lifestyle patterns…</p>
                  <div className="w-full max-w-sm space-y-3">
                    {[100, 82, 64].map((w) => (
                      <div key={w} className="h-3 animate-pulse rounded-full bg-white/80" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                </motion.div>
              )}

              {phase === "result" && band && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 160, damping: 20 }}
                  className="flex flex-col items-center gap-5 py-6 text-center"
                >
                  <Gauge score={score} color={band.color} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
                    className="max-w-md space-y-3"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-sm font-semibold shadow-sm" style={{ color: band.color }}>
                      <band.icon className="h-4 w-4" aria-hidden /> {band.label}
                    </span>
                    <p className="text-lg text-slate-700">{band.text}</p>
                    <p className="text-xs text-slate-500">This is a statistical estimate, not a diagnosis or medical advice.</p>
                  </motion.div>
                  <motion.button
                    onClick={reset} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="mt-2 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-6 py-3 font-semibold text-indigo-700 shadow-md outline-none transition hover:bg-white focus-visible:ring-4 focus-visible:ring-indigo-300"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden /> Recalculate
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}
