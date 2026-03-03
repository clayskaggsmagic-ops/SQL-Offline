# Palantir SWE Prep — Master TODO

> Curriculum-based learning platform for Palantir's SWE interview. See SOUL.md for the vision.
> Phases 1–4 completed. Phase 5 completed (Prompts 6-8). Current work starts at Phase 6.

---

## ✅ Completed Phases

- **Phase 1: Foundation** — Bug fixes, Monaco Editor, auto-validation, test cases
- **Phase 2: Workspace UX** — Dataset tables, AI Teacher 3-mode button, Hold-to-Flash shortcuts, lesson_syntax
- **Phase 3: Visual Overhaul** — Dark mode / Palantir aesthetic, sidebar nav, module grouping
- **Phase 4: SQL Curriculum** — All 18 SQLBolt lessons migrated across 5 modules with solution code
- **Phase 5: Workspace Enhancements** — Resizable panels, tabbed sidebar, AI Teacher fix + ⌘I shortcut

### 8.5: Scrape LeetCode Top SQL 50 Problem Bank ✅
- [x] Scrape all 50 problems from LeetCode Top SQL 50 Study Plan
- [x] Include full table schemas, problem statements, examples, and explanations
- [x] Write to `leetproblems.md` (2,877 lines, all 50 problems)

---

## Phase 6: UX Critical Fixes (Prompts 9-11)

### 9: One-Question-at-a-Time Flow ⚠️ HIGH PRIORITY
- [ ] Show ONE exercise at a time instead of listing all in the lesson
- [ ] Progress indicator (e.g., "Problem 2 of 6") with dots/checkmarks
- [ ] "Next →" button or auto-advance on correct answer
- [ ] Lesson concept content stays visible above current exercise
- [ ] Navigation: go back to completed problems, can't skip ahead
- [ ] Persist current problem index per-lesson in localStorage

### 10: Fix SQL Editor Cursor Jumping ⚠️ HIGH PRIORITY
- [ ] Diagnose cursor jumping bug (likely React re-render resetting editor state)
- [ ] Fix controlled-component pattern (refs, memo, or uncontrolled editor)
- [ ] Verify smooth typing: multi-line queries, backspace, arrow keys, copy-paste

### 11: Immersive Lesson Formatting
- [ ] Inline code boxes for SQL keywords (SELECT, WHERE, etc.) — monospace, colored bg
- [ ] Syntax-highlighted code blocks with dark background
- [ ] Bullets, numbered lists, callout boxes (💡 Pro Tip, ⚠️ Common Mistake)
- [ ] Section headers with visual hierarchy
- [ ] Update lesson content in Neon DB to use Markdown formatting
- [ ] Add Markdown renderer (react-markdown + rehype-highlight)

### 11.5: Seed Missing SQL Content (Challenge & Puzzle Problems)
- [ ] Audit SQLBolt for ALL missing content (challenge problems, puzzle exercises, advanced topics)
- [ ] Seed challenge problems and hard puzzle exercises into Neon DB
- [ ] These are the highest-value SQL exercises — prioritize difficulty and depth
- [ ] Verify all new problems have test cases, solutions, and proper lesson ordering

---

## Phase 7: Palantir Research & Python Curriculum Design (Prompts 12-13)

- [ ] Research Palantir's actual interview process (Glassdoor, Blind, Reddit)
- [ ] Document findings in PALANTIR_RESEARCH.md
- [ ] Design Python curriculum MODULES in PYTHON_CURRICULUM.md:
  - [ ] Module A: Foundations (Arrays, Strings, Hash Maps)
  - [ ] Module B: Pointer Techniques (Two Pointers, Sliding Window)
  - [ ] Module C: Searching & Sorting (Binary Search, Merge Sort)
  - [ ] Module D: Linear Data Structures (Stacks, Queues, Linked Lists)
  - [ ] Module E: Trees & Graphs (Palantir Priority 1)
  - [ ] Module F: Dynamic Programming
  - [ ] Module G: Implementation & OOD (Palantir Priority 2)
  - [ ] Module H: Palantir Classics ("Always Asked" — high-ROI problems that transcend modules)

---

## Phase 8: Seed Python Content (Prompts 14-16)

- [ ] Seed Modules A-C (Foundations → Searching)
- [ ] Seed Modules D-E (Data Structures → Graphs)
- [ ] Seed Modules F-H (DP → Implementation → Palantir Classics)
- [ ] Each module: lesson content, exercises, solutions, test cases, hints, review sections
- [ ] Palantir Classics: link each problem back to its relevant curriculum module

---

## Phase 9: AI Enhancements (Prompt 17)

- [ ] Progressive DB hints: cycle Hint 1 → 2 → 3 before AI fallback
- [ ] Concept Explainer: explain underlying algorithm using module/lesson context
- [ ] Complexity Analysis: time/space analysis after correct solution
- [ ] Solution Walkthrough: step-by-step explanation when solution revealed

---

## Phase 10: Final Polish & Deploy (Prompts 18-20)

- [ ] Full QA pass across all modules and lessons
- [ ] Dark theme consistency check
- [ ] README.md with setup instructions
- [ ] Security audit (API routes, secrets, client-side safety, CSP headers, npm audit)
- [ ] Deploy to Firebase (App Hosting or static export + Functions)
- [ ] Post-deploy verification
