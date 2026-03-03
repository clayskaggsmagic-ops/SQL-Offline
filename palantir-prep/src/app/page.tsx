"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/useProgress";

type CurriculumItem = {
  id: number;
  type: string;
  title: string;
  difficulty: string;
  description: string;
  module_id: string;
  module_name: string;
  lesson_order: number;
};

type Module = {
  id: string;
  name: string;
  items: CurriculumItem[];
};

export default function Home() {
  const [curriculum, setCurriculum] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { progress, isLoaded } = useProgress();
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchCurriculum() {
      try {
        const res = await fetch("/api/curriculum");
        if (!res.ok) throw new Error("Failed to fetch curriculum");
        const data = await res.json();
        setCurriculum(data);
      } catch (error) {
        console.error("Error fetching curriculum:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCurriculum();
  }, []);

  const isCompleted = (id: number) => {
    return progress.completedProblems.includes(id) || progress.completedLessons.includes(id);
  };

  const isStarred = (id: number) =>
    (progress.starredProblems || []).includes(id);

  const toggleModule = (moduleId: string) => {
    setCollapsedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Group curriculum items by module
  const modules: Module[] = [];
  const moduleMap = new Map<string, Module>();
  for (const item of curriculum) {
    const key = item.module_id || 'ungrouped';
    const name = item.module_name || 'Other';
    if (!moduleMap.has(key)) {
      const mod = { id: key, name, items: [] };
      moduleMap.set(key, mod);
      modules.push(mod);
    }
    moduleMap.get(key)!.items.push(item);
  }

  const totalCompleted = curriculum.filter(item => isCompleted(item.id)).length;

  // Module difficulty color mapping
  const moduleAccent = (moduleId: string) => {
    if (moduleId === '1') return { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900', label: 'BEGINNER' };
    if (moduleId === '2' || moduleId === '3') return { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900', label: 'INTERMEDIATE' };
    if (moduleId === '4' || moduleId === '5') return { bg: 'bg-red-500', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-900', label: 'ADVANCED' };
    if (moduleId === '6') return { bg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-900', label: 'ADVANCED' };
    if (moduleId === '7') return { bg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-900', label: 'INTERMEDIATE' };
    if (moduleId === '8') return { bg: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-900', label: 'INTERMEDIATE' };
    if (moduleId === '9') return { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-900', label: 'ADVANCED' };
    if (moduleId === '10') return { bg: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-900', label: 'EXPERT' };
    if (moduleId === 'A') return { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900', label: 'PYTHON' };
    return { bg: 'bg-zinc-500', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-200 dark:border-zinc-800', label: '' };
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-foreground font-sans">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black dark:bg-white rounded flex items-center justify-center">
            <span className="text-white dark:text-black font-bold text-xl">P</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">SWE Prep Workspace</h1>
        </div>
        <div className="text-sm font-medium text-zinc-500">
          {totalCompleted} / {curriculum.length} Completed
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Curriculum</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Master SQL and Python fundamentals for your upcoming technical interview.
          </p>
        </div>

        {loading || !isLoaded ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-zinc-300 border-t-black rounded-full animate-spin dark:border-zinc-700 dark:border-t-white"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {modules.map((mod) => {
              const accent = moduleAccent(mod.id);
              const completedInModule = mod.items.filter(item => isCompleted(item.id)).length;
              const isCollapsed = collapsedModules.has(mod.id);
              return (
                <div key={mod.id} className="space-y-3">
                  {/* Module Header */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-8 rounded-full ${accent.bg}`}></div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold tracking-tight">{mod.name}</h3>
                          <span className={`text-[10px] font-bold tracking-widest ${accent.text}`}>
                            {accent.label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-500">
                          {completedInModule} / {mod.items.length} lessons completed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Progress bar */}
                      <div className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${accent.bg}`}
                          style={{ width: `${mod.items.length > 0 ? (completedInModule / mod.items.length) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Lessons */}
                  {!isCollapsed && (
                    <div className="grid gap-2 ml-4">
                      {mod.items.map((item, idx) => {
                        const completed = isCompleted(item.id);
                        return (
                          <Link
                            key={item.id}
                            href={`/workspace/${item.id}`}
                            className="block group"
                          >
                            <div className={`p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${completed ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/30' : 'bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'}`}>
                              <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${completed ? 'bg-green-500 text-white' : `border-2 ${accent.border} ${accent.text}`}`}>
                                  {completed ? (
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <span>{idx + 1}</span>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-3 mb-0.5">
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 uppercase tracking-wider">
                                      {item.type}
                                    </span>
                                    <span className={`text-xs font-medium ${item.difficulty === 'Easy' ? 'text-green-600 dark:text-green-400' :
                                      item.difficulty === 'Medium' ? 'text-amber-600 dark:text-amber-400' :
                                        'text-red-600 dark:text-red-400'
                                      }`}>
                                      {item.difficulty}
                                    </span>
                                    {isStarred(item.id) && (
                                      <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                      </svg>
                                    )}
                                  </div>
                                  <h3 className="font-semibold text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {item.title}
                                  </h3>
                                </div>
                              </div>
                              <div className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
