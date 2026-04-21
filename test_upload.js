import mongoose from "mongoose";
import { Question } from "./backend/models/Question.js";

async function run() {
  await mongoose.connect("mongodb://localhost:27017/examedge_test_db");
  
  const docs = [{
    exam: "JEE Main (PCM)",
    subject: "Physics",
    chapter: "Kinematics",
    topic: "Motion",
    subtopic: "",
    type: "MCQ",
    difficulty: 3,
    text: "Test?",
    latex: false,
    statement: [],
    options: [{key: "A", text: "1"}, {key: "B", text: "2"}],
    correctOptionKey: "A"
  }];

  try {
    const inserted = await Question.insertMany(docs, { ordered: false });
    console.log("Success", inserted);
  } catch (e) {
    console.log("Insert Error:", e);
    const writeErrors = e?.writeErrors || e?.result?.writeErrors || e?.result?.result?.writeErrors;
    if (writeErrors) {
      console.log("Write Errors Extracted:", writeErrors.map(we => ({
        index: we.index,
        code: we.code,
        errmsg: we.errmsg,
        err_message: we.err?.message,
        err_errmsg: we.err?.errmsg
      })));
    }
  }
  
  process.exit(0);
}
run();
