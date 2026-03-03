"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProgress } from "@/lib/useProgress";
import { runSQL, runSQLWithTests, parseContextTables, type SQLTestCaseResult, type DatasetTable } from "@/lib/executeSql";
import { runPython, type TestCaseResult } from "@/lib/executePython";
import dynamic from "next/dynamic";
import { Group, Panel, Separator } from "react-resizable-panels";

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-500 text-sm">
      Loading editor...
    </div>
  ),
});

// Dynamically import LessonContent to avoid SSR issues with react-markdown (ESM)
const LessonContent = dynamic(() => import("@/components/LessonContent"), {
  ssr: false,
  loading: () => (
    <div className="p-6 animate-pulse">
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mb-3" />
      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-full mb-2" />
      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6 mb-2" />
    </div>
  ),
});

/**
 * Unescape literal \n, \t, etc from DB strings.
 * The DB stores these as actual two-character sequences (backslash + n),
 * not as escape codes. We need to convert them to real whitespace.
 */
function unescapeCode(code: string): string {
  if (!code) return code;
  // The DB stores literal two-char sequences: backslash followed by n/t/r
  // In JS source, '\\' is a single backslash char, so '\\' + 'n' matches the literal \n
  return code
    .split('\\' + 'n').join('\n')
    .split('\\' + 't').join('\t')
    .split('\\' + 'r').join('\r');
}

export default function Workspace() {
  const { id } = useParams();
  const router = useRouter();
  const { progress, saveCodeDraft, markProblemCompleted, toggleStar, isLoaded } = useProgress();

  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const codeRef = useRef(""); // Always-current code value (no re-render)
  const editorRef = useRef<any>(null); // Monaco editor instance
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [output, setOutput] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [testResult, setTestResult] = useState<'pass' | 'fail' | null>(null);
  const [testCaseResults, setTestCaseResults] = useState<(TestCaseResult | SQLTestCaseResult)[]>([]);
  const [running, setRunning] = useState(false);
  const [datasetTables, setDatasetTables] = useState<DatasetTable[]>([]);
  const [sampleOutputTable, setSampleOutputTable] = useState<{ headers: string[], rows: string[][] } | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'lesson' | 'tables'>('lesson');
  const [solutionRevealed, setSolutionRevealed] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [aiMode, setAiMode] = useState<string | null>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const [flashOverlay, setFlashOverlay] = useState<'tables' | 'solution' | 'syntax' | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const flashRef = useRef<string | null>(null);
  const handleRunCodeRef = useRef<() => void>(() => { });
  const [hintLevel, setHintLevel] = useState(0); // 0 = no hints shown, 1-3 = DB hints, 4+ = AI fallback

  // One-question-at-a-time state
  const [siblingProblems, setSiblingProblems] = useState<any[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [allProblems, setAllProblems] = useState<any[]>([]);

  // Load code for a given problem (from drafts or initial_code)
  const loadCodeForProblem = useCallback((p: any) => {
    const newCode = progress.codeDrafts[p.id]
      ? progress.codeDrafts[p.id]
      : (unescapeCode(p.initial_code) ||
        (p.type === "SQL" ? "-- Write your SQL query here\n" : "# Write your Python code here\n"));
    codeRef.current = newCode;
    setCode(newCode);
    // Programmatically set Monaco editor content (if mounted)
    if (editorRef.current) {
      editorRef.current.setValue(newCode);
    }
  }, [progress.codeDrafts]);

  // Compute sample output table for any problem
  const computeSampleOutput = useCallback(async (p: any) => {
    const tc = (p.test_cases || [])[0];
    if (!tc?.expected_output) { setSampleOutputTable(null); return; }
    const raw = (tc.expected_output as string).trim();
    const isSql = /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b/i.test(raw);
    if (isSql) {
      // Run the expected SQL against the context tables to generate output
      try {
        const contextSql = unescapeCode(p.context_sql || '');
        if (!contextSql) { setSampleOutputTable(null); return; }
        const result = await runSQL(raw, contextSql);
        if (result.columns.length > 0) {
          setSampleOutputTable({
            headers: result.columns,
            rows: result.values.map(r => r.map(v => v === null ? 'NULL' : String(v))),
          });
        } else {
          setSampleOutputTable(null);
        }
      } catch {
        setSampleOutputTable(null);
      }
    } else {
      // Parse pipe-delimited or single-column newline-delimited data
      const lines = raw.split('\n').filter(l => l.trim());
      if (lines.length === 0) { setSampleOutputTable(null); return; }
      const hasPipes = lines[0].includes('|');
      const headers = hasPipes ? lines[0].split('|').map(h => h.trim()) : [lines[0].trim()];
      const rows = lines.slice(1).map(line =>
        hasPipes ? line.split('|').map(c => c.trim()) : [line.trim()]
      );
      if (!hasPipes && rows.length === 0) { setSampleOutputTable(null); return; }
      setSampleOutputTable({ headers, rows });
    }
  }, []);

  // Navigate to a specific problem within the current lesson
  const navigateToProblem = useCallback((index: number, problems: any[]) => {
    if (index < 0 || index >= problems.length) return;
    const p = problems[index];
    setProblem(p);
    setCurrentProblemIndex(index);
    loadCodeForProblem(p);
    // Reset run state
    setOutput(null);
    setError(null);
    setExplanation(null);
    setTestResult(null);
    setTestCaseResults([]);
    setSolutionRevealed(false);
    setHintLevel(0);
    setSampleOutputTable(null);
    computeSampleOutput(p);
    // Persist current index
    if (p.module_id) {
      localStorage.setItem(`sqprep_moduleProgress_${p.module_id}`, index.toString());
    }
  }, [loadCodeForProblem, computeSampleOutput]);

  // Handle clicking "Next" after solving
  const handleNextProblem = useCallback(() => {
    if (currentProblemIndex < siblingProblems.length - 1) {
      navigateToProblem(currentProblemIndex + 1, siblingProblems);
    }
  }, [currentProblemIndex, siblingProblems, navigateToProblem]);

  useEffect(() => {
    async function fetchProblem() {
      try {
        const res = await fetch("/api/curriculum");
        const data = await res.json();
        setAllProblems(data);

        const p = data.find((x: any) => x.id.toString() === id);
        if (p) {
          // Compute sibling problems (same module_id, sorted by lesson_order)
          const siblings = data
            .filter((x: any) => x.module_id === p.module_id)
            .sort((a: any, b: any) => (a.lesson_order || 0) - (b.lesson_order || 0));
          setSiblingProblems(siblings);

          // Find current index in siblings
          const idx = siblings.findIndex((x: any) => x.id.toString() === id);
          const currentIdx = idx >= 0 ? idx : 0;

          // Restore saved progress for this module (if navigating to first problem in module)
          const savedIdx = p.module_id ? localStorage.getItem(`sqprep_moduleProgress_${p.module_id}`) : null;
          const finalIdx = (idx === 0 && savedIdx !== null) ? Math.min(parseInt(savedIdx, 10), siblings.length - 1) : currentIdx;

          const targetProblem = siblings[finalIdx] || p;
          setCurrentProblemIndex(finalIdx);
          setProblem(targetProblem);

          // Compute sample output for the loaded problem
          computeSampleOutput(targetProblem);

          if (progress.codeDrafts[targetProblem.id]) {
            setCode(progress.codeDrafts[targetProblem.id]);
          } else {
            const initialCode = unescapeCode(targetProblem.initial_code) ||
              (targetProblem.type === "SQL" ? "-- Write your SQL query here\n" : "# Write your Python code here\n");
            setCode(initialCode);
          }
        }
      } catch (e) {
        console.error("Error fetching problem", e);
      } finally {
        setLoading(false);
      }
    }
    if (isLoaded) {
      fetchProblem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLoaded]);

  // Parse context_sql to extract dataset tables for SQL problems
  useEffect(() => {
    async function loadTables() {
      if (problem?.type === 'SQL' && problem.context_sql) {
        try {
          const tables = await parseContextTables(unescapeCode(problem.context_sql));
          setDatasetTables(tables);
        } catch (err) {
          console.error('Error parsing context tables:', err);
          setDatasetTables([]);
        }
      } else {
        setDatasetTables([]);
      }
    }
    loadTables();
    // Reset spoiler when problem changes
    setSolutionRevealed(false);
  }, [problem]);

  const handleRunCode = useCallback(async () => {
    if (!problem || running) return;
    setError(null);
    setOutput(null);
    setExplanation(null);
    setTestResult(null);
    setTestCaseResults([]);
    setRunning(true);

    saveCodeDraft(problem.id, codeRef.current);

    try {
      const testCases = problem.test_cases || [];

      if (problem.type === "SQL") {
        const contextSql = unescapeCode(problem.context_sql);
        if (testCases.length > 0) {
          const { userResult, testResults } = await runSQLWithTests(codeRef.current, contextSql, testCases);
          setOutput(userResult);
          setTestCaseResults(testResults);
          const allPassed = testResults.every(r => r.passed);
          setTestResult(allPassed ? 'pass' : 'fail');
          if (allPassed) markProblemCompleted(problem.id);
        } else {
          // No test cases — fallback to simple execution
          const res = await runSQL(codeRef.current, contextSql);
          setOutput(res);
          if (res.values && res.values.length > 0) {
            markProblemCompleted(problem.id);
            setTestResult('pass');
          } else {
            setTestResult('fail');
          }
        }
      } else if (problem.type === "Python") {
        const { output: pyOutput, testResults } = await runPython(codeRef.current, testCases);
        setOutput({ output: pyOutput });
        if (testResults.length > 0) {
          setTestCaseResults(testResults);
          const allPassed = testResults.every(r => r.passed);
          setTestResult(allPassed ? 'pass' : 'fail');
          if (allPassed) markProblemCompleted(problem.id);
        } else {
          // No test cases — mark as pass if code ran
          markProblemCompleted(problem.id);
          setTestResult('pass');
        }
      }
    } catch (err: any) {
      setError(err.message);
      setTestResult('fail');
    } finally {
      setRunning(false);
    }
  }, [problem, running, saveCodeDraft, markProblemCompleted]);

  // Keep ref in sync so Monaco onMount closure always calls latest
  useEffect(() => { handleRunCodeRef.current = handleRunCode; }, [handleRunCode]);

  const handleAITeacher = useCallback(async (mode: 'hint' | 'error' | 'concept' | 'complexity' | 'walkthrough') => {
    if (!problem) return;
    setAiMenuOpen(false);

    // Progressive DB hints: cycle through hint_1 → hint_2 → hint_3 → AI fallback
    if (mode === 'hint') {
      const nextLevel = hintLevel + 1;
      const dbHints = [problem.hint_1, problem.hint_2, problem.hint_3].filter(Boolean);
      if (nextLevel <= dbHints.length) {
        setAiMode('hint');
        setHintLevel(nextLevel);
        const hintText = dbHints.slice(0, nextLevel).map((h: string, i: number) => `**Hint ${i + 1}:** ${h}`).join('\n\n');
        const remaining = dbHints.length - nextLevel;
        const footer = remaining > 0 ? `\n\n*${remaining} more hint${remaining > 1 ? 's' : ''} available — click again for the next one.*` : '\n\n*All built-in hints shown. Click again for an AI-generated hint.*';
        setExplanation(hintText + footer);
        return;
      }
      // Exhausted DB hints — fall through to AI
      setHintLevel(nextLevel);
    }

    setAiMode(mode);
    setExplaining(true);
    setExplanation(null);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          type: problem.type,
          problem: problem.title,
          description: problem.description,
          code: codeRef.current,
          error: error || (testResult === 'fail' ? "The code did not produce the expected correct output." : ""),
          solutionCode: problem.solution_code || '',
          moduleName: problem.module_name || '',
          lessonSyntax: problem.lesson_syntax || ''
        })
      });
      const data = await res.json();
      if (data.explanation) {
        setExplanation(data.explanation);
      } else {
        setExplanation("Could not generate explanation.");
      }
    } catch (e) {
      setExplanation("Failed to connect to the AI Teacher.");
    } finally {
      setExplaining(false);
    }
  }, [problem, error, testResult, hintLevel]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter to run code (for non-Monaco contexts)
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunCode();
        return;
      }

      // Cmd+I to trigger AI Teacher (instant analysis)
      if ((e.metaKey || e.ctrlKey) && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        handleAITeacher('error');
        return;
      }

      // Cmd+Right to go to next problem
      if ((e.metaKey || e.ctrlKey) && e.key === "ArrowRight") {
        e.preventDefault();
        handleNextProblem();
        return;
      }

      // Cmd+Left to go to previous problem
      if ((e.metaKey || e.ctrlKey) && e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentProblemIndex > 0) {
          navigateToProblem(currentProblemIndex - 1, siblingProblems);
        }
        return;
      }

      // Cmd+/ or ? to show help
      if (((e.metaKey || e.ctrlKey) && e.key === "/") || (e.key === "?" && !e.metaKey && !e.ctrlKey)) {
        // Don't trigger if typing in editor
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "TEXTAREA" || tag === "INPUT") return;
        e.preventDefault();
        setHelpOpen(prev => !prev);
        return;
      }

      // Alt+T to toggle sidebar tab
      if (e.altKey && (e.key === "t" || e.key === "T" || e.code === "KeyT") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setSidebarTab(prev => prev === 'lesson' ? 'tables' : 'lesson');
        return;
      }

      // Hold-to-flash: Ctrl key combos for Solution/Syntax peek
      if (e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        if (e.key === "s" || e.key === "S" || e.code === "KeyS") {
          e.preventDefault();
          flashRef.current = 'solution';
          setFlashOverlay('solution');
        } else if (e.key === "l" || e.key === "L" || e.code === "KeyL") {
          e.preventDefault();
          flashRef.current = 'syntax';
          setFlashOverlay('syntax');
        }
      }

      // Hold Alt/Option alone → tables flash
      if (e.key === "Alt" && !e.metaKey && !e.ctrlKey && !e.repeat) {
        flashRef.current = 'tables';
        setFlashOverlay('tables');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt" || e.key === "Control" || e.key === "s" || e.key === "S" || e.key === "l" || e.key === "L") {
        if (flashRef.current) {
          flashRef.current = null;
          setFlashOverlay(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleRunCode, handleAITeacher, handleNextProblem, currentProblemIndex, siblingProblems, navigateToProblem]);

  // Close AI menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setAiMenuOpen(false);
      }
    };
    if (aiMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [aiMenuOpen]);

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="w-8 h-8 border-4 border-zinc-300 border-t-black rounded-full animate-spin dark:border-zinc-700 dark:border-t-white"></div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black">
        <h1 className="text-2xl font-bold mb-4 text-black dark:text-white">Problem not found</h1>
        <button onClick={() => router.push('/')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Go Back</button>
      </div>
    );
  }

  const editorLanguage = problem.type === "SQL" ? "sql" : "python";

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-black text-foreground font-sans">
      <Group orientation="horizontal" id="workspace-h" defaultLayout={{ sidebar: 30, main: 70 }}>
        {/* Left sidebar - Problem Description */}
        <Panel id="sidebar" defaultSize="30%" minSize="15%" maxSize="50%">
          <div className="h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col overflow-hidden min-h-0">
            {/* Header: Back button + Title + Difficulty */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
              <button onClick={() => router.push('/')} className="text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <span className="font-semibold text-lg">{problem.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${problem.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                problem.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                {problem.difficulty}
              </span>
              <button
                onClick={() => toggleStar(problem.id)}
                className="ml-auto p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title={(progress.starredProblems || []).includes(problem.id) ? 'Unstar this problem' : 'Star this problem'}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={(progress.starredProblems || []).includes(problem.id) ? '#facc15' : 'none'} stroke={(progress.starredProblems || []).includes(problem.id) ? '#facc15' : 'currentColor'} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            </div>

            {/* Tab Bar */}
            {problem.type === 'SQL' && datasetTables.length > 0 ? (
              <div className="flex border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <button
                  onClick={() => setSidebarTab('lesson')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${sidebarTab === 'lesson'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    Lesson
                  </span>
                  {sidebarTab === 'lesson' && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setSidebarTab('tables')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${sidebarTab === 'tables'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Tables
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold leading-none">{datasetTables.length}</span>
                  </span>
                  {sidebarTab === 'tables' && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                  )}
                </button>
              </div>
            ) : null}

            {/* Tab Content */}
            {sidebarTab === 'lesson' ? (
              /* ===== LESSON TAB ===== */
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {/* Problem Stepper Bar */}
                {siblingProblems.length > 1 && (
                  <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        Problem {currentProblemIndex + 1} of {siblingProblems.length}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {siblingProblems.filter(s => progress.completedProblems.includes(s.id) || progress.completedLessons.includes(s.id)).length} solved
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {siblingProblems.map((sib, idx) => {
                        const isCompleted = progress.completedProblems.includes(sib.id) || progress.completedLessons.includes(sib.id);
                        const isCurrent = idx === currentProblemIndex;
                        // Can navigate to: completed problems, current problem, or next unsolved
                        const highestCompletedIdx = siblingProblems.reduce((max, s, i) =>
                          (progress.completedProblems.includes(s.id) || progress.completedLessons.includes(s.id)) ? i : max, -1);
                        const canNavigate = isCompleted || isCurrent || idx <= highestCompletedIdx + 1;

                        return (
                          <button
                            key={sib.id}
                            onClick={() => canNavigate && navigateToProblem(idx, siblingProblems)}
                            disabled={!canNavigate}
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shrink-0 ${isCurrent
                              ? 'bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-800 scale-110'
                              : isCompleted
                                ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                                : canNavigate
                                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600 cursor-pointer'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 cursor-not-allowed opacity-50'
                              }`}
                            title={`${sib.title}${isCompleted ? ' ✓' : isCurrent ? ' (current)' : canNavigate ? '' : ' (locked)'}`}
                          >
                            {isCompleted ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              idx + 1
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Scrollable lesson content */}
                <div className="p-6 overflow-y-auto flex-1">
                  {/* Problem description (the teaching content) */}
                  <LessonContent content={unescapeCode(problem.description)} />

                  {/* Sample Output — show expected result table when available */}
                  {sampleOutputTable && (
                    <div className="mt-6 border border-emerald-200 dark:border-emerald-900/50 rounded-lg overflow-hidden">
                      <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-2">
                        <span className="text-sm">📊</span>
                        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Expected Output</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-emerald-50/50 dark:bg-emerald-950/20">
                              {sampleOutputTable.headers.map((h, i) => (
                                <th key={i} className="px-3 py-2 text-left font-bold text-emerald-700 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-900/40">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sampleOutputTable.rows.map((row, ri) => (
                              <tr key={ri} className={ri % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-zinc-50/50 dark:bg-zinc-900/30'}>
                                {row.map((cell, ci) => (
                                  <td key={ci} className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 border-b border-zinc-100 dark:border-zinc-800/50 font-mono">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Solution Spoiler */}
                  {problem.solution_code && (
                    <div className="mt-6 border border-amber-200 dark:border-amber-900/50 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setSolutionRevealed(!solutionRevealed)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors text-sm font-semibold text-amber-800 dark:text-amber-300"
                      >
                        <span className="flex items-center gap-2">
                          <span>{solutionRevealed ? '👁️' : '🔒'}</span>
                          {solutionRevealed ? 'Hide Solution' : 'Reveal Solution'}
                        </span>
                        <svg className={`w-4 h-4 transition-transform ${solutionRevealed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {solutionRevealed && (
                        <div className="px-4 py-3 bg-amber-50/50 dark:bg-zinc-950">
                          <div className="text-[10px] text-amber-600 dark:text-amber-500 mb-2 font-medium">⚠️ Try solving it yourself first!</div>
                          <pre className="text-xs bg-amber-100/50 dark:bg-black p-3 rounded overflow-x-auto text-zinc-800 dark:text-zinc-300 border border-amber-200/50 dark:border-amber-900/30">
                            <code>{unescapeCode(problem.solution_code)}</code>
                          </pre>
                          <button
                            onClick={() => handleAITeacher('walkthrough')}
                            disabled={explaining}
                            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            {explaining && aiMode === 'walkthrough' ? '⏳ Generating...' : '🔍 Walk Me Through It'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Next Problem Button — shown when current problem is solved */}
                  {(progress.completedProblems.includes(problem.id) || progress.completedLessons.includes(problem.id) || testResult === 'pass') &&
                    currentProblemIndex < siblingProblems.length - 1 && (
                      <button
                        onClick={handleNextProblem}
                        className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-green-600/20 hover:shadow-green-600/30 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Next Problem →
                      </button>
                    )}

                  {/* Lesson Complete indicator — shown when all problems solved */}
                  {currentProblemIndex === siblingProblems.length - 1 &&
                    (progress.completedProblems.includes(problem.id) || progress.completedLessons.includes(problem.id) || testResult === 'pass') && (
                      <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg text-center">
                        <div className="text-2xl mb-1">🎉</div>
                        <div className="text-sm font-semibold text-green-700 dark:text-green-300">Lesson Complete!</div>
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          You&apos;ve solved all {siblingProblems.length} problems in this lesson.
                        </div>
                        <button
                          onClick={() => router.push('/')}
                          className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          ← Back to Curriculum
                        </button>
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 min-h-0">
                {datasetTables.map((table) => (
                  <div key={table.name} className="border-b border-zinc-200 dark:border-zinc-800 last:border-b-0">
                    {/* Table header with name + row count */}
                    <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">{table.name}</span>
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 font-medium">
                        {table.rows.length} row{table.rows.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {/* Data table */}
                    <div>
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-zinc-100 dark:bg-zinc-900">
                            {table.columns.map((col, i) => (
                              <th key={i} className="px-3 py-1.5 text-left font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((row, i) => (
                            <tr key={i} className={`${i % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-zinc-50/80 dark:bg-zinc-900/30'} hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors`}>
                              {row.map((val, j) => (
                                <td key={j} className="px-3 py-1 text-zinc-700 dark:text-zinc-300 border-b border-zinc-100 dark:border-zinc-800/50 whitespace-nowrap">
                                  {val !== null && val !== undefined ? String(val) : <span className="text-zinc-400 dark:text-zinc-600 italic">NULL</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel >

        {/* Horizontal Resize Handle */}
        < Separator className="w-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-blue-400 dark:hover:bg-blue-600 active:bg-blue-500 dark:active:bg-blue-500 transition-colors flex items-center justify-center cursor-col-resize group relative" >
          <div className="w-0.5 h-8 bg-zinc-300 dark:bg-zinc-600 group-hover:bg-white dark:group-hover:bg-white rounded-full transition-colors" />
        </Separator >

        {/* Right side - Editor and Output */}
        < Panel id="main" defaultSize="70%" minSize="40%" >
          <Group orientation="vertical" id="workspace-v" defaultLayout={{ editor: 65, output: 35 }}>
            {/* Editor */}
            <Panel id="editor" defaultSize="65%" minSize="25%">
              <div className="h-full flex flex-col border-b border-zinc-200 dark:border-zinc-800">
                <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{problem.type} Editor</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 bg-zinc-200/50 dark:bg-zinc-800 rounded">⌘↵ Run</span>
                      <span className="text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 bg-zinc-200/50 dark:bg-zinc-800 rounded">⌘I AI</span>
                      <span className="text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 bg-zinc-200/50 dark:bg-zinc-800 rounded">⌥ Tables</span>
                      <span className="text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 bg-zinc-200/50 dark:bg-zinc-800 rounded">⌃S Solution</span>
                      <span className="text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 bg-zinc-200/50 dark:bg-zinc-800 rounded">⌃L Syntax</span>
                      <span className="text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 bg-zinc-200/50 dark:bg-zinc-800 rounded">⌥T Tabs</span>
                      <span className="text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 bg-zinc-200/50 dark:bg-zinc-800 rounded">⌘←→ Nav</span>
                    </div>
                    <button
                      onClick={() => setHelpOpen(true)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors text-sm" title="All keyboard shortcuts (⌘/ or ?)"
                    >
                      ⌨
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* AI Teacher Dropdown */}
                    <div className="relative" ref={aiMenuRef}>
                      <button
                        onClick={() => setAiMenuOpen(!aiMenuOpen)}
                        disabled={explaining}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors flex items-center gap-1.5"
                      >
                        {explaining ? '⏳' : '🧠'}
                        {explaining ? 'Thinking...' : 'AI Teacher'}
                        <span className="text-[10px] opacity-60 ml-1">⌘I</span>
                        <svg className={`w-3 h-3 transition-transform ${aiMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {aiMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                          <button
                            onClick={() => handleAITeacher('hint')}
                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors border-b border-zinc-100 dark:border-zinc-800"
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">💡 Get Hint</div>
                              {hintLevel > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-medium">
                                  {hintLevel}/3
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {hintLevel === 0 ? 'Progressive hints — click to reveal' : hintLevel < 3 ? 'Click for next hint level' : 'AI-powered hint available'}
                            </div>
                          </button>
                          <button
                            onClick={() => handleAITeacher('error')}
                            disabled={!error && testResult !== 'fail'}
                            className="w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors border-b border-zinc-100 dark:border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <div className="text-sm font-semibold text-red-700 dark:text-red-300">🔍 Explain Error</div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Debug what went wrong in your code</div>
                          </button>
                          <button
                            onClick={() => handleAITeacher('concept')}
                            className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors border-b border-zinc-100 dark:border-zinc-800"
                          >
                            <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">📚 Explain Topic</div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Learn the underlying concept in context</div>
                          </button>
                          {testResult === 'pass' && (
                            <button
                              onClick={() => handleAITeacher('complexity')}
                              className="w-full text-left px-4 py-2.5 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors border-b border-zinc-100 dark:border-zinc-800"
                            >
                              <div className="text-sm font-semibold text-purple-700 dark:text-purple-300">📊 Analyze Complexity</div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Time/space analysis + optimization tips</div>
                            </button>
                          )}
                          {solutionRevealed && problem.solution_code && (
                            <button
                              onClick={() => handleAITeacher('walkthrough')}
                              className="w-full text-left px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                            >
                              <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">🔍 Walk Me Through It</div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Step-by-step solution explanation</div>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleRunCode}
                      disabled={running}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
                    >
                      {running ? '⏳ Running...' : '▶ Run Code'}
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <MonacoEditor
                    height="100%"
                    language={editorLanguage}
                    theme="vs-dark"
                    defaultValue={code}
                    onMount={(editor, monaco) => {
                      editorRef.current = editor;
                      // ⌘↵ Run Code from inside the editor
                      editor.addAction({
                        id: 'run-code',
                        label: 'Run Code',
                        keybindings: [
                          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                        ],
                        run: () => {
                          handleRunCodeRef.current();
                        },
                      });
                    }}
                    onChange={(value) => {
                      const newCode = value || "";
                      codeRef.current = newCode;
                      // Debounced save — don't trigger re-renders on every keystroke
                      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
                      draftTimerRef.current = setTimeout(() => {
                        if (problem) saveCodeDraft(problem.id, newCode);
                      }, 500);
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      padding: { top: 16, bottom: 16 },
                      renderLineHighlight: "line",
                      automaticLayout: true,
                      tabSize: problem.type === "Python" ? 4 : 2,
                      insertSpaces: true,
                      bracketPairColorization: { enabled: true },
                      smoothScrolling: true,
                      cursorBlinking: "smooth",
                      cursorSmoothCaretAnimation: "on",
                    }}
                  />
                </div>
              </div>
            </Panel>

            {/* Vertical Resize Handle */}
            <Separator className="h-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-blue-400 dark:hover:bg-blue-600 active:bg-blue-500 dark:active:bg-blue-500 transition-colors flex items-center justify-center cursor-row-resize group">
              <div className="h-0.5 w-8 bg-zinc-300 dark:bg-zinc-600 group-hover:bg-white dark:group-hover:bg-white rounded-full transition-colors" />
            </Separator>

            {/* Output */}
            <Panel id="output" defaultSize="35%" minSize="15%">
              <div className="h-full flex flex-col bg-white dark:bg-zinc-950 overflow-hidden relative">

                {/* Test Result Summary Banner */}
                {testResult === 'pass' && (
                  <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-xs font-bold px-4 py-1.5 flex items-center justify-between gap-2 z-10 shadow-sm">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {testCaseResults.length > 0
                        ? `✅ ${testCaseResults.filter(r => r.passed).length}/${testCaseResults.length} test cases passed — All correct!`
                        : 'Correct Output! Great job.'}
                    </div>
                    <button
                      onClick={() => handleAITeacher('complexity')}
                      disabled={explaining}
                      className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-[11px] rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      📊 {explaining && aiMode === 'complexity' ? 'Analyzing...' : 'Analyze Complexity'}
                    </button>
                  </div>
                )}
                {testResult === 'fail' && (
                  <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs font-bold px-4 py-1.5 flex items-center justify-between z-10 shadow-sm">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {testCaseResults.length > 0
                        ? `❌ ${testCaseResults.filter(r => r.passed).length}/${testCaseResults.length} test cases passed`
                        : 'Incorrect Output or Error.'}
                    </div>
                    <button
                      onClick={() => handleAITeacher('error')}
                      disabled={explaining}
                      className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-[11px] rounded transition-colors disabled:opacity-50"
                    >
                      {explaining ? "Asking AI Teacher..." : "🔍 Explain Error"}
                    </button>
                  </div>
                )}

                <div className={`bg-zinc-100 dark:bg-zinc-900 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center shrink-0 ${testResult ? 'pt-8' : ''}`}>
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Output / Test Results</span>
                </div>
                <div className="p-4 flex-1 overflow-auto font-mono text-sm text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap">
                  {error && (
                    <div className="text-red-600 dark:text-red-400 mb-4">
                      <div className="font-bold mb-2 flex items-center justify-between">
                        <span>Execution Error:</span>
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded border border-red-100 dark:border-red-900/50">
                        {error}
                      </div>
                    </div>
                  )}

                  {explanation && (
                    <div className={`mb-4 p-4 border rounded-md font-sans ${aiMode === 'complexity' ? 'border-purple-200 bg-purple-50 dark:border-purple-900/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200'
                      : aiMode === 'walkthrough' ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                        : aiMode === 'hint' ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                          : aiMode === 'concept' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                            : 'border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                      }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="text-base">
                            {aiMode === 'hint' ? '💡' : aiMode === 'concept' ? '📚' : aiMode === 'complexity' ? '📊' : aiMode === 'walkthrough' ? '🔍' : '🧠'}
                          </span>
                          {aiMode === 'hint' ? `Hint (Level ${hintLevel})` : aiMode === 'concept' ? 'Concept Explanation' : aiMode === 'complexity' ? 'Complexity Analysis' : aiMode === 'walkthrough' ? 'Solution Walkthrough' : 'AI Teacher'}
                        </div>
                        <button
                          onClick={() => setExplanation(null)}
                          className="opacity-60 hover:opacity-100 transition-opacity text-xs"
                        >
                          ✕ Dismiss
                        </button>
                      </div>
                      <div className="text-sm leading-relaxed ai-explanation-content"><LessonContent content={explanation} /></div>
                    </div>
                  )}

                  {/* Per-Test-Case Results */}
                  {testCaseResults.length > 0 && (
                    <div className="space-y-2 mb-4 font-sans">
                      {testCaseResults.map((tc, idx) => (
                        <div
                          key={tc.id}
                          className={`rounded-lg border p-3 ${tc.passed
                            ? 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20'
                            : 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
                            }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{tc.passed ? '✅' : '❌'}</span>
                            <span className="font-semibold text-sm">
                              Test Case {idx + 1}
                              {tc.hidden && <span className="text-zinc-400 font-normal ml-1">(hidden)</span>}
                            </span>
                          </div>
                          {!tc.hidden && (
                            <div className="text-xs space-y-1 mt-2">
                              <div>
                                <span className="text-zinc-500 dark:text-zinc-400">Input: </span>
                                <span className="font-mono text-zinc-700 dark:text-zinc-300">{tc.input}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 dark:text-zinc-400">Expected: </span>
                                <span className="font-mono text-zinc-700 dark:text-zinc-300">{tc.expected}</span>
                              </div>
                              {!tc.passed && (
                                <div>
                                  <span className="text-zinc-500 dark:text-zinc-400">Actual: </span>
                                  <span className="font-mono text-red-600 dark:text-red-400">{tc.actual}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Raw Output (SQL table or Python stdout) */}
                  {output && !error && problem.type === "SQL" && output.columns && output.columns.length > 0 && (
                    <div className="overflow-x-auto mt-2">
                      <div className="text-xs font-semibold text-zinc-500 mb-2 font-sans uppercase tracking-wider">Your Query Results</div>
                      <table className="min-w-full text-left border-collapse">
                        <thead>
                          <tr>
                            {output.columns.map((col: string, i: number) => (
                              <th key={i} className="border-b border-zinc-200 dark:border-zinc-700 pb-2 pr-4 font-semibold text-zinc-600 dark:text-zinc-400">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {output.values.map((row: any[], i: number) => (
                            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                              {row.map((val: any, j: number) => (
                                <td key={j} className="border-b border-zinc-100 dark:border-zinc-800/50 py-2 pr-4">{val !== null ? val.toString() : 'NULL'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {output && !error && problem.type === "Python" && output.output && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-zinc-500 mb-2 font-sans uppercase tracking-wider">Console Output</div>
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded border border-zinc-200 dark:border-zinc-800/50">
                        {output.output}
                      </div>
                    </div>
                  )}

                  {!output && !error && !explanation && testCaseResults.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 italic">
                      <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      Run code to see output...
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          </Group>
        </Panel >
      </Group >

      {/* Flash Overlays — show while key is held */}
      {
        flashOverlay === 'tables' && (datasetTables.length > 0 || sampleOutputTable) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-blue-300 dark:border-blue-700 p-6 max-w-3xl w-full max-h-[80vh] overflow-auto">
              <div className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                🗂️ Dataset Tables
                <span className="text-[10px] font-normal text-zinc-400 ml-auto">Hold ⌥ to peek</span>
              </div>
              {datasetTables.map((table) => (
                <div key={table.name} className="mb-4">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">{table.name} <span className="text-zinc-400 font-normal">({table.rows.length} rows)</span></div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border-collapse">
                      <thead>
                        <tr>{table.columns.map((col, i) => <th key={i} className="border-b border-zinc-200 dark:border-zinc-700 pb-1 pr-3 text-left font-semibold text-zinc-600 dark:text-zinc-400">{col}</th>)}</tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row, ri) => (
                          <tr key={ri}>{row.map((val: any, ci: number) => <td key={ci} className="pr-3 py-0.5 text-zinc-700 dark:text-zinc-300">{val === null ? <span className="italic text-zinc-400">NULL</span> : String(val)}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {/* Expected Output in flash overlay */}
              {sampleOutputTable && (
                <div className="mt-2 pt-3 border-t border-emerald-200 dark:border-emerald-800">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 flex items-center gap-1">📊 Expected Output</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border-collapse">
                      <thead>
                        <tr>{sampleOutputTable.headers.map((h, i) => <th key={i} className="border-b border-emerald-200 dark:border-emerald-700 pb-1 pr-3 text-left font-semibold text-emerald-600 dark:text-emerald-400">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {sampleOutputTable.rows.map((row, ri) => (
                          <tr key={ri}>{row.map((cell, ci) => <td key={ci} className="pr-3 py-0.5 text-zinc-700 dark:text-zinc-300 font-mono">{cell}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }

      {
        flashOverlay === 'solution' && problem.solution_code && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
            <div className="bg-amber-50 dark:bg-zinc-900 rounded-xl shadow-2xl border border-amber-300 dark:border-amber-700 p-6 max-w-2xl w-full max-h-[70vh] overflow-auto opacity-90">
              <div className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-2">
                👁️ Solution Peek
                <span className="text-[10px] font-normal text-zinc-400 ml-auto">Hold ⌃S to peek</span>
              </div>
              <pre className="text-xs font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap bg-amber-100/50 dark:bg-black/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <code>{unescapeCode(problem.solution_code)}</code>
              </pre>
            </div>
          </div>
        )
      }

      {
        flashOverlay === 'syntax' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
            <div className="bg-emerald-50 dark:bg-zinc-900 rounded-xl shadow-2xl border border-emerald-300 dark:border-emerald-700 p-6 max-w-lg w-full max-h-[70vh] overflow-auto">
              <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-3 flex items-center gap-2">
                📖 Lesson Syntax
                <span className="text-[10px] font-normal text-zinc-400 ml-auto">Hold ⌃L to peek</span>
              </div>
              {problem.lesson_syntax ? (
                <pre className="text-xs font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap bg-emerald-100/50 dark:bg-black/30 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  {problem.lesson_syntax}
                </pre>
              ) : (
                <div className="text-sm text-zinc-500 italic">No syntax reference available for this problem yet.</div>
              )}
            </div>
          </div>
        )
      }

      {/* Keyboard Help Modal */}
      {
        helpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setHelpOpen(false)}>
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">⌨ Keyboard Shortcuts</h3>
                <button onClick={() => setHelpOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Execute</div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-700 dark:text-zinc-300">Run Code</span>
                    <kbd className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono text-zinc-600 dark:text-zinc-400">⌘ Enter</kbd>
                  </div>
                </div>
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Peek (Hold to Flash)</div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-700 dark:text-zinc-300">Dataset Tables</span>
                    <kbd className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono text-zinc-600 dark:text-zinc-400">⌥</kbd>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-700 dark:text-zinc-300">Solution Peek</span>
                    <kbd className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono text-zinc-600 dark:text-zinc-400">⌃ S</kbd>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-700 dark:text-zinc-300">Lesson Syntax</span>
                    <kbd className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono text-zinc-600 dark:text-zinc-400">⌃ L</kbd>
                  </div>
                </div>
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Navigate</div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-700 dark:text-zinc-300">Next Problem</span>
                    <kbd className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono text-zinc-600 dark:text-zinc-400">⌘ →</kbd>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-700 dark:text-zinc-300">Previous Problem</span>
                    <kbd className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono text-zinc-600 dark:text-zinc-400">⌘ ←</kbd>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">General</div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-700 dark:text-zinc-300">This Help Menu</span>
                    <kbd className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono text-zinc-600 dark:text-zinc-400">⌘ /</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
