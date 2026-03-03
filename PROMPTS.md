# Palantir SWE Prep — Sequential Prompts

> Copy and paste these prompts **one at a time, in order**. Each builds on the previous.
> Read SOUL.md first — this is a **curriculum-based learning platform**, not a problem bank.
> Prompts 1–8 have been completed and removed. Current work starts at Prompt 8.5.

---

## Prompt 8.5: Scrape LeetCode Top SQL 50 Problem Bank ✅ COMPLETED

```
Scrape EVERY SINGLE problem from the LeetCode Top SQL 50 Study Plan
(https://leetcode.com/studyplan/top-sql-50/) into leetproblems.md.

1. Navigate to the study plan page and extract all 50 problem titles and URLs
2. For EACH problem, scrape the full description including:
   - Table schemas (column names, types, primary keys, foreign keys)
   - Problem statement / question
   - Example input/output tables with explanations
   - Constraints
3. Format as a numbered list (1-50) matching the study plan order
4. Write everything to /Users/clayskaggs/Developer/palantir-prep/SQL-Offline/leetproblems.md
```

---

## Prompt 9: One-Question-at-a-Time Flow

```
Refactor the SQL workspace at /Users/clayskaggs/Developer/palantir-prep/SQL-Offline/palantir-prep so exercises are presented ONE AT A TIME instead of listing all exercises in the lesson:

1. SINGLE QUESTION VIEW: When the user opens a lesson, show ONLY the first exercise (problem title, description, and the code editor loaded with that problem's starter code). Do NOT list all exercises in the lesson panel at once.

2. PROGRESSION: When the user solves the current exercise (test passes), show a "Next →" button or auto-advance to the next exercise. The lesson sidebar should show a progress indicator (e.g., "Problem 2 of 6") and small dots or checkmarks for completed problems.

3. LESSON CONTENT STAYS VISIBLE: The lesson concept explanation (the teaching material at the top) should always be visible above the current exercise. Only the exercise prompt changes as the user progresses.

4. NAVIGATION: Let the user go back to previous problems they've already completed (but not skip ahead to unsolved ones). A small problem list/stepper in the sidebar showing completed vs current vs locked.

5. STATE PERSISTENCE: Save which problem the user is on per-lesson in localStorage so they can resume where they left off.

This is critical — the platform needs to feel like a guided tutor walking you through problems one by one, not a problem bank dumping everything at once.

Test in the browser at localhost:3000. Show screenshots of the single-question flow and progression.
```

---

## Prompt 10: Fix SQL Editor Cursor Jumping

```
Fix the SQL code editor cursor jumping bug at /Users/clayskaggs/Developer/palantir-prep/SQL-Offline/palantir-prep:

1. BUG: When typing in the SQL editor, the cursor jumps around erratically — it doesn't stay where the user is typing. This makes the editor unusable for writing real queries.

2. DIAGNOSE: This is likely caused by:
   - React re-renders resetting the editor state (controlled component with setState on every keystroke)
   - The code state being updated in a way that triggers a full re-render of the editor component
   - If using Monaco Editor: the value prop being set on every render, overwriting cursor position
   - If using a textarea: similar controlled-component cursor reset issue

3. FIX: Use the appropriate pattern for the editor type:
   - Monaco: Use `onChange` handlers that don't re-set the value prop (use refs or `onDidChangeModelContent`)
   - Textarea: Use `useRef` for the actual value + controlled updates only when needed (not on every keystroke)
   - Ensure `useCallback` and `React.memo` prevent unnecessary re-renders of the editor

4. VERIFY: Type a multi-line SQL query smoothly without any cursor jumping. Test with fast typing, backspace, arrow key navigation, and copy-paste.

Test in the browser. Show a recording or screenshots of smooth editing.
```

---

## Prompt 11: Immersive Lesson Formatting

```
Redesign the lesson content rendering in the left sidebar at /Users/clayskaggs/Developer/palantir-prep/SQL-Offline/palantir-prep to be visually immersive and polished:

1. SYNTAX/KEYWORD BOXES: When the lesson mentions a SQL keyword or function (e.g., SELECT, WHERE, JOIN, GROUP BY), render it in a styled inline code box — monospace font, colored background, slightly rounded. Make it pop visually so learners immediately recognize "this is a keyword I need to remember."

2. CODE EXAMPLES: Any code snippets in the lesson content should be in proper syntax-highlighted code blocks with a dark background, copy button, and clear visual separation from the surrounding text.

3. STRUCTURED FORMATTING:
   - Use bullet points and numbered lists for multi-step explanations
   - Use callout boxes / info panels for "💡 Pro Tip" or "⚠️ Common Mistake" notes
   - Use clear section headers with visual hierarchy (concept → syntax → examples → exercises)
   - Tables for showing syntax patterns (e.g., "Operator | Meaning | Example")

4. VISUAL BREATHING ROOM: Add proper spacing, padding, and visual rhythm. The lesson should feel like reading a polished interactive textbook, not a raw text dump.

5. CONTENT UPDATES: Update the lesson content in the Neon database for all SQL lessons to use Markdown formatting that the renderer can parse into these rich elements. The lesson content should include:
   - Headers (##)
   - Inline code (`backticks`)
   - Code blocks (triple backticks with sql language tag)
   - Bullet/numbered lists
   - Bold/italic emphasis
   - Callout markers (> 💡, > ⚠️)

6. MARKDOWN RENDERER: Use a Markdown rendering library (e.g., react-markdown + rehype-highlight or remark-gfm) to parse and render the lesson content with proper styling.

The lesson panel should feel like Notion or a premium coding tutorial — clean, scannable, and visually engaging.

Test in the browser. Show screenshots of the improved lesson formatting.
```

---

## Prompt 11.5: Seed Missing SQL Challenge & Puzzle Problems

```
Audit and seed ALL missing SQL content from SQLBolt at /Users/clayskaggs/Developer/palantir-prep/SQL-Offline/palantir-prep:

1. AUDIT: Go through the original SQLBolt site (https://sqlbolt.com) and compare against what's currently in the Neon database. Identify ALL missing content including:
   - Challenge problems / review exercises at the end of each section
   - Hard puzzle problems
   - Any lessons or exercises that were skipped in the original migration
   - Advanced topics (subqueries, CASE, UNION, window functions, etc.)

2. SEED MISSING CONTENT: For every missing exercise, add it to the Neon database with:
   - Correct lesson and module placement
   - Problem title, description, initial_code, solution_code
   - context_sql (the CREATE TABLE + INSERT statements needed)
   - Test cases that validate the expected output
   - Proper lesson_order so they appear in the right sequence

3. CHALLENGE PROBLEMS ARE HIGHEST PRIORITY: The challenge and puzzle problems are the most important exercises in the entire platform. They test real understanding, not just syntax recall. Make sure ALL of them are included.

4. Verify all new problems load and run correctly in the browser.

Test at localhost:3000. Show which problems were added and confirm they work.
```

---

## Prompt 12: Research Palantir's Interview Process

```
Before adding any Python/algorithm problems, do thorough research on Palantir's actual SWE interview process. I need you to:

1. Search Glassdoor, Blind, LeetCode Discuss, and Reddit (r/cscareerquestions) for Palantir SWE interview experiences
2. Document what types of problems they actually ask (graphs? DP? system design? SQL?)
3. What difficulty level do they target?
4. What's the interview structure? (phone screen, onsite rounds, decomposition round)
5. What specific problems have people reported being asked?
6. What skills do they emphasize beyond pure algo (code quality, communication, edge cases)?

Write your findings to /Users/clayskaggs/Developer/palantir-prep/SQL-Offline/PALANTIR_RESEARCH.md

Use this research to design the Python curriculum MODULES (see SOUL.md) — don't just dump problems, organize them into a learning path with compounding concepts and review sections.
```

---

## Prompt 13: Design Python Curriculum Modules

```
Based on the Palantir research in PALANTIR_RESEARCH.md and the curriculum philosophy in SOUL.md, design the full Python/Algorithm curriculum as MODULES.

Each module should:
- Teach a concept first (explanation + syntax reference + key patterns)
- Have 3-6 exercises that reinforce the concept, progressing in difficulty
- End with a review section mixing problems from that module
- Build on concepts from previous modules

Proposed module structure (adjust based on research):

MODULE A: Foundations (Arrays, Strings, Hash Maps)
MODULE B: Pointer Techniques (Two Pointers, Sliding Window)
MODULE C: Searching & Sorting (Binary Search, Merge Sort patterns)  
MODULE D: Linear Data Structures (Stacks, Queues, Linked Lists)
MODULE E: Trees & Graphs (Palantir Priority 1 — BFS, DFS, Topological Sort)
MODULE F: Dynamic Programming (1D DP, Multi-dimensional DP)
MODULE G: Implementation & OOD (Palantir Priority 2 — LRU Cache, Design problems)
MODULE H: Palantir Classics ("Always Asked" problems that transcend modules — curated from interview reports)

Write the full curriculum design to /Users/clayskaggs/Developer/palantir-prep/SQL-Offline/PYTHON_CURRICULUM.md

Include for each module: lesson content outline, exercise list (curated from LeetCode Top 150 + Palantir-specific), and which problems to skip (with reasons). Don't seed anything yet — this is the design doc.
```

---

## Prompt 14: Seed Python Modules A-C (Foundations → Searching)

```
Seed Python Modules A, B, and C into the Neon database (project weathered-tree-22317939) based on the curriculum design in PYTHON_CURRICULUM.md.

For EACH lesson in each module include:
- Lesson content (concept explanation — this IS the teaching material)
- Exercises with: title, description, initial_code (function signature + pass), solution_code
- `module_id`, `module_name`, `lesson_order` fields
- `lesson_syntax` (compact syntax reference for that lesson)
- 3 test cases per exercise in the `test_cases` table
- 3-tier hints (nudge → approach → walkthrough)
- Difficulty calibrated to Palantir's bar
- Tagged by Palantir interview round relevance

Include review sections at the end of each module.

Verify by loading localhost:3000 and confirming modules appear in order, exercises run, and test cases validate correctly.
```

---

## Prompt 15: Seed Python Modules D-E (Data Structures → Graphs)

```
Seed Python Modules D and E into the Neon database (project weathered-tree-22317939).

Module D: Linear Data Structures (Stacks, Queues, Linked Lists)
Module E: Trees & Graphs (Palantir Priority 1)

Same requirements as Prompt 14:
- Full lesson content, exercises, solutions, test cases, hints
- Module/lesson ordering fields
- Lesson syntax references
- Review sections at the end of each module
- Palantir round tags and calibrated difficulty

Verify in browser.
```

---

## Prompt 16: Seed Python Modules F-H (DP → Implementation → Palantir Classics)

```
Seed Python Modules F, G, and H into the Neon database (project weathered-tree-22317939).

Module F: Dynamic Programming (1D DP, Multi-dimensional DP, Kadane's)
Module G: Implementation & OOD (Palantir Priority 2 — LRU Cache, Design problems)
Module H: Palantir Classics — curated "always asked" problems from Glassdoor/Blind reports that don't fit neatly into one module. Each problem should link back to the relevant curriculum module that teaches the underlying concept. These are the highest-ROI problems for last-minute prep.

Same requirements as previous seeding prompts:
- Full lesson content, exercises, solutions, test cases, hints
- Module/lesson ordering fields
- Lesson syntax references  
- Review sections at the end of each module
- Palantir round tags and calibrated difficulty

Verify in browser.
```

---

## Prompt 17: AI Teacher Enhancements

```
Enhance the AI Teacher in the Palantir SWE Prep app at /Users/clayskaggs/Developer/palantir-prep/SQL-Offline/palantir-prep:

1. PROGRESSIVE DB HINTS: Add a "Get Hint" button that cycles through Hint 1 → Hint 2 → Hint 3 from the database before falling back to AI-generated hints. Each click reveals the next level.

2. CONCEPT EXPLAINER: Add an "Explain Topic" button that uses Gemini to explain the underlying algorithm (e.g., "What is BFS and when do I use it?") based on the problem's module and lesson context.

3. COMPLEXITY ANALYSIS: After a correct solution, show an AI-generated time/space complexity analysis with optimization suggestions.

4. SOLUTION WALKTHROUGH: After the user reveals the solution, offer a "Walk Me Through It" button that explains the solution step-by-step, connecting it to the lesson concepts.

All AI features use the Gemini API key from .env.local via the /api/explain route handler. Test each feature in the browser.
```

---

## Prompt 18: Final Polish & QA

```
Do a final polish pass on the Palantir SWE Prep app at /Users/clayskaggs/Developer/palantir-prep/SQL-Offline/palantir-prep:

1. Open every single module and verify:
   - Lessons load in correct order within modules
   - Concept explanations render properly
   - Code editor works (Monaco, syntax highlighting)
   - Test cases run and show pass/fail
   - Hints work (3 tiers from DB, then AI fallback)
   - AI Teacher works (all 3 modes + keyboard shortcut)
   - Progress saves correctly per-module
   - Hold-to-flash shortcuts work (Opt for tables, Opt+S for answer, Opt+L for lesson syntax)
   - Keyboard shortcuts help modal works (Cmd+/ or ?)
   - Draggable panels persist sizes

2. Fix any remaining UI issues — spacing, alignment, responsive behavior

3. Make sure the dark theme is consistent everywhere

4. Update the README.md with proper setup instructions:
   - How to get a Neon connection string
   - How to get a Gemini API key
   - How to run locally (npm install, create .env.local, npm run dev)
   - Document all keyboard shortcuts in the README

5. Update the TODO.md — check off everything that's done

6. Do NOT deploy yet — that's Prompt 20.

Show me a final walkthrough with screenshots of the finished app.
```

---

## Prompt 19: Security Audit

```
Do a full security audit of the Palantir SWE Prep app at /Users/clayskaggs/Developer/palantir-prep/SQL-Offline/palantir-prep before deployment:

1. API ROUTES: Review `/api/curriculum` and `/api/explain` for:
   - Rate limiting (add if missing)
   - Input sanitization on the `/api/explain` endpoint (user sends arbitrary code to Gemini)
   - Parameterized queries for all DB access (no string interpolation)

2. SECRETS: Verify `GEMINI_API_KEY` and `DATABASE_URL` are NEVER exposed to the client bundle:
   - Check that Next.js only uses them in server-side code (API routes, not client components)
   - Search the built output for any leaked environment variables
   - Ensure `.env.local` is in `.gitignore`

3. CLIENT-SIDE SAFETY:
   - sql.js runs user SQL in an in-memory WASM sandbox — verify no filesystem access
   - Pyodide runs user Python in a WASM sandbox — verify no network/filesystem escape
   - Ensure no user input is rendered as raw innerHTML (XSS prevention)

4. HEADERS: Set appropriate CSP (Content Security Policy) and CORS headers for production

5. DEPENDENCIES: Run `npm audit` and fix critical/high vulnerabilities

6. Report findings and fixes.
```

---

## Prompt 20: Deploy to Firebase

```
Deploy the Palantir SWE Prep app to Firebase Hosting. The app is at /Users/clayskaggs/Developer/palantir-prep/SQL-Offline/palantir-prep.

1. DECIDE DEPLOYMENT STRATEGY:
   - Option A: Firebase App Hosting (supports Next.js SSR natively — preferred)
   - Option B: Static export + Firebase Functions for API routes
   - Choose the best option and explain trade-offs

2. INITIALIZE FIREBASE:
   - `firebase init` in the project directory
   - Configure hosting, and functions if needed
   - Set up environment variables (DATABASE_URL, GEMINI_API_KEY) via Firebase secrets

3. BUILD & DEPLOY:
   - Run `npm run build` and verify the production build works
   - Deploy with `firebase deploy`
   - Verify the live URL loads correctly

4. POST-DEPLOY VERIFICATION:
   - All modules and lessons load from Neon DB in correct order
   - SQL WASM file loads (check that sql-wasm-browser.wasm is served with correct MIME type)
   - Python/Pyodide loads and executes
   - AI Teacher / Gemini API works
   - Monaco Editor loads
   - All keyboard shortcuts work
   - Test cases run and validate

5. OPTIONAL:
   - Configure custom domain if desired
   - Set up CI/CD auto-deploy from the CargoTest branch via GitHub Actions or Firebase App Hosting

Share the live URL when done.
```
