"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { download } from "@/components/citation-actions";
import { toBibtex, toRis } from "@/lib/citations";
import type { Work } from "@/lib/openalex";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type SavedWork = Database["public"]["Tables"]["saved_works"]["Row"];

export default function ProjectsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedWork[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      if (!supabase) return setReady(true);
      const { data: userData } = await supabase.auth.getUser();
      setUserId(userData.user?.id ?? null);
      if (!userData.user) return setReady(true);
      const { data } = await supabase.from("projects").select("*").order("created_at");
      setProjects(data ?? []);
      setSelectedId(data?.[0]?.id ?? null);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      if (!selectedId) return setSaved([]);
      const { data } = await createClient()?.from("saved_works").select("*").eq("project_id", selectedId).order("created_at") ?? { data: null };
      setSaved(data ?? []);
    })();
  }, [selectedId]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) return;
    const { data, error } = await createClient()!.from("projects").insert({ user_id: userId, name }).select().single();
    if (error) return setMessage("创建项目失败");
    form.reset();
    setProjects((current) => [...current, data]);
    setSelectedId(data.id);
  }

  async function renameProject(project: Project) {
    const name = window.prompt("新的项目名称", project.name)?.trim();
    if (!name || name === project.name) return;
    const { error } = await createClient()!.from("projects").update({ name }).eq("id", project.id);
    if (error) return setMessage("重命名失败");
    setProjects((current) => current.map((item) => item.id === project.id ? { ...item, name } : item));
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`确定删除“${project.name}”吗？项目内收藏和笔记也会一并删除。`)) return;
    const { error } = await createClient()!.from("projects").delete().eq("id", project.id);
    if (error) return setMessage("删除项目失败");
    const remaining = projects.filter((item) => item.id !== project.id);
    setProjects(remaining);
    setSelectedId(remaining[0]?.id ?? null);
  }

  async function saveNote(item: SavedWork, note: string) {
    const { error } = await createClient()!.from("saved_works").update({ note }).eq("id", item.id);
    setMessage(error ? "笔记保存失败" : "笔记已保存");
    if (!error) setSaved((current) => current.map((row) => row.id === item.id ? { ...row, note } : row));
  }

  async function removeWork(item: SavedWork) {
    if (!window.confirm("确定从项目中移除这篇论文吗？相关笔记也会删除。")) return;
    const { error } = await createClient()!.from("saved_works").delete().eq("id", item.id);
    if (!error) setSaved((current) => current.filter((row) => row.id !== item.id));
  }

  function exportProject(format: "bib" | "ris") {
    const works = saved.map((item) => item.work as unknown as Work);
    const content = works.map(format === "bib" ? toBibtex : toRis).join("\n\n");
    if (content) download(`scholar-agent.${format}`, content);
  }

  if (!ready) return <main className="mx-auto max-w-7xl px-4 py-10 text-slate-600">正在加载项目空间…</main>;
  if (!userId) return <LoginRequired feature="项目空间" />;
  const selected = projects.find((project) => project.id === selectedId) ?? null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5">
          <h1 className="text-xl font-bold">我的项目</h1>
          <form onSubmit={createProject} className="mt-4 flex gap-2"><label className="sr-only" htmlFor="project-name">项目名称</label><input id="project-name" name="name" maxLength={120} required placeholder="新项目名称" className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3" /><button className="min-h-11 rounded-lg bg-indigo-600 px-3 font-semibold text-white">＋新建</button></form>
          <div className="mt-5 space-y-2">{projects.map((project) => <button key={project.id} type="button" onClick={() => setSelectedId(project.id)} className={`min-h-11 w-full rounded-lg px-3 text-left ${project.id === selectedId ? "bg-indigo-50 font-semibold text-indigo-700" : "hover:bg-slate-50"}`}>{project.name}</button>)}{!projects.length && <p className="text-sm text-slate-500">尚无项目，请先新建。</p>}</div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          {selected ? <><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">{selected.name}</h2><p className="mt-1 text-sm text-slate-500">{saved.length} 篇收藏</p></div><div className="flex flex-wrap gap-2"><button onClick={() => exportProject("bib")} disabled={!saved.length} className="min-h-11 rounded-lg border border-slate-300 px-3 disabled:opacity-40">BibTeX</button><button onClick={() => exportProject("ris")} disabled={!saved.length} className="min-h-11 rounded-lg border border-slate-300 px-3 disabled:opacity-40">RIS</button><button onClick={() => void renameProject(selected)} className="min-h-11 rounded-lg border border-slate-300 px-3">重命名</button><button onClick={() => void deleteProject(selected)} className="min-h-11 rounded-lg border border-red-200 px-3 text-red-700">删除项目</button></div></div>{message && <p role="status" className="mt-4 rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}<div className="mt-6 space-y-4">{saved.map((item) => <SavedCard key={item.id} item={item} onSave={saveNote} onRemove={removeWork} />)}{!saved.length && <p className="rounded-xl bg-slate-50 p-6 text-slate-500">项目还没有收藏。打开论文详情即可添加。</p>}</div></> : <div className="py-16 text-center text-slate-500">在左侧新建项目后即可收藏论文和记录笔记。</div>}
        </section>
      </div>
    </main>
  );
}

function SavedCard({ item, onSave, onRemove }: { item: SavedWork; onSave: (item: SavedWork, note: string) => Promise<void>; onRemove: (item: SavedWork) => Promise<void> }) {
  const work = item.work as unknown as Work;
  const [note, setNote] = useState(item.note);
  return <article className="rounded-xl border border-slate-200 p-5"><h3 className="text-lg font-bold"><Link href={`/works/${work.id}`} className="hover:text-indigo-700">{work.title}</Link></h3><p className="mt-2 text-sm text-slate-500">{work.authors.join("、") || "作者暂无"} · {work.publicationYear ?? "年份暂无"}</p><label className="mt-4 block text-sm font-medium">个人笔记<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3" /></label><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void onSave(item, note)} className="min-h-11 rounded-lg bg-slate-900 px-4 font-semibold text-white">保存笔记</button><button type="button" onClick={() => void onRemove(item)} className="min-h-11 rounded-lg border border-red-200 px-4 text-red-700">移除收藏</button></div></article>;
}

function LoginRequired({ feature }: { feature: string }) {
  return <main className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-3xl font-bold">登录后使用{feature}</h1><p className="mt-3 text-slate-600">您的项目、笔记和历史只对当前账户可见。</p><Link href="/login" className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-5 font-semibold text-white">登录 / 注册</Link></main>;
}
