# SOUL.md — What This Project Actually Is

> This is the single source of truth for what we're building and why. Every prompt, every feature decision, and every piece of content should trace back to the principles in this document.

---

## The Big Idea

**Palantir SWE Prep** is a **curriculum-based learning platform** for Palantir's SWE interview, not a problem bank.

This is not "a pile of LeetCode problems with a code editor." It's a structured course that teaches you the skills Palantir actually tests, in the order that makes you learn fastest. Think SQLBolt meets LeetCode meets a private tutor — the whole thing runs offline in your browser.

---

## Core Principles

### 1. Curriculum First, Problems Second
Every problem exists inside a **module** that teaches a concept. Problems are exercises that reinforce the lesson, not standalone puzzles. The student should never ask "why am I doing this?" — the lesson before the problem tells them.

**Structure of a module:**
```
Module: "Multi-Table Queries"
├── Lesson: JOINs (concept explanation + syntax reference)
│   ├── Exercise 1: Find sales for each movie (easy application)
│   ├── Exercise 2: Movies that did better internationally (medium)
│   └── Exercise 3: List movies by rating (combining concepts)
├── Lesson: OUTER JOINs (builds on previous)
│   ├── Exercise 1-3 ...
├── Lesson: NULLs (consequence of JOINs)
│   ├── Exercise 1-2 ...
└── Review: Mixed problems drawing from all lessons in the module
```

### 2. Compounding Concepts
Each module builds on the previous one. SQL starts with `SELECT *`, then adds `WHERE`, then `ORDER BY` / `LIMIT`, then `JOIN`, then aggregates, then subqueries. Python starts with arrays, then hash maps, then two pointers, then sliding window, then trees, then graphs, then DP.

No lesson assumes knowledge that hasn't been taught yet.

### 3. Review is Built In
After every 3-5 lessons, there's a **review section** that mixes problems from the lessons just completed. This forces recall and pattern recognition. The SQLBolt curriculum does this at Lesson 5 (review of Lessons 1-4) — we do it everywhere.

### 4. Three-Tier Hints, Every Problem
No problem ships without 3 levels of progressive hints:
- **Nudge**: "Think about which clause controls row filtering."
- **Approach**: "Use a WHERE clause with the BETWEEN operator."
- **Walkthrough**: Full step-by-step solution explanation (still not the code itself).

### 5. AI Teacher Augments, Doesn't Replace
The AI Teacher (Gemini) is a supplement, not the primary teaching tool. The hand-written lesson content, hints, and syntax references are the curriculum. The AI helps with:
- Debugging specific errors in the student's code
- Explaining concepts in the student's own context
- Providing complexity analysis after a correct solution
- Walking through the solution step-by-step when revealed

### 6. Palantir-Calibrated Difficulty
Difficulty labels are calibrated to Palantir's actual interview bar, not LeetCode's. A "Medium" here means "could appear in a Palantir phone screen." Every problem is tagged with which interview round it's most relevant to.

### 7. Palantir Classics — The "Always Asked" Problems
Some problems show up in Palantir interviews so consistently that they transcend any single module. These get their own **Palantir Classics** section — a curated set of must-know problems pulled from Glassdoor reports, Blind threads, and LeetCode discuss. Each classic still links back to which curriculum module teaches the underlying concept, but they're surfaced separately so a student cramming the night before can focus on the highest-ROI problems.

### 8. Offline-First, WASM-Powered
All code execution happens in the browser — SQL via sql.js (WASM), Python via Pyodide (WASM). No backend execution. The only server calls are:
- Fetching the curriculum from the Neon database
- AI Teacher (Gemini API)

---

## Curriculum Structure

### SQL Track (based on SQLBolt model)
```
Module 1: Introduction to Queries
  Lesson 1:  SELECT Basics
  Lesson 2:  WHERE Constraints (Numbers)
  Lesson 3:  WHERE Constraints (Text / LIKE)
  Lesson 4:  Filtering & Sorting (DISTINCT, ORDER BY, LIMIT)
  ★ Review:  Simple SELECT Review (uses different dataset)

Module 2: Multi-Table Queries
  Lesson 6:  INNER JOINs
  Lesson 7:  OUTER JOINs (LEFT/RIGHT/FULL)
  Lesson 8:  Handling NULLs (IS NULL, IS NOT NULL)

Module 3: Expressions & Aggregates
  Lesson 9:  Query Expressions & Aliases
  Lesson 10: Aggregates Pt. 1 (COUNT, MIN, MAX, AVG, SUM)
  Lesson 11: Aggregates Pt. 2 (GROUP BY, HAVING)
  Lesson 12: Order of Query Execution

Module 4: Data Modification
  Lesson 13: INSERT INTO
  Lesson 14: UPDATE SET
  Lesson 15: DELETE FROM

Module 5: Table Management
  Lesson 16: CREATE TABLE
  Lesson 17: ALTER TABLE
  Lesson 18: DROP TABLE

Module 6: Practice & Application
  Sandbox problems, puzzles, and challenge problems
  drawing from all modules above
```

### Python / Algorithm Track (based on Palantir interview research)
```
Module A: Foundations
  Arrays & Strings, Hash Maps, Two Sum patterns
  ★ Review

Module B: Pointer Techniques
  Two Pointers, Sliding Window
  ★ Review

Module C: Searching & Sorting
  Binary Search, Merge Sort patterns
  ★ Review

Module D: Linear Data Structures
  Stacks, Queues, Linked Lists
  ★ Review

Module E: Trees & Graphs (Palantir Priority 1)
  BFS/DFS, Topological Sort, Dijkstra, Union-Find, BSTs, Tries
  ★ Review

Module F: Dynamic Programming
  1D DP, Multi-dimensional DP, Kadane's Algorithm
  ★ Review

Module G: Implementation & OOD (Palantir Priority 2)
  LRU Cache, Design problems, System design coding
  ★ Review

Module H: Palantir Classics ("Always Asked")
  Curated from Glassdoor/Blind/LeetCode Discuss reports
  Problems that show up in every interview cycle
  Each links back to the curriculum module that teaches the concept
  (e.g., Meeting Rooms → Module B, Graph Coloring → Module E)
```

---

## What Success Looks Like

A student opens the app and sees a structured course, not 200 unrelated problems. They start at Module 1 Lesson 1, work through the concepts, and by the time they reach the Palantir Priority modules, they have all the prerequisite knowledge. Progress is tracked per-module. Reviews ensure retention. The AI Teacher fills gaps. The hold-to-flash shortcuts make referencing syntax and data friction-free.

The goal: **If you finish this curriculum, you are ready for Palantir's SWE interview.**

---

## Technical North Star

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js + Monaco Editor | Workspace, curriculum navigation |
| SQL Execution | sql.js (WASM) | In-browser SQLite |
| Python Execution | Pyodide (WASM) | In-browser Python |
| Database | Neon (Postgres) | Curriculum, test cases, lesson content |
| AI | Gemini API | Hints, error explanations, concept teaching |
| Hosting | Firebase | Production deployment |

---

## Non-Goals (Explicitly)

- This is NOT a social platform (no leaderboards, no user accounts beyond local progress)
- This is NOT a LeetCode clone (no contest mode, no daily challenges)
- This is NOT a generic learning platform (it's Palantir-specific)
- This is NOT mobile-first (desktop workspace with keyboard shortcuts is the primary UX)
