"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Work } from "@/lib/openalex";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

type Project = { id: string; name: string };

export function SaveWorkButton({ work }: { work: Work }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectId, setProjectId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function prepare() {
    const supabase = createClient();
    if (!supabase) return setMessage("站点尚未配置账户服务");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const { data, error } = await supabase.from("projects").select("id,name").order("created_at");
    if (error) return setMessage("无法读取项目，请稍后重试");
    setProjects(data);
    setProjectId(data[0]?.id ?? "");
  }

  async function save() {
    const supabase = createClient();
    if (!supabase || !projectId) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setMessage("请先登录");
    const { error } = await supabase.from("saved_works").insert({ user_id: data.user.id, project_id: projectId, openalex_id: work.id, work: work as unknown as Json });
    setMessage(error?.code === "23505" ? "这篇论文已在该项目中" : error ? "收藏失败，请稍后重试" : "已收藏到项目");
  }

  if (!projects) return <div><button type="button" onClick={() => void prepare()} className="min-h-11 rounded-lg bg-indigo-600 px-4 font-semibold text-white hover:bg-indigo-700">收藏到项目</button>{message && <p role="status" className="mt-2 text-sm text-slate-600">{message}</p>}</div>;
  if (!projects.length) return <div><p className="text-sm text-slate-600">请先创建一个项目。</p><a href="/projects" className="mt-2 inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-4 font-semibold text-white">前往项目空间</a></div>;

  return <div><div className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="save-project">选择项目</label><select id="save-project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button type="button" onClick={() => void save()} className="min-h-11 rounded-lg bg-indigo-600 px-4 font-semibold text-white">确认收藏</button></div>{message && <p role="status" className="mt-2 text-sm text-slate-600">{message}</p>}</div>;
}
