import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// Note: Ensure process.env.API_KEY is available. 
// If running locally without setup, this might be empty, which is handled in the function below.
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export const getWordExplanation = async (word: string, targetLang: 'es' | 'de') => {
  // Check if API Key is missing to provide a graceful fallback for local users
  // who just copied the files and didn't configure the environment.
  if (!apiKey) {
    return `
      <div class="text-slate-300 bg-slate-800/50 p-3 rounded border border-slate-700">
        <h4 class="font-bold text-indigo-400 mb-1">Modo Local / Sin API</h4>
        <p class="text-sm">La funcionalidad de IA está desactivada porque no se detectó una API Key.</p>
        <p class="text-xs mt-2 text-slate-500">El resto de la aplicación (Repaso y Flashcards) funciona correctamente.</p>
      </div>
    `;
  }

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Act as an expert German tutor. 
      Explain the German word "${word}" in ${targetLang === 'es' ? 'Spanish' : 'German'}.
      
      Include:
      1. The meaning.
      2. Grammatical gender (if noun).
      3. One simple example sentence in German with translation.
      4. One slightly more complex sentence in German with translation.
      
      Format the output as valid HTML (no markdown code blocks, just tags like <p>, <strong>, <em>, <ul>, <li>). 
      Keep it concise (under 150 words).
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "<p>No se pudo generar la explicación en este momento.</p>";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "<p>Hubo un error al conectar con el tutor de IA. Verifica tu conexión.</p>";
  }
};