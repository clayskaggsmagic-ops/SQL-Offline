"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProgress } from "@/lib/useProgress";
import { runSQL } from "@/lib/executeSql";
import { runPython } from "@/lib/executePython";

export default function Workspace() {
  const { id } = useParams();
  const router = useRouter();
  const { progress, saveCodeDraft, markProblemCompleted, isLoaded } = useProgress();

  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [testResult, setTestResult] = useState<'pass' | 'fail' | null>(null);

  useEffect(() => {
    async function fetchProblem() {
      try {
        const res = await fetch("/api/curriculum");
        const data = await res.json();
        const p = data.find((x: any) => x.id.toString() === id);
        if (p) {
          setProblem(p);
          if (progress.codeDrafts[p.id]) {
            setCode(progress.codeDrafts[p.id]);
          } else {
            setCode(p.initial_code || (p.type === "SQL" ? "-- Write your SQL query here\n" : "# Write your Python code here\n"));
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
  }, [id, isLoaded, progress.codeDrafts]);

  const handleRunCode = async () => {
    if (!problem) return;
    setError(null);
    setOutput(null);
    setExplanation(null);
    setTestResult(null);

    saveCodeDraft(problem.id, code);

    try {
      if (problem.type === "SQL") {
        const res = await runSQL(code, problem.context_sql);
        setOutput(res);
        // Basic check for success
        if (res.values && res.values.length > 0) {
          markProblemCompleted(problem.id);
          setTestResult('pass');
        } else {
          setTestResult('fail');
        }
      } else if (problem.type === "Python") {
        const res = await runPython(code);
        setOutput(res);
        // Python execution success implies no crash, but we might want stronger assertions later
        markProblemCompleted(problem.id);
        setTestResult('pass');
      }
    } catch (err: any) {
      setError(err.message);
      setTestResult('fail');
    }
  };

  const handleExplainError = async () => {
    if (!problem || (!error && testResult !== 'fail')) return;
    setExplaining(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problem.title,
          description: problem.description,
          code: code,
          error: error || "The query executed but did not return the expected correct output."
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
  };

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

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-black text-foreground font-sans">
      {/* Left sidebar - Problem Description */}
      <div className="w-1/3 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <span className="font-semibold text-lg">{problem.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            problem.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            problem.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {problem.difficulty}
          </span>
        </div>
        <div className="p-6 overflow-y-auto flex-1 prose prose-sm dark:prose-invert">
          <div className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{problem.description}</div>

          {problem.solution_code && (
            <div className="mt-8 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900/50">
              <h3 className="text-sm font-semibold mb-2">Expected Solution Structure</h3>
              <pre className="text-xs bg-zinc-100 dark:bg-black p-3 rounded overflow-x-auto text-zinc-800 dark:text-zinc-300">
                <code>{problem.solution_code}</code>
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Editor and Output */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor */}
        <div className="flex-1 flex flex-col border-b border-zinc-200 dark:border-zinc-800">
          <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{problem.type} Editor</span>
            <button
              onClick={handleRunCode}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
            >
              Run Code
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => { setCode(e.target.value); saveCodeDraft(problem.id, e.target.value); }}
            className="flex-1 p-4 bg-white dark:bg-zinc-950 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            spellCheck="false"
          />
        </div>

        {/* Output */}
        <div className="h-1/3 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden relative">

          {/* Test Result Indicator Overlay */}
          {testResult === 'pass' && (
            <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-2 z-10 shadow-sm animate-in slide-in-from-top-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Correct Output! Great job.
            </div>
          )}
          {testResult === 'fail' && (
            <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs font-bold px-4 py-1.5 flex items-center justify-between z-10 shadow-sm animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Incorrect Output or Error.
              </div>
              <button
                onClick={handleExplainError}
                disabled={explaining}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-[11px] rounded transition-colors disabled:opacity-50"
              >
                {explaining ? "Asking AI Teacher..." : "Need help? Ask AI Teacher"}
              </button>
            </div>
          )}

          <div className={`bg-zinc-100 dark:bg-zinc-900 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center shrink-0 ${testResult ? 'pt-8' : ''}`}>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Output / Execution</span>
          </div>
          <div className="p-4 flex-1 overflow-auto font-mono text-sm text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap">
            {error && (
              <div className="text-red-600 dark:text-red-400">
                <div className="font-bold mb-2 flex items-center justify-between">
                  <span>Execution Error:</span>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded border border-red-100 dark:border-red-900/50">
                  {error}
                </div>
              </div>
            )}

            {explanation && (
              <div className="mb-4 p-4 border border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/30 rounded-md text-indigo-900 dark:text-indigo-200 font-sans">
                <div className="flex items-center gap-2 mb-2 font-semibold text-indigo-800 dark:text-indigo-300">
                  <span className="text-base">🧠</span> AI Teacher Explanation
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{explanation}</div>
              </div>
            )}

            {output && !error && problem.type === "SQL" && output.columns && (
              <div className="overflow-x-auto">
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

            {output && !error && problem.type === "Python" && (
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded border border-zinc-200 dark:border-zinc-800/50">
                {output.output ? output.output : <span className="text-zinc-500 italic">Code executed successfully but returned no output.</span>}
              </div>
            )}

            {!output && !error && !explanation && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 italic">
                <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Run code to see output...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
