import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Headset, ShieldCheck, Sparkles } from "lucide-react";
import { firebaseAuth } from "../lib/firebase";
import { userFriendlyError } from "../lib/userFriendlyError";
import { useAuth } from "../contexts/AuthContext";

const schema = z.object({ email: z.string().email("Enter a valid email address."), password: z.string().min(8, "Use at least 8 characters.") });
type FormValues = z.infer<typeof schema>;

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { user, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() => {
    if (mode !== "login") return "";
    if (typeof location.state?.notice === "string" && !/verif/i.test(location.state.notice)) {
      return location.state.notice;
    }
    return "";
  });
  const [registrationPending, setRegistrationPending] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });
  if (user && !registrationPending && !isSubmitting) {
    return <Navigate to="/app" replace />;
  }

  async function submit(values: FormValues) {
    if (!firebaseAuth) {
      setError("Firebase is not configured. Copy frontend/.env.example to frontend/.env and add your Firebase web app values.");
      return;
    }
    try {
      setError("");
      setNotice("");
      if (mode === "signup") {
        setRegistrationPending(true);
        await createUserWithEmailAndPassword(firebaseAuth, values.email, values.password);
        await signOut(firebaseAuth);
        navigate("/login", {
          replace: true,
          state: { notice: "Account created. Sign in to continue." }
        });
        return;
      }
      const credential = await signInWithEmailAndPassword(firebaseAuth, values.email, values.password);
      await credential.user.getIdToken(true);
      navigate("/app", { replace: true });
    } catch (authError) {
      setRegistrationPending(false);
      setError(userFriendlyError(authError, "Authentication failed. Please try again."));
    }
  }

  return <div className="min-h-screen bg-white lg:grid lg:grid-cols-[1.02fr_.98fr]">
    <section className="relative hidden overflow-hidden bg-ink px-14 py-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10" /><div className="absolute -right-10 -top-10 h-64 w-64 rounded-full border border-white/10" />
      <a className="relative flex items-center gap-3 font-semibold" href="/"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500"><Headset size={21} /></span>Northstar<span className="font-normal text-white/50">support</span></a>
      <div className="relative max-w-lg"><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-teal-100"><Sparkles size={14} />A clearer way to support your customers</div><h1 className="text-5xl font-semibold leading-[1.12] tracking-tight">Great support is a team sport.</h1><p className="mt-6 max-w-md leading-7 text-slate-300">Keep every conversation moving with a calm, connected workspace built for people who care.</p><div className="mt-10 flex items-center gap-3 text-sm text-slate-300"><ShieldCheck size={18} className="text-teal-300" />Private by design. Team-ready from day one.</div></div>
      <p className="relative text-xs text-slate-400">Thoughtful service starts here · © 2026 Northstar</p>
    </section>
    <section className="flex min-h-screen items-center justify-center px-6 py-12"><div className="w-full max-w-md">
      <div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-white"><Headset size={21} /></span><span className="font-semibold text-ink">Northstar support</span></div>
      <p className="text-sm font-semibold text-teal-700">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{mode === "login" ? "Sign in to your workspace" : "Create your account"}</h2><p className="mt-2 text-sm leading-6 text-muted">{mode === "login" ? "Your team and customers are right where you left them." : "Join your team or create a workspace in just a moment."}</p>
      {!configured && <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Firebase needs configuring before sign-in works. See the environment setup in README.</div>}
      <form className="mt-8 space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        <label className="block text-sm font-medium text-ink">Work email<input className="field mt-2" type="email" placeholder="you@company.com" autoComplete="email" {...register("email")} />{errors.email && <span className="mt-1 block text-xs text-rose-600">{errors.email.message}</span>}</label>
        <label className="block text-sm font-medium text-ink">Password<input className="field mt-2" type="password" placeholder="At least 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} {...register("password")} />{errors.password && <span className="mt-1 block text-xs text-rose-600">{errors.password.message}</span>}</label>
        {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {notice && <div role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{notice}</div>}
        <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60">{isSubmitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={16} /></button>
      </form>
      <p className="mt-7 text-center text-sm text-muted">{mode === "login" ? "New to Northstar?" : "Already have an account?"} <Link className="font-semibold text-teal-700 hover:text-teal-800" to={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Create an account" : "Sign in"}</Link></p>
    </div></section>
  </div>;
}
