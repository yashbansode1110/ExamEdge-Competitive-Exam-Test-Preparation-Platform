import "dotenv/config";
import Groq from "groq-sdk";

let ai = null;

async function generateAIAnalysis(data) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY");
  }

  if (!ai) {
    ai = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  const {
    overallScore,
    averageScorePercent,
    accuracy,
    subjectAccuracyMap,
    weakTopics,
    strengths,
    weakAreas,
    totalTests,
    improvementPercent,
    timeManagement
  } = data;
  const scoreLabel = averageScorePercent ?? overallScore ?? 0;
  let subjectStr = "";
  if (subjectAccuracyMap && typeof subjectAccuracyMap === "object") {
    for (const [subj, acc] of Object.entries(subjectAccuracyMap)) {
      subjectStr += `  ${subj}: ${acc}%\n`;
    }
  }
  const weakTopicsStr = Array.isArray(weakTopics) && weakTopics.length ? weakTopics.map((wt) => wt.topic).join(", ") : "None";
  const strengthsStr = Array.isArray(strengths) && strengths.length ? strengths.slice(0, 8).join("; ") : "Not enough signal";
  const weakAreasStr = Array.isArray(weakAreas) && weakAreas.length ? weakAreas.slice(0, 8).join("; ") : "None flagged";

  const prompt = `You are an exam performance analyst.

Student Performance Data:
- Tests completed: ${totalTests ?? 0}
- Average score (% of max): ${scoreLabel}%
- Overall accuracy (answered questions): ${accuracy ?? 0}%
- Improvement (recent vs early window, %): ${improvementPercent ?? 0}
- Subject Accuracy:
${subjectStr || "  (no breakdown)\n"}
- Weak Topics: ${weakTopicsStr}
- Strength signals: ${strengthsStr}
- Weak-area signals: ${weakAreasStr}
- Time summary: ${timeManagement?.summary || "n/a"}

Generate a JSON object with the following keys:
"summary": Short performance summary (2-3 lines)
"strengths": Array of key strengths (strings)
"weaknesses": Array of key weaknesses (strings)
"recommendations": Array of actionable improvement plan steps (strings)
"studyPlan": Array of steps for a study plan (strings)

Keep response concise and student-friendly. Return ONLY valid JSON, wrapped in \`\`\`json if necessary.`;

  let attempts = 0;
  const maxAttempts = 2; // Try once, retry once

  while (attempts < maxAttempts) {
    try {
      const response = await ai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        response_format: { type: "json_object" }
      });

      let text = response.choices[0]?.message?.content || "";

      // CLEAN RESPONSE
      text = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();

      const match = text.match(/\{[\s\S]*\}/);

      if (!match) {
        throw new Error("Invalid AI response format");
      }

      const parsed = JSON.parse(match[0]);
      return parsed;
    } catch (err) {
      console.error(`AI Analysis Attempt ${attempts + 1} failed:`, err.message || err);
      attempts++;
    }
  }
}

generateAIAnalysis({}).then(console.log);
