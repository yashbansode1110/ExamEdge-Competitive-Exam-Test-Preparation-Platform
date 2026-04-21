import { rowToQuestionDoc } from "./services/bulkQuestionImport.js";

const row1 = {
  question: "Sample question on Electrostatics?",
  options: ["Option 1", "Option 2", "Option 3", "Option 4"],
  correctAnswer: "A",
  subject: "Physics",
  chapter: "Electrostatics",
  difficulty: 3,
  exam: "JEE Main (PCM)"
};

const row2 = {
  question: "Sample question on Electrostatics?",
  optionA: "Option 1",
  optionB: "Option 2", 
  optionC: "Option 3",
  optionD: "Option 4",
  correctAnswer: "1",
  subject: "Physics",
  chapter: "Electrostatics",
  difficulty: 3,
  exam: "JEE Main (PCM)"
};

try {
  console.log("Row 1 Doc:", rowToQuestionDoc(row1, 0));
} catch(e) { console.error("Row 1 Error:", e.message); }

try {
  console.log("Row 2 Doc:", rowToQuestionDoc(row2, 1));
} catch(e) { console.error("Row 2 Error:", e.message); }

// let's test another structure
const row3 = {
  question: "Test",
  options: { A: "1", B: "2" },
  correctAnswer: "A",
  subject: "a", chapter: "b", difficulty: 1, exam: "c"
}
try {
  console.log("Row 3 Doc:", rowToQuestionDoc(row3, 2));
} catch(e) { console.error("Row 3 Error:", e.message); }
