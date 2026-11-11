"use client";

import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const supabase = createClient();
    if (!supabase) return setMessage("站点尚未配置账户服务");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMessage(error.message);
    setMessage("密码已更新，现在可以返回登录");
  }

  return <main className="mx-auto max-w-md px-4 py-16"><div className="rounded-2xl border border-slate-200 bg-white p-7"><h1 className="text-2xl font-bold">设置新密码</h1><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">新密码<input name="password" type="password" minLength={6} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>{message && <p role="status" className="text-sm text-slate-600">{message}</p>}<button className="min-h-11 w-full rounded-lg bg-indigo-600 font-semibold text-white">更新密码</button></form></div></main>;
}
