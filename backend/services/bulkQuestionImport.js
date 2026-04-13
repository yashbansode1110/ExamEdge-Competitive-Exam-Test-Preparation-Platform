import { Readable } from "stream";
import csvParser from "csv-parser";

function normKey(row, ...aliases) {
  const keys = Object.keys(row || {});
  const map = new Map();
  for (const k of keys) {
    // Strip BOM or zero width spaces so the first column matches correctly
    const cleanK = String(k).replace(/^[\uFEFF\u200B]+/, "").trim().toLowerCase().replace(/\s+/g, "");
    map.set(cleanK, row[k]);
  }
  for (const a of aliases) {
    const cleanA = String(a).replace(/^[\uFEFF\u200B]+/, "").trim().toLowerCase().replace(/\s+/g, "");
    const v = map.get(cleanA);
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
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
  const optJson = normKey(row, "options", "optionjson", "choices");
  if (optJson) {
    try {
      const parsed = JSON.parse(optJson);
      if (!Array.isArray(parsed)) return null;
      return parsed
        .map((o) => {
          if (o && typeof o === "object" && o.key && o.text) return { key: String(o.key).trim(), text: String(o.text).trim() };
          return null;
        })
        .filter(Boolean);
    } catch {
      return null;
    }
  }
  const out = [];
  const letters = ["A", "B", "C", "D", "E", "F"];
  for (const L of letters) {
    const t = normKey(row, `option${L.toLowerCase()}`, `opt${L.toLowerCase()}`, L);
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
  const exam = normKey(row, "exam");
  const subject = normKey(row, "subject");
  const chapter = normKey(row, "chapter");
  const topic = normKey(row, "topic") || chapter || "General";
  const subtopic = normKey(row, "subtopic") || "";

  const correctRaw = normKey(row, "correctanswer", "correctoptionkey", "correct", "answer");

  const options = parseOptionsFromRow(row);
  const difficulty = normalizeDifficulty(normKey(row, "difficulty") || row.difficulty);

  if (!text) throw new Error("questionText (or text) is required");
  if (!exam) throw new Error("exam is required");
  if (!subject) throw new Error("subject is required");
  if (!chapter) throw new Error("chapter is required");
  if (!options || options.length < 2) throw new Error("options must have at least 2 entries (JSON array or optionA…optionD columns)");
  const cr = String(correctRaw || "").trim();
  if (!cr) throw new Error("correctAnswer is required");
  const crUp = cr.toUpperCase();
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
