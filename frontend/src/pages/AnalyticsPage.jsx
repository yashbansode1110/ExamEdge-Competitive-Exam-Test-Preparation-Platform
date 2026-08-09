import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Brain,
  Clock,
  Lightbulb,
  LineChart as LineChartIcon,
  Loader2,
  Target,
  TrendingUp,
  Zap
} from "lucide-react";
import { apiFetch } from "../services/api.js";
import { Card, CardBody } from "../components/ui/Card";

const CHART_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

/** Unwraps GET /api/analytics/:userId → { success, analytics } and legacy flat payloads */
function normalizeAnalyticsResponse(raw) {
  if (!raw) return null;
  if (raw.analytics && typeof raw.analytics === "object") {
    return {
      ...raw.analytics,
      ok: raw.ok !== false,
      success: raw.success !== false
    };
  }
  return raw;
}

function StatCard({ icon: Icon, title, value, hint, gradient }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card
        className={`shadow-lg rounded-2xl border-0 overflow-hidden bg-gradient-to-br ${gradient} text-white hover:shadow-xl transition-shadow duration-300`}
      >
        <CardBody className="p-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{title}</p>
            <p className="text-3xl font-extrabold mt-1">{value}</p>
            {hint ? <p className="text-sm text-white/85 mt-2 leading-snug">{hint}</p> : null}
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}

function ChartSkeleton({ height = 300 }) {
  return (
    <div className="w-full rounded-xl bg-slate-100 animate-pulse" style={{ height }} aria-hidden>
      <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm font-medium">Loading chart…</div>
    </div>
  );
}

class AnalyticsBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-4 text-sm">
          This chart failed to render. Try refreshing the page.
        </div>
      );
    }
    return this.props.children;
  }
}

export function AnalyticsPage() {
  const { accessToken, user } = useSelector((s) => s.auth);
  const location = useLocation();
  const [data, setData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorAI, setErrorAI] = useState("");

  const load = useCallback(async () => {
    const userId = user?._id || user?.id;
    if (!accessToken || !userId) return;
    setLoading(true);
    setError("");
    setAiLoading(true);
    setErrorAI("");
    try {
      const raw = await apiFetch(`/api/analytics/${userId}?limit=40`, { token: accessToken });
      // eslint-disable-next-line no-console
      console.log("Analytics API response:", raw);
      const analyticsData = normalizeAnalyticsResponse(raw);
      setData(analyticsData);

      try {
        const aiData = await apiFetch("/api/ai/analysis", {
          method: "POST",
          token: accessToken,
          body: analyticsData
        });
        setAiInsights(aiData);
      } catch (err) {
        console.error("AI Insights Error:", err);
        setErrorAI(err.message || "AI insights unavailable");
        setAiInsights(null);
      } finally {
        setAiLoading(false);
      }
    } catch (e) {
      setError(e.message || "Failed to load analytics");
      setData(null);
      setAiInsights(null);
      setAiLoading(false);
    } finally {
      setLoading(false);
    }
  }, [accessToken, user?._id, user?.id]);

  useEffect(() => {
    load();
  }, [load, location.key]);

  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener("examedge-analytics-refresh", onRefresh);
    return () => window.removeEventListener("examedge-analytics-refresh", onRefresh);
  }, [load]);

  const scoreTrend = useMemo(() => data?.scoreTrend || [], [data]);
  const subjectAccuracyChart = useMemo(
    () => (data?.subjectAccuracy || []).filter((s) => (s.attempted || 0) > 0),
    [data]
  );
  const subjectDistribution = useMemo(() => data?.subjectDistribution || [], [data]);
  const weakTopics = useMemo(() => data?.weakTopics || [], [data]);

  const pieData = useMemo(
    () =>
      subjectDistribution.map((d) => ({
        name: d.subject,
        value: d.count,
        percent: d.percent
      })),
    [subjectDistribution]
  );

  const hasTests = scoreTrend.length > 0;
  const summaryText = aiInsights?.summary || data?.aiSummary || "";
  const predictedText = aiInsights?.predictedPerformance || data?.predictedPerformance || "";
  const confidenceText = aiInsights?.confidenceLevel || data?.confidenceLevel || "";
  const timeText =
    typeof aiInsights?.timeManagement === "string"
      ? aiInsights.timeManagement
      : data?.timeManagement?.summary || "";

  const strengthsList = (aiInsights?.strengths?.length ? aiInsights.strengths : data?.strengths) || [];
  const weaknessesList = (aiInsights?.weaknesses?.length ? aiInsights.weaknesses : data?.weakAreas) || [];
  const recommendationsList = [
    ...(data?.recommendations || []),
    ...(aiInsights?.recommendations || [])
  ].filter(Boolean);
  const uniqueRecommendations = [...new Set(recommendationsList)].slice(0, 12);
  const studyPlanList = [...(data?.studyPlan || []), ...(aiInsights?.studyPlan || [])].filter(Boolean);
  const uniqueStudyPlan = [...new Set(studyPlanList)].slice(0, 10);

  if (!accessToken) {
    return (
      <div className="container-centered py-12">
        <Card className="max-w-2xl mx-auto shadow-lg rounded-2xl">
          <CardBody className="py-10 text-center">
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">Analytics</h1>
            <p className="text-secondary-600 text-sm">
              Please{" "}
              <Link className="text-primary-600 font-semibold hover:underline" to="/login">
                login
              </Link>{" "}
              to see your performance.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-centered py-8 max-w-7xl">
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-slate-900 via-indigo-800 to-sky-700 bg-clip-text text-transparent tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="text-secondary-600 mt-2 text-lg">
            Live metrics from your completed mocks — updates every time you submit a test.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors shadow-md"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-6 text-sm text-red-700 font-medium bg-red-50 border border-red-200 rounded-xl p-4">{error}</div>
      ) : null}
      {errorAI ? (
        <div className="mb-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4">
          {errorAI} — heuristic insights below still reflect your real attempt data.
        </div>
      ) : null}

      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((k) => (
            <ChartSkeleton key={k} height={120} />
          ))}
        </div>
      ) : null}

      {!loading && data && !hasTests ? (
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-8 mb-8 text-center shadow-sm">
          <Target className="w-12 h-12 text-sky-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">No completed tests yet</h2>
          <p className="text-secondary-600 mt-2 max-w-lg mx-auto">
            Finish and submit a mock (including auto-submit on timeout) to populate score trends, subject accuracy, and
            topic-level insights.
          </p>
          <Link
            to="/tests"
            className="inline-flex mt-6 px-5 py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 transition-colors"
          >
            Browse tests
          </Link>
        </div>
      ) : null}

      {data && hasTests ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            icon={BarChart3}
            title="Tests completed"
            value={data.totalTests ?? scoreTrend.length}
            hint="Submitted or timed-out attempts in this window."
            gradient="from-slate-800 to-slate-900"
          />
          <StatCard
            icon={Award}
            title="Highest score"
            value={`${data.highestScore ?? "—"}%`}
            hint="Best percentage of maximum marks achieved."
            gradient="from-amber-500 to-orange-600"
          />
          <StatCard
            icon={TrendingUp}
            title="Average score"
            value={`${data.averageScorePercent ?? data.overallScore ?? "—"}%`}
            hint={data.improvementPercent ? `Recent vs early trend: ${data.improvementPercent}%` : "Building your trend line."}
            gradient="from-sky-500 to-indigo-600"
          />
          <StatCard
            icon={Activity}
            title="Avg. accuracy"
            value={`${typeof data.accuracy === "number" ? data.accuracy.toFixed(1) : data.accuracy}%`}
            hint="Across all answered questions in recent mocks."
            gradient="from-emerald-500 to-teal-600"
          />
        </div>
      ) : null}

      {aiLoading && hasTests ? (
        <div className="flex flex-col items-center justify-center py-10 mb-10 bg-indigo-50/60 rounded-2xl border border-indigo-100">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
          <p className="font-semibold text-slate-800">Generating AI commentary…</p>
          <p className="text-sm text-slate-500 mt-1">Charts already reflect your latest database results.</p>
        </div>
      ) : null}

      {(summaryText || timeText) && hasTests ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <Card className="lg:col-span-2 rounded-2xl border border-indigo-100 shadow-md bg-gradient-to-br from-white to-indigo-50/40 hover:shadow-lg transition-shadow">
            <CardBody className="p-6 flex gap-4 h-full">
              <Brain className="w-10 h-10 text-indigo-600 shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">AI summary</h3>
                <p className="text-slate-700 mt-2 leading-relaxed text-sm md:text-base">{summaryText}</p>
              </div>
            </CardBody>
          </Card>
          
          <Card className="lg:col-span-1 rounded-2xl border border-cyan-100 shadow-md hover:shadow-md transition-shadow">
            <CardBody className="p-6 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-8 h-8 text-cyan-600 shrink-0" />
                <div className="font-bold text-slate-900 text-lg">Time management</div>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed flex-1">{timeText}</p>
              {data?.timeManagement ? (
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-cyan-50 text-xs text-slate-600 font-medium">
                  <div className="flex justify-between">
                    <span>Avg / question:</span>
                    <span className="text-slate-900">{data.timeManagement.averageSecondsPerQuestion}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>In-time submits:</span>
                    <span className="text-slate-900">{data.timeManagement.submittedTests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Timeouts:</span>
                    <span className="text-slate-900">{data.timeManagement.timedOutTests}</span>
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {hasTests ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <Card className="lg:col-span-1 rounded-2xl border border-emerald-100 shadow-md bg-emerald-50/30">
            <CardBody className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-emerald-950">Strengths</h3>
              </div>
              <ul className="space-y-2">
                {strengthsList.length ? (
                  strengthsList.map((item, i) => (
                    <li key={i} className="text-sm text-emerald-900 flex gap-2">
                      <span className="text-emerald-500">▸</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-slate-500">Keep attempting questions — strengths appear once accuracy stays high.</li>
                )}
              </ul>
            </CardBody>
          </Card>
          <Card className="lg:col-span-1 rounded-2xl border border-rose-100 shadow-md bg-rose-50/30">
            <CardBody className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-lg font-bold text-rose-950">Weak areas</h3>
              </div>
              <ul className="space-y-2">
                {weaknessesList.length ? (
                  weaknessesList.map((item, i) => (
                    <li key={i} className="text-sm text-rose-900 flex gap-2">
                      <span className="text-rose-500">▸</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-slate-500">No critical gaps flagged — still review any red topics below.</li>
                )}
              </ul>
            </CardBody>
          </Card>
          <Card className="lg:col-span-1 rounded-2xl border border-sky-100 shadow-md bg-sky-50/30">
            <CardBody className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-sky-600" />
                <h3 className="text-lg font-bold text-sky-950">Recommendations & study plan</h3>
              </div>
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                <div>
                  <h4 className="text-xs font-bold uppercase text-sky-800 mb-1">Recommendations</h4>
                  <ul className="space-y-1">
                    {uniqueRecommendations.map((item, i) => (
                      <li key={i} className="text-sm text-slate-800 flex gap-2">
                        <span className="text-sky-500">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-sky-800 mb-1">Study plan</h4>
                  <ul className="space-y-1">
                    {uniqueStudyPlan.map((item, i) => (
                      <li key={i} className="text-sm text-slate-800 flex gap-2">
                        <span className="text-sky-500">–</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Activity className="w-6 h-6 text-sky-600" />
        Performance charts
      </h2>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="shadow-lg rounded-2xl border border-slate-100 hover:shadow-xl transition-shadow duration-300">
          <CardBody className="p-6">
            <div className="text-lg font-semibold text-slate-900 mb-1">Score trend</div>
            <p className="text-xs text-slate-500 mb-4">Percentage of maximum marks by completion date</p>
            <AnalyticsBoundary>
              <div className="w-full h-[320px]">
                {loading && !scoreTrend.length ? (
                  <ChartSkeleton height={320} />
                ) : hasTests ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scoreTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#0ea5e9" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px rgb(0 0 0 / 0.12)" }}
                        formatter={(v) => [`${v}%`, "Score"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="url(#scoreStroke)"
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[320px] flex items-center justify-center text-slate-400 text-sm">No trend data</div>
                )}
              </div>
            </AnalyticsBoundary>
          </CardBody>
        </Card>

        <Card className="shadow-lg rounded-2xl border border-slate-100 hover:shadow-xl transition-shadow duration-300">
          <CardBody className="p-6">
            <div className="text-lg font-semibold text-slate-900 mb-1">Subject accuracy</div>
            <p className="text-xs text-slate-500 mb-4">Correct ÷ attempted × 100 per subject</p>
            <AnalyticsBoundary>
              <div className="w-full h-[320px]">
                {loading && !subjectAccuracyChart.length ? (
                  <ChartSkeleton height={320} />
                ) : subjectAccuracyChart.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectAccuracyChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="subject" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip
                        cursor={{ fill: "rgba(14, 165, 233, 0.06)" }}
                        contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px rgb(0 0 0 / 0.12)" }}
                      />
                      <Bar dataKey="accuracy" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[320px] flex items-center justify-center text-slate-400 text-sm">No subject breakdown</div>
                )}
              </div>
            </AnalyticsBoundary>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-12">
        <Card className="shadow-lg rounded-2xl border border-slate-100 hover:shadow-xl transition-shadow duration-300">
          <CardBody className="p-6">
            <div className="text-lg font-semibold text-slate-900 mb-1">Subject distribution</div>
            <p className="text-xs text-slate-500 mb-4">Share of attempted questions by subject</p>
            <AnalyticsBoundary>
              <div className="w-full h-[340px]">
                {loading && !pieData.length ? (
                  <ChartSkeleton height={340} />
                ) : pieData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _n, props) => [
                          `${value} questions (${props.payload.percent}%)`,
                          props.payload.name
                        ]}
                        contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px rgb(0 0 0 / 0.12)" }}
                      />
                      <Legend verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[340px] flex items-center justify-center text-slate-400 text-sm">No distribution data</div>
                )}
              </div>
            </AnalyticsBoundary>
          </CardBody>
        </Card>

        <Card className="shadow-lg rounded-2xl border border-slate-100 hover:shadow-xl transition-shadow duration-300">
          <CardBody className="p-6">
            <div className="text-lg font-semibold text-slate-900 mb-1">Weak topics</div>
            <p className="text-xs text-slate-500 mb-4">Topics under 50% accuracy with enough attempts</p>
            <div className="flex flex-wrap gap-2 min-h-[200px] content-start">
              {weakTopics.length ? (
                weakTopics.map((t, i) => {
                  const heat = Math.min(1, Math.max(0, (50 - (t.accuracy || 0)) / 50));
                  return (
                    <motion.div
                      key={`${t.subject}-${t.topic}-${i}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-xl px-3 py-2 text-sm font-semibold border border-rose-200/80 text-rose-950 shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, rgba(254,202,202,${0.35 + heat * 0.45}) 0%, rgba(254,226,226,0.9) 100%)`
                      }}
                      title={`${t.attempts} attempts`}
                    >
                      <span className="block text-xs font-bold text-rose-700/90">{t.subject}</span>
                      <span className="block">{t.topic}</span>
                      <span className="text-xs font-medium text-rose-800/80">{t.accuracy}%</span>
                    </motion.div>
                  );
                })
              ) : (
                <p className="text-slate-500 text-sm leading-relaxed">
                  No topics crossed the weak threshold yet. As you attempt more questions per topic, low-accuracy pockets
                  will surface here automatically.
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
