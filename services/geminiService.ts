
import { GoogleGenAI } from "@google/genai";
import { ProgrammingLanguage } from '../types';

// Initialize the Google GenAI client lazily to prevent app crashes at startup
// if the API key is missing in the environment (common in fresh Vercel deploys).
let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (ai) return ai;

  // Attempt to get key from process.env (Node/Webpack)
  // Note: In Vite, this requires appropriate config or replacement during build.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("Configuration Error: API_KEY is missing. Please add it to your Vercel Environment Variables.");
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
