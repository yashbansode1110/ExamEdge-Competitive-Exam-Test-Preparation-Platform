import { Readable } from "stream";
import csvParser from "csv-parser";

function getRawKey(row, ...aliases) {
  const keys = Object.keys(row || {});
  const map = new Map();
  for (const k of keys) {
    const cleanK = String(k).replace(/^[\uFEFF\u200B]+/, "").trim().toLowerCase().replace(/\s+/g, "");
    map.set(cleanK, row[k]);
  }
  for (const a of aliases) {
    const cleanA = String(a).replace(/^[\uFEFF\u200B]+/, "").trim().toLowerCase().replace(/\s+/g, "");
    if (map.has(cleanA) && map.get(cleanA) != null) return map.get(cleanA);
  }
  return null;
}

function normKey(row, ...aliases) {
  const v = getRawKey(row, ...aliases);
  if (v != null && String(v).trim() !== "") return String(v).trim();
  return "";
}

function normalizeDifficulty(raw) {
  if (raw == null || raw === "") return 3;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = Math.round(raw);
    return Math.min(5, Math.max(1, n));
  }
  const s = String(raw).toLowerCase().trim();
  if (s === "easy" || s === "e") return 2;
  if (s === "medium" || s === "med" || s === "m") return 3;
  if (s === "hard" || s === "h") return 5;
  const n = Number.parseInt(s, 10);
  if (!Number.isNaN(n) && n >= 1 && n <= 5) return n;
  return 3;
}

function parseOptionsFromRow(row) {
  const rawOpt = getRawKey(row, "options", "optionjson", "choices");
  if (rawOpt != null) {
    let parsed = rawOpt;
    if (typeof rawOpt === "string") {
      try {
        parsed = JSON.parse(rawOpt);
      } catch {
        parsed = null;
      }
    }
    if (Array.isArray(parsed)) {
      const formatted = parsed.map((o, idx) => {
        if (o && typeof o === "object") {
          const k = getRawKey(o, "key", "id", "option", "letter");
          const t = getRawKey(o, "text", "value", "content", "label", "body");
          if (k != null && t != null) return { key: String(k).trim().toUpperCase(), text: String(t).trim() };
          if (t != null) return { key: ["A", "B", "C", "D", "E", "F"][idx] || String(idx + 1), text: String(t).trim() };
          if (o.key != null && o.text != null) return { key: String(o.key).trim().toUpperCase(), text: String(o.text).trim() };
        }
        if (typeof o === "string" || typeof o === "number") {
          return { key: ["A", "B", "C", "D", "E", "F"][idx] || String(idx + 1), text: String(o).trim() };
        }
        return null;
      }).filter(Boolean);
      if (formatted.length >= 2) return formatted;
    } else if (parsed && typeof parsed === "object") {
      const keys = Object.keys(parsed);
      const formatted = keys.map(k => {
        const v = parsed[k];
        if (v != null && String(v).trim() !== "") {
          return { key: String(k).trim().toUpperCase(), text: String(v).trim() };
        }
        return null;
      }).filter(Boolean);
      if (formatted.length >= 2) return formatted;
    }
  }
  const out = [];
  const letters = ["A", "B", "C", "D", "E", "F"];
  for (let i = 0; i < letters.length; i++) {
    const L = letters[i];
    const num = String(i + 1);
    const t = normKey(row, `option${L.toLowerCase()}`, `opt${L.toLowerCase()}`, L, `option${num}`, `opt${num}`, num, `choice${num}`, `choice${L.toLowerCase()}`);
    if (t) out.push({ key: L, text: t });
  }
  return out.length >= 2 ? out : null;
}

/**
 * Maps CSV/JSON upload rows to Question-shaped documents (plain objects for insertMany).
 * Accepts aliases: questionText|text, correctAnswer|correctOptionKey, etc.
 */
export function rowToQuestionDoc(row, rowIndex) {
  const text = normKey(row, "questiontext", "text", "question", "stem");
  let exam = normKey(row, "exam");
  if (exam && exam.toUpperCase() === "JEE") exam = "JEE Main";
  const subject = normKey(row, "subject");
  const chapter = normKey(row, "chapter");
  const topic = normKey(row, "topic") || chapter || "General";
  const subtopic = normKey(row, "subtopic") || "";

  const correctRaw = normKey(row, "correctanswer", "correctans", "correctoptionkey", "correct", "answer");

  const options = parseOptionsFromRow(row);
  const difficulty = normalizeDifficulty(normKey(row, "difficulty") || row.difficulty);

  if (!text) throw new Error("questionText (or text) is required");
  if (!exam) throw new Error("exam is required");
  if (!subject) throw new Error("subject is required");
  if (!chapter) throw new Error("chapter is required");
  if (!options || options.length < 2) throw new Error("options must have at least 2 entries (JSON array or optionA…optionD columns)");
  
  let cr = String(correctRaw || "").trim();
  if (!cr) throw new Error("correctAnswer is required");
  
  cr = cr.toUpperCase();
  if (cr === "1") cr = "A";
  else if (cr === "2") cr = "B";
  else if (cr === "3") cr = "C";
  else if (cr === "4") cr = "D";
  else if (cr === "5") cr = "E";
  else if (cr === "6") cr = "F";
  
  const crUp = cr;
  const matched = options.find((o) => String(o.key).trim().toUpperCase() === crUp);
  if (!matched) throw new Error("correctAnswer must match an option key");
  const correctOptionKey = matched.key;

  const type = "MCQ";
  const latex = ["1", "true", "yes"].includes(String(normKey(row, "latex") || "").toLowerCase());

  return {
    exam,
    subject,
    chapter,
    topic,
    subtopic,
    type,
    difficulty,
    text,
    latex,
    statement: [],
    options,
    correctOptionKey,
    tags: ["bulk-upload"],
    source: "bulk-upload",
    year: row.year != null && row.year !== "" ? Number(row.year) : undefined,
    isActive: true
  };
}

export function buildQuestionDocsFromRows(rows) {
  const docs = [];
  const rowErrors = [];
  rows.forEach((row, index) => {
    try {
      docs.push(rowToQuestionDoc(row, index));
    } catch (e) {
      rowErrors.push({ row: index + 1, message: e.message || "Invalid row" });
    }
  });
  return { docs, rowErrors };
}

export function parseCsvBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    Readable.from(buffer.toString("utf8"))
      .pipe(csvParser())
      .on("data", (data) => rows.push(data))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

export function parseJsonBuffer(buffer) {
  const raw = JSON.parse(buffer.toString("utf8"));
  const rows = Array.isArray(raw) ? raw : raw?.questions;
  if (!Array.isArray(rows)) {
    throw new Error("JSON must be an array of question objects, or { questions: [...] }");
  }
  return rows;
}
