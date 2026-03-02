import { useState, useEffect } from 'react';

export interface ProgressState {
  completedLessons: number[];
  completedProblems: number[];
  codeDrafts: Record<number, string>; // problem_id -> string
}

const defaultState: ProgressState = {
  completedLessons: [],
  completedProblems: [],
  codeDrafts: {}
};

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // On mount, load from localStorage
    const saved = localStorage.getItem('palantir_prep_progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // We use setTimeout to avoid synchronous setState inside useEffect warning,
        // though strictly React 18+ handles this well.
        setTimeout(() => setProgress(parsed), 0);
      } catch (e) {
        console.error("Failed to parse progress from localStorage", e);
      }
    }
    setTimeout(() => setIsLoaded(true), 0);
  }, []);

  const saveProgress = (newState: ProgressState) => {
    setProgress(newState);
    localStorage.setItem('palantir_prep_progress', JSON.stringify(newState));
  };

  const markProblemCompleted = (problemId: number) => {
    if (!progress.completedProblems.includes(problemId)) {
      saveProgress({
        ...progress,
        completedProblems: [...progress.completedProblems, problemId]
      });
    }
  };

  const markLessonCompleted = (lessonId: number) => {
    if (!progress.completedLessons.includes(lessonId)) {
      saveProgress({
        ...progress,
        completedLessons: [...progress.completedLessons, lessonId]
      });
    }
  };

  const saveCodeDraft = (problemId: number, code: string) => {
    saveProgress({
      ...progress,
      codeDrafts: {
        ...progress.codeDrafts,
        [problemId]: code
      }
    });
  };

  return {
    progress,
    isLoaded,
    markProblemCompleted,
    markLessonCompleted,
    saveCodeDraft
  };
}
