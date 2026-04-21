import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const list = await ai.models.list();
    for await (const model of list) {
        if (model.name.includes("flash") || model.name.includes("gemini")) {
            console.log(model.name, model.supportedGenerationMethods);
        }
    }
  } catch(e) {
    if (e.message) {
       console.error("SDK Error message", e.message);
    } else {
       console.error(e);
    }
    
    // Attempt REST fallback to see if list is even available
    try {
        console.log("Attempting REST fetch...");
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await res.json();
        data.models.forEach(m => console.log("REST models:", m.name));
    } catch(err) {
        console.error("REST error", err);
    }
  }
}
run();
