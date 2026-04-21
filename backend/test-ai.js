import { generateAIAnalysis } from './services/aiService.js';
import dotenv from 'dotenv';
dotenv.config();

console.log("Starting AI test...");
async function test() {
  try {
    const result = await generateAIAnalysis({
      totalQuestions: 50,
      correct: 25,
      wrong: 25,
      accuracy: 50,
      subjects: [{ name: "Physics", score: 50 }]
    });
    console.log("AI Response:", result);
  } catch (error) {
    console.error("Test Error:", error);
  }
}
test();
