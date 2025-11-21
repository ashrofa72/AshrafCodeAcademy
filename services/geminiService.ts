import { GoogleGenAI } from "@google/genai";
import { ProgrammingLanguage } from '../types';

const apiKey = process.env.API_KEY;

// Initialize the client outside the function to reuse the instance
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

export const generateCodeSolution = async (
  language: ProgrammingLanguage,
  question: string
): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

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
    // Avoid logging full error object if it contains circular references
    console.error("Gemini API Error:", error?.message || String(error));
    throw new Error("Failed to generate code. Please try again later.");
  }
};