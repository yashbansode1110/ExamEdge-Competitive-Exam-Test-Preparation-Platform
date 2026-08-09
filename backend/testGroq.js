import "dotenv/config";
import Groq from "groq-sdk";

const ai = new Groq({apiKey: process.env.GROQ_API_KEY});
ai.chat.completions.create({
  messages: [{role: 'user', content: 'Generate a JSON object with a key "status" and value "ok".'}], 
  model: 'llama-3.3-70b-versatile', 
  response_format: { type: 'json_object' }
}).then(r => console.log(r.choices[0].message.content)).catch(e => console.error(e.message));
