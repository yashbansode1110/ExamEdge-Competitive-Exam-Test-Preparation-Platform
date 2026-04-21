import { GoogleGenAI } from "@google/genai";

let ai = null;

export async function generateAIAnalysis(data) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  const { score, accuracy, subjectAccuracyMap, weakTopics } = data;
  let subjectStr = "";
  if (subjectAccuracyMap) {
    for (const [subj, acc] of Object.entries(subjectAccuracyMap)) {
      subjectStr += `  ${subj}: ${acc}%\n`;
    }
  }
  const weakTopicsStr = weakTopics ? weakTopics.map(wt => wt.topic).join(", ") : "None";

  const prompt = `You are an exam performance analyst.

Student Performance Data:
- Score: ${score || 0}
- Accuracy: ${accuracy || 0}%
- Subject Accuracy:
${subjectStr}
- Weak Topics: ${weakTopicsStr}

Generate a JSON object with the following keys:
"summary": Short performance summary (2-3 lines)
"weaknesses": Array of key weaknesses (strings)
"recommendations": Array of actionable improvement plan steps (strings)
"studyPlan": Array of steps for a study plan (strings)

Keep response concise and student-friendly. Return ONLY valid JSON, wrapped in \`\`\`json if necessary.`;

  const fallbackJson = {
    strengths: ["Review fundamental concepts"],
    weaknesses: ["Needs improvement in accuracy"],
    recommendations: ["Review incorrect answers", "Focus on weak subjects"],
    summary: "AI analysis temporarily unavailable"
  };

  let attempts = 0;
  const maxAttempts = 2; // Try once, retry once

  while (attempts < maxAttempts) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      let text = response.text;

      // CLEAN RESPONSE (CRITICAL FIX)
      text = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();

      const match = text.match(/\{[\s\S]*\}/);

      if (!match) {
        throw new Error("Invalid AI response format");
      }

      return JSON.parse(match[0]);
    } catch (err) {
      console.error(`AI Analysis Attempt ${attempts + 1} failed:`, err.message || err);
      attempts++;
    }
  }

  console.warn("Returning fallback JSON due to repeated AI failures.");
  return fallbackJson;
}
