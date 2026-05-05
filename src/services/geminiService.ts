import { GoogleGenAI, ThinkingLevel } from "@google/genai";

export async function analyzeBehavior(imageBlob: Blob) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");
      return null;
    }

    // Lazy initialization for the most up-to-date key
    const ai = new GoogleGenAI({ apiKey });
    
    // Convert blob to base64
    const base64Content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });

    const prompt = `
      Analyze this user frame for a video call reflection.
      Identify:
      1. Emotion (one word)
      2. Movement intensity (Low, Medium, High)
      3. Specific action (e.g., waving, talking, hitting, stillness)
      
      Return JSON: {"emotion": "...", "intensity": "...", "action": "..."}
    `;

    // Simple retry mechanism
    let attempts = 0;
    while (attempts < 2) {
      try {
        const result = await ai.models.generateContent({
          model: "gemini-1.5-flash", 
          contents: {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Content, mimeType: "image/jpeg" } }
            ]
          },
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            responseMimeType: "application/json"
          }
        });
        return JSON.parse(result.text);
      } catch (e: any) {
        // Stop immediately on quota
        if (e?.status === 429 || e?.message?.includes('429')) {
          return { error: 'quota', status: 429 };
        }
        attempts++;
        if (attempts === 2) throw e;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  } catch (error: any) {
    console.error("Gemini analysis failed:", error);
    const errorMessage = error?.message || String(error);
    return { error: errorMessage, status: error?.status };
  }
}
