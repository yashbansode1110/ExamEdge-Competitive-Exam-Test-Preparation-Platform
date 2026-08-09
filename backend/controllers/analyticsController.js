import { z } from "zod";
import { buildStudentAnalytics } from "../services/analyticsService.js";

function parseUserId(req) {
  const raw = req.params.userId ?? req.params.id;
  return z.string().min(1).parse(raw);
}

function shapeAnalyticsPayload(built) {
  const subjectDistribution = (built.subjectDistribution || []).map((d) => ({
    subject: d.subject,
    questions: d.count,
    count: d.count,
    percent: d.percent
  }));

  return {
    scoreTrend: built.scoreTrend || [],
    subjectAccuracy: built.subjectAccuracy || [],
    subjectDistribution,
    weakTopics: built.weakTopics || [],
    strengths: built.strengths || [],
    weakAreas: built.weakAreas || [],
    confidenceLevel: built.confidenceLevel ?? "",
    predictedPerformance: built.predictedPerformance ?? "",
    timeManagement: built.timeManagement ?? {},
    recommendations: built.recommendations || [],
    studyPlan: built.studyPlan || [],
    aiSummary: built.aiSummary ?? "",
    totalTests: built.totalTests ?? 0,
    highestScore: built.highestScore ?? 0,
    averageScore: built.averageScorePercent ?? built.overallScore ?? 0,
    accuracy: built.accuracy ?? 0,
    improvementPercent: built.improvementPercent ?? 0,
    confidence: built.confidence ?? {},
    predictedScore: built.predictedScore ?? {},
    strengthTopics: built.strengthTopics || [],
    subjectAccuracyMap: built.subjectAccuracyMap || {},
    userId: built.userId,
    /** Aliases for AI service + legacy clients */
    averageScorePercent: built.averageScorePercent ?? built.overallScore ?? 0,
    overallScore: built.overallScore ?? built.averageScorePercent ?? 0
  };
}

/** GET /api/analytics/:userId — primary handler */
export async function getAnalytics(req, res, next) {
  try {
    const userId = parseUserId(req);
    // eslint-disable-next-line no-console
    console.log("Analytics requested for:", userId);

    const q = z.object({ limit: z.coerce.number().int().min(1).max(100).optional() }).parse(req.query);
    const built = await buildStudentAnalytics(userId, { attemptsLimit: q.limit || 40 });
    // eslint-disable-next-line no-console
    console.log("Analytics trend points:", built.scoreTrend?.length ?? 0);

    const analytics = shapeAnalyticsPayload(built);
    res.json({
      success: true,
      ok: true,
      analytics
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("getAnalytics error:", e?.message || e);
    next(e);
  }
}
