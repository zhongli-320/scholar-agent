"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) return setMessage("站点尚未配置账户服务");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setBusy(true);
    setMessage(null);

    const redirectTo = `${window.location.origin}/auth/callback`;
    const result = mode === "forgot"
      ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${redirectTo}?next=/auth/update-password` })
      : mode === "register"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
        : await supabase.auth.signInWithPassword({ email, password });

    setBusy(false);
    if (result.error) return setMessage(result.error.message);
    if (mode === "login") {
      router.push("/");
      router.refresh();
    }
    else setMessage(mode === "forgot" ? "重置邮件已发送，请检查邮箱" : "注册成功，请按邮件提示完成确认");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">{mode === "login" ? "登录 ScholarAgent" : mode === "register" ? "注册账户" : "找回密码"}</h1>
        <p className="mt-2 text-sm text-slate-600">登录后可使用智能检索、项目空间和检索历史。</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="block text-sm font-medium">邮箱<input name="email" type="email" autoComplete="email" required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
          {mode !== "forgot" && <label className="block text-sm font-medium">密码<input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={6} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>}
          {message && <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
          <button disabled={busy} className="min-h-11 w-full rounded-lg bg-indigo-600 px-4 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{busy ? "正在处理…" : mode === "login" ? "登录" : mode === "register" ? "注册" : "发送重置邮件"}</button>
        </form>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {mode !== "login" && <button type="button" onClick={() => setMode("login")} className="text-indigo-700 hover:underline">返回登录</button>}
          {mode === "login" && <><button type="button" onClick={() => setMode("register")} className="text-indigo-700 hover:underline">注册新账户</button><button type="button" onClick={() => setMode("forgot")} className="text-indigo-700 hover:underline">忘记密码</button></>}
          <Link href="/" className="text-slate-500 hover:underline">返回首页</Link>
        </div>
      </div>
    </main>
  );
}
