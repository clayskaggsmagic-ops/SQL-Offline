import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { problemText, userCode, expectedAnswer, errorMessage } = await req.json();

    const prompt = `
You are an expert Palantir Software Engineer acting as a mentor. A candidate is struggling with an interview question.

Problem:
${problemText}

User's Code:
${userCode}

Expected Answer / Correct Solution:
${expectedAnswer || 'N/A'}

Execution Error or Test Failure:
${errorMessage || 'The code did not produce the correct output.'}

Please explain to the user:
1. What went wrong (or where the logical flaw is).
2. A hint or a step-by-step breakdown of how to fix it, WITHOUT just giving them the exact code unless absolutely necessary.
3. Keep your tone encouraging, professional, and concise. Format your response in Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return NextResponse.json({ success: true, explanation: response.text });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
