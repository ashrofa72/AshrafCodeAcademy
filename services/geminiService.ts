import { GoogleGenAI } from "@google/genai";
import { ProgrammingLanguage } from '../types';

// Initialize the Google GenAI client.
// The API key is retrieved directly from process.env.API_KEY as required by build tools (Vite/Webpack)
// to perform string replacement during deployment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCodeSolution = async (
  language: ProgrammingLanguage,
  question: string
): Promise<string> => {
  try {
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

    const response = await ai.models.generateContent({
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