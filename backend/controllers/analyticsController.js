import { z } from "zod";
import { buildStudentAnalytics } from "../services/analyticsService.js";

export async function getStudentAnalytics(req, res, next) {
  try {
    const id = z.string().min(1).parse(req.params.id);
    const q = z.object({ limit: z.coerce.number().int().min(1).max(100).optional() }).parse(req.query);
    const data = await buildStudentAnalytics(id, { attemptsLimit: q.limit || 30 });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

