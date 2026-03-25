import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import { User } from "../models/User.js";
import { Test } from "../models/Test.js";
import { Question } from "../models/Question.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const DEMO_EXAM = "JEE Main (PCM)";
const DEMO_TEST_NAME = "Demo JEE Main Test - PCM (6Q)";

const STUDENT_EMAIL = "demo.student@examedge.local";
const STUDENT_PASSWORD = "DemoPassword123!";
const STUDENT_NAME = "Demo Student";

const ADMIN_EMAIL = "demo.admin@examedge.local";
const ADMIN_PASSWORD = "DemoPassword123!";
const ADMIN_NAME = "Demo Admin";

const SUBJECTS = [
  { subject: "Mathematics", questions: 3 },
  { subject: "Physics", questions: 3 }
];

function mkMcq({ exam, subject, chapter, topic, subtopic, difficulty, text, options, correctOptionKey }) {
  return {
    exam,
    subject,
    chapter,
    topic,
    subtopic: subtopic || "",
    type: "MCQ",
    difficulty,
    text,
    latex: false,
    options: options.map((o) => ({ key: o.key, text: o.text })),
    correctOptionKey,
    tags: ["demo"],
    source: "seedDemo",
    year: new Date().getFullYear()
  };
}

function demoQuestionsForSubject(subject, count) {
  const common = {
    Mathematics: {
      chapter: "Algebra",
      topics: ["Quadratic Equations", "Polynomials", "Sequences"]
    },
    Physics: {
      chapter: "Kinematics",
      topics: ["Motion in a Straight Line", "Projectile Motion", "Relative Motion"]
    }
  };

  const spec = common[subject];
  if (!spec) throw new Error(`No demo question spec for subject=${subject}`);

  const out = [];
  for (let i = 0; i < count; i += 1) {
    const topic = spec.topics[i % spec.topics.length];
    const chapter = spec.chapter;
    const subtopic = topic;

    const n = i + 1;
    const difficulty = i % 3 === 0 ? 2 : i % 3 === 1 ? 3 : 4;

    // Keep text unique-ish to avoid duplicate contentHash collisions.
    const text = `${subject} demo question ${n}: Choose the correct option. (Demo seed)`;

    const options = [
      { key: "A", text: `Option A for ${subject} Q${n}` },
      { key: "B", text: `Option B for ${subject} Q${n}` },
      { key: "C", text: `Option C for ${subject} Q${n}` },
      { key: "D", text: `Option D for ${subject} Q${n}` }
    ];

    const correctOptionKey = n % 4 === 1 ? "A" : n % 4 === 2 ? "B" : n % 4 === 3 ? "C" : "D";

    out.push(
      mkMcq({
        exam: DEMO_EXAM,
        subject,
        chapter,
        topic,
        subtopic,
        difficulty,
        text,
        options,
        correctOptionKey
      })
    );
  }

  return out;
}

async function ensureUser({ email, password, name, role }) {
  const lowered = String(email).toLowerCase();
  const existing = await User.findOne({ email: lowered }).select("_id role");
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(password, 12);

  const doc = {
    email: lowered,
    passwordHash,
    name,
    role,
    parentOf: [],
    refreshTokens: [],
    banned: false
  };

  if (role === "student") {
    doc.student = {
      targetExam: "JEE Main",
      class: "11",
      streak: 0,
      xpPoints: 0,
      weakTopics: [],
      practiceHistory: []
    };
  }

  return User.create(doc);
}

async function ensureQuestions() {
  // Ensure we have at least enough active demo questions per subject.
  const questionCounts = {};
  for (const s of SUBJECTS) {
    questionCounts[s.subject] = await Question.countDocuments({ exam: DEMO_EXAM, subject: s.subject, isActive: true });
  }

  const created = [];
  for (const s of SUBJECTS) {
    if (questionCounts[s.subject] >= s.questions) continue;

    const toCreate = s.questions - questionCounts[s.subject];
    const toInsert = demoQuestionsForSubject(s.subject, s.questions).slice(0, toCreate);

    for (const q of toInsert) {
      try {
        await Question.create(q);
        created.push(`${s.subject}:${q.topic}`);
      } catch (e) {
        if (e?.code === 11000) continue; // idempotent re-runs
        throw e;
      }
    }
  }

  for (const s of SUBJECTS) {
    const have = await Question.countDocuments({ exam: DEMO_EXAM, subject: s.subject, isActive: true });
    if (have < s.questions) throw new Error(`Not enough questions for subject=${s.subject}. have=${have} need=${s.questions}`);
  }

  return { createdCount: created.length };
}

async function ensureTest({ adminUserId }) {
  const existing = await Test.findOne({ exam: DEMO_EXAM, name: DEMO_TEST_NAME });
  if (existing) return existing;

  const sectionDurationMs = 30 * 60 * 1000; // 30 minutes each (hard window enforced)
  const sections = [
    {
      sectionId: "S1_MATH",
      name: "Mathematics",
      order: 0,
      durationMs: sectionDurationMs,
      subjects: ["Mathematics"],
      questionCountBySubject: { Mathematics: 3 },
      allowedQuestionTypes: ["MCQ"],
      hardWindowEnforced: true
    },
    {
      sectionId: "S2_PHYSICS",
      name: "Physics",
      order: 1,
      durationMs: sectionDurationMs,
      subjects: ["Physics"],
      questionCountBySubject: { Physics: 3 },
      allowedQuestionTypes: ["MCQ"],
      hardWindowEnforced: true
    }
  ];

  const test = await Test.create({
    exam: DEMO_EXAM,
    name: DEMO_TEST_NAME,
    version: 1,
    isOfficial: false,
    totalQuestions: 6,
    durationMs: sections.reduce((sum, s) => sum + s.durationMs, 0),
    sections,
    marking: { mode: "UNIFORM_NEGATIVE", correct: 1, wrong: 0, unanswered: 0, weights: {} },
    blueprint: {
      subjectQuestionCounts: { Mathematics: 3, Physics: 3 },
      difficultyDistribution: {},
      topicFilters: {}
    },
    createdBy: adminUserId,
    isActive: true
  });

  return test;
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI");

  await mongoose.connect(process.env.MONGO_URI);

  const [admin, student] = await Promise.all([
    ensureUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: ADMIN_NAME, role: "admin" }),
    ensureUser({ email: STUDENT_EMAIL, password: STUDENT_PASSWORD, name: STUDENT_NAME, role: "student" })
  ]);

  const q = await ensureQuestions();
  const test = await ensureTest({ adminUserId: admin._id });

  // eslint-disable-next-line no-console
  console.log("Demo seed complete:");
  // eslint-disable-next-line no-console
  console.log({
    exam: DEMO_EXAM,
    testId: test._id.toString(),
    questions: q,
    student: { email: STUDENT_EMAIL, password: STUDENT_PASSWORD },
    admin: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  });

  await mongoose.disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

