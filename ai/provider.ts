import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured.");
}

const ai = new GoogleGenAI({
  apiKey,
});

export async function generateWithLLM(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
   model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}