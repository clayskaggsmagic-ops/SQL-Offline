# Agent Setup Instructions

## Project Context
This is a comprehensive, production-level, local-first Next.js web application designed to prepare SWE candidates for Palantir interviews. It features two core curricula:
1. **SQL**: Incremental difficulty, executing in-browser (via WebAssembly like `sql.js`).
2. **Python**: Real SWE interview problems, executing in-browser securely (via `pyodide` or similar).

## Directives
*   **MCP Usage (CRITICAL):**
    *   **Context7 MCP (`context7_resolve-library-id`, `context7_query-docs`)**: You MUST use Context7 before installing any major dependency or using an API (e.g., Next.js App Router, `sql.js`, `pyodide`, `monaco-editor`, `@google/genai`) to ensure you are using the most up-to-date conventions and dependencies.
    *   **Stitch MCP (`stitch_create_project`, `stitch_generate_screen_from_text`)**: Use Stitch to generate high-quality, "Palantir-esque" (sleek, data-heavy, dark mode, high-contrast, professional) UIs.
    *   **Neon MCP (`neon_create_project`, `neon_run_sql`)**: Use Neon to store the curriculum (lessons, problems, test cases). The app will fetch content from here. Do *not* run user-submitted code against Neon.

*   **Security & Execution:**
    *   Never execute user-submitted SQL or Python on the backend (Next.js server or Neon database).
    *   User code must be executed client-side in an isolated WebAssembly environment (e.g., `sql.js` for SQL, `pyodide` for Python).

*   **AI Teacher:**
    *   The user provides a Gemini API key. Use it securely (server-side only, via Next.js Route Handlers).
    *   The LLM should only explain when the user clicks the "Explain" or "Get Help" button.
    *   Provide the LLM with: the problem description, the user's code, the correct answer/approach, and any execution errors.

*   **State & Firebase Prep:**
    *   Use React state and `localStorage` to save user progress.
    *   Structure the state so that swapping `localStorage` for a remote Firebase store later is trivial.

*   **General Quality:**
    *   Use TypeScript.
    *   Use Tailwind CSS for styling.
    *   Implement comprehensive error handling (e.g., when WebAssembly fails to load, or the LLM API is down).
