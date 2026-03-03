import { NextResponse } from 'next/server';

function buildPrompt(
  mode: string,
  problem: string,
  description: string,
  code: string,
  error: string,
  type: string,
  solutionCode?: string,
  moduleName?: string,
  lessonSyntax?: string
): string {
  const context = `
Problem: ${problem}
Description: ${description}
Language: ${type || 'Unknown'}
${moduleName ? `Module: ${moduleName}` : ''}
${lessonSyntax ? `Lesson Syntax Reference:\n${lessonSyntax}` : ''}
User's Code:
${code}
`.trim();

  switch (mode) {
    case 'hint':
      return `
You are an expert Palantir Software Engineer acting as a patient tutor. A candidate is working on an interview question and wants a hint — NOT the answer.

${context}

Give them a progressive hint:
1. Start with a gentle NUDGE — point them toward the right concept or approach without spelling it out.
2. If their code shows they're on the right track, encourage them and suggest the next step.
3. If their code is off-track, explain WHAT to think about, not what to write.
4. NEVER give them the solution code. NEVER write the answer for them.
5. Keep it concise (3-5 sentences max). Be encouraging and professional.
6. Format in Markdown.
      `;

    case 'concept':
      return `
You are an expert Palantir Software Engineer and teacher. A candidate wants to understand the underlying concept behind this problem.

${context}

Explain the concept:
1. What is the key algorithm, data structure, or SQL concept this problem tests?
2. When and why is this concept used in real-world software engineering?
3. Give a brief, clear explanation with a simple example (different from the actual problem).
4. Mention the time/space complexity of the typical approach.
5. If it's a SQL problem, explain the relevant SQL clause/keyword and when to use it.
6. Connect this to the module theme (${moduleName || 'general'}) and how it builds on prior lessons.
7. Keep it educational but concise. Format in Markdown with headers.
      `;

    case 'complexity':
      return `
You are an expert Palantir Software Engineer analyzing a candidate's correct solution.

${context}

The candidate has SOLVED this problem correctly. Now analyze their solution:

1. **Time Complexity**: What is the Big-O time complexity? Explain which operations drive it.
2. **Space Complexity**: What is the Big-O space complexity? Account for any auxiliary structures.
3. **Optimization Suggestions**: Could this solution be more efficient? Suggest concrete improvements.
4. **SQL-Specific Analysis** (if SQL): Discuss index usage, full table scans, and whether the query plan would be efficient on large datasets.
5. **Best Practice Notes**: Any style or clarity improvements?

Format in Markdown with clear headers. Be concise but thorough. Use code examples only if suggesting an optimization.
      `;

    case 'walkthrough':
      return `
You are an expert Palantir Software Engineer doing a step-by-step code review.

Problem: ${problem}
Description: ${description}
Language: ${type || 'Unknown'}
${moduleName ? `Module: ${moduleName}` : ''}
${lessonSyntax ? `Lesson Syntax Reference:\n${lessonSyntax}` : ''}

Solution Code:
${solutionCode || code}

Walk through this solution step-by-step:
1. **High-Level Strategy**: What approach does this solution take? (1-2 sentences)
2. **Step-by-Step Breakdown**: Explain each major part of the code. Number each step.
3. **Key Concepts Used**: Which SQL/Python concepts does each step use? Connect to the lesson topics.
4. **Why It Works**: Explain the logic that makes this solution correct.
5. **Common Mistakes**: What are 1-2 common mistakes people make on this type of problem?

Format in Markdown with clear numbering. Be thorough but not verbose. The goal is to help the student LEARN, not just read.
      `;

    case 'error':
    default:
      return `
You are an expert Palantir Software Engineer acting as a mentor. A candidate is struggling with an interview question.

${context}

Execution Error or Test Failure:
${error || 'The code did not produce the correct output.'}

Please explain:
1. What went wrong (or where the logical flaw is).
2. A hint or step-by-step breakdown of how to fix it, WITHOUT giving the exact solution code unless absolutely necessary.
3. Keep your tone encouraging, professional, and concise. Format in Markdown.
      `;
  }
}

export async function POST(req: Request) {
  try {
    const { problem, description, code, error, mode, type, solutionCode, moduleName, lessonSyntax } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    console.log('[AI Teacher] API key loaded:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const prompt = buildPrompt(mode || 'error', problem, description, code, error, type, solutionCode, moduleName, lessonSyntax);

    // Use direct REST API call — more reliable than SDK in Next.js server components
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Gemini API HTTP error:', response.status, errBody);
      return NextResponse.json({ success: false, error: `Gemini API error: ${response.status}`, details: errBody }, { status: 500 });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return NextResponse.json({ success: true, explanation: text });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
