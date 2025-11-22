
import { GoogleGenAI } from "@google/genai";
import { ProgrammingLanguage } from '../types';

// Initialize the Google GenAI client lazily to prevent app crashes at startup
let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (ai) return ai;

  // 1. Try Vite standard (Vercel default for React usually)
  // @ts-ignore
  let apiKey = import.meta.env?.VITE_API_KEY;

  // 2. Try Create React App standard
  if (!apiKey) {
    apiKey = process.env.REACT_APP_API_KEY;
  }

  // 3. Try standard Node/Process env (Fallback)
  if (!apiKey) {
    apiKey = process.env.API_KEY;
  }

  if (!apiKey) {
    throw new Error("Configuration Error: API Key is missing. Please add 'VITE_API_KEY' to your Vercel Environment Variables.");
  }

  ai = new GoogleGenAI({ apiKey });
  return ai;
};

export const generateCodeSolution = async (
  language: ProgrammingLanguage,
  question: string
): Promise<string> => {
  try {
    // Get client here, which might throw if key is missing
    const client = getAiClient();
    const modelId = 'gemini-2.5-flash';
    
    const systemPrompt = `
      You are AshrafCodeAcademy AI, an expert programming tutor for students.
      The user will ask a question related to ${language}.
      
      Your goal is to:
      1. Provide a clear, correct, and optimized solution in ${language}.
      2. If the request is HTML/CSS, provide the full code structure.
      3. Explain the code briefly after the code block.
      4. Be encouraging and helpful.
      
      Format your response using Markdown. Use \`\`\`${language.toLowerCase().replace('/', '')}\`\`\` for code blocks.
    `;

    const response = await client.models.generateContent({
      model: modelId,
      contents: question,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4, // Lower temperature for more deterministic code
      },
    });

    return response.text || "No response generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error; // Re-throw to be handled by the UI
  }
};
