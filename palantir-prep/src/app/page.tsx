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
};

export default function Home() {
  const [curriculum, setCurriculum] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { progress, isLoaded } = useProgress();

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
          {curriculum.filter((item) => isCompleted(item.id)).length} / {curriculum.length} Completed
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
          <div className="grid gap-4">
            {curriculum.map((item) => {
              const completed = isCompleted(item.id);
              return (
                <Link
                  key={item.id}
                  href={`/workspace/${item.id}`}
                  className="block group"
                >
                  <div className={`p-5 rounded-xl border transition-all duration-200 flex items-center justify-between ${completed ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/30' : 'bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${completed ? 'bg-green-500 text-white' : 'border-2 border-zinc-300 dark:border-zinc-700'}`}>
                        {completed && (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 uppercase tracking-wider">
                            {item.type}
                          </span>
                          <span className={`text-xs font-medium ${
                            item.difficulty === 'Easy' ? 'text-green-600 dark:text-green-400' :
                            item.difficulty === 'Medium' ? 'text-amber-600 dark:text-amber-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {item.difficulty}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1 line-clamp-1">
                          {item.description}
                        </p>
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
      </main>
    </div>
  );
}
