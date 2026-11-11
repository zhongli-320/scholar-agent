import { SearchForm } from "@/components/search-form";

export default function Home() {
  return (
    <main>
      <section className="mx-auto flex min-h-[calc(100vh-65px)] max-w-6xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <p className="mb-4 rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
          基于 OpenAlex 的公开学术检索
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
          把研究问题变成可信的文献线索
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          普通检索无需登录；登录后可使用中英文关键词扩展、项目收藏、笔记、引用导出和检索历史。
        </p>
        <div className="mt-10 w-full max-w-3xl">
          <SearchForm />
        </div>
        <p className="mt-5 text-sm text-slate-500">
          中文检索可用，但结果范围取决于 OpenAlex 的实际收录。
        </p>
      </section>
    </main>
  );
}
