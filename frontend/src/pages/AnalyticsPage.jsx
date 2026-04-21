import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { Activity, Lightbulb, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { apiFetch } from "../services/api.js";
import { Card, CardBody } from "../components/ui/Card";

export function AnalyticsPage() {
  const { accessToken, user } = useSelector((s) => s.auth);
  const [data, setData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingAI, setLoadingAI] = useState(true);
  const [errorAI, setErrorAI] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!accessToken || !user?.id) return;
      try {
        setLoadingAI(true);
        // Step 1: Fetch analytics data
        const analyticsData = await apiFetch(`/analytics/student/${user.id}?limit=30`, { token: accessToken });
        if (cancelled) return;
        setData(analyticsData);
        
        // Step 2: Fetch AI Insights based on analytics data
        try {
          console.log("AI Insights Request:", analyticsData);
          const response = await fetch("/api/ai/analysis", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(analyticsData)
          });
          
          if (!response.ok) {
            throw new Error(`AI request failed with status ${response.status}`);
          }
          
          const aiData = await response.json();
          console.log("AI Insights Response:", aiData);
          
          if (!cancelled) {
            setAiInsights(aiData);
          }
        } catch (err) {
          console.error("AI Insights Error:", err);
          if (!cancelled) {
            setErrorAI(err.message || "Failed to generate AI Insights");
            // Set fallback insight so UI doesn't break
            setAiInsights({
               strengths: ["Completed the exam successfully"],
               weaknesses: ["Needs improvement in accuracy"],
               recommendations: ["Review incorrect answers", "Focus on weak subjects"],
               summary: "AI analysis is currently unavailable, but your performance has been recorded. Keep practicing to improve your score."
            });
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoadingAI(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, user?.id]);

  const attempts = useMemo(() => {
    if (!data?.charts?.scoreTrend?.labels) return [];
    return data.charts.scoreTrend.labels.map((label, i) => ({
      name: label,
      score: data.charts.scoreTrend.datasets[0].data[i]
    }));
  }, [data]);

  const subjectData = useMemo(() => {
    if (!data?.charts?.subjectAccuracy?.labels) return [];
    return data.charts.subjectAccuracy.labels.map((label, i) => ({
      name: label,
      accuracy: data.charts.subjectAccuracy.datasets[0].data[i]
    }));
  }, [data]);

  const attemptStats = useMemo(() => {
    return subjectData.map((s) => ({
      name: s.name,
      value: s.accuracy
    }));
  }, [subjectData]);

  const weakTopics = useMemo(() => {
    return data?.weakTopics?.map(t => `${t.subject} - ${t.topic}`) || [];
  }, [data]);

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

  // Do not block page render on loadingAI, let charts load first

  return (
    <div className="container-centered py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Analytics Dashboard</h1>
        <p className="text-secondary-600 mt-2 text-lg">AI-powered performance insights and modern visualization.</p>
        {error ? <div className="mt-3 text-sm text-red-600 font-medium">{error}</div> : null}
        {errorAI ? <div className="mt-3 text-sm text-red-600 font-medium bg-red-50 p-3 rounded-lg border border-red-200">{errorAI}</div> : null}
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg rounded-2xl border border-blue-100 bg-white">
            <CardBody className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-secondary-500 uppercase tracking-wider">Overall Score</p>
                <p className="text-4xl font-extrabold text-blue-600 mt-1">{data.score || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <TrendingUp size={24} />
              </div>
            </CardBody>
          </Card>
          
          <Card className="shadow-lg rounded-2xl border border-green-100 bg-white">
            <CardBody className="p-6 flex items-center justify-between">
              <div>
                 <p className="text-sm font-semibold text-secondary-500 uppercase tracking-wider">Overall Accuracy</p>
                 <p className="text-4xl font-extrabold text-green-600 mt-1">{data.accuracy ? data.accuracy.toFixed(1) : 0}%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <Activity size={24} />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {loadingAI ? (
        <div className="flex flex-col items-center justify-center py-12 mb-8 bg-blue-50/50 rounded-2xl border border-blue-100">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <h2 className="text-lg font-bold text-secondary-800">Generating AI Insights...</h2>
          <p className="text-secondary-500 text-sm">Analyzing your performance data to provide recommendations.</p>
        </div>
      ) : aiInsights ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-lg rounded-2xl border border-green-100 bg-green-50 overflow-hidden">
              <CardBody className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-green-900">Strengths</h3>
                </div>
                <ul className="space-y-2">
                  {aiInsights.strengths?.map((item, i) => (
                    <li key={i} className="text-sm text-green-800 flex items-start">
                      <span className="mr-2">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card className="shadow-lg rounded-2xl border border-red-100 bg-red-50 overflow-hidden">
              <CardBody className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-red-900">Weak Areas</h3>
                </div>
                <ul className="space-y-2">
                  {aiInsights.weaknesses?.map((item, i) => (
                    <li key={i} className="text-sm text-red-800 flex items-start">
                      <span className="mr-2">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card className="shadow-lg rounded-2xl border border-blue-100 bg-blue-50 overflow-hidden">
              <CardBody className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-blue-900">Recommendations & Plan</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">Tips:</h4>
                    <ul className="space-y-1">
                      {aiInsights.recommendations?.map((item, i) => (
                        <li key={i} className="text-sm text-blue-800 flex items-start">
                          <span className="mr-2 text-blue-500">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {aiInsights.studyPlan && aiInsights.studyPlan.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">Study Plan:</h4>
                      <ul className="space-y-1">
                        {aiInsights.studyPlan?.map((item, i) => (
                          <li key={i} className="text-sm text-blue-800 flex items-start">
                            <span className="mr-2 text-blue-500">-</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl shadow-sm flex flex-col gap-2">
               <h3 className="text-lg font-bold text-indigo-900">Predicted Performance</h3>
               <p className="text-indigo-800 ">{aiInsights.predictedPerformance || "Not enough data to predict yet."}</p>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 p-6 rounded-2xl shadow-sm flex flex-col gap-2">
               <h3 className="text-lg font-bold text-purple-900">Confidence Level</h3>
               <p className="text-purple-800 ">{aiInsights.confidenceLevel || "N/A"}</p>
               <h3 className="text-sm font-bold text-purple-900 mt-2">Time Management</h3>
               <p className="text-sm text-purple-800">{aiInsights.timeManagement || "N/A"}</p>
            </div>
          </div>

          <div className="bg-blue-100 border border-blue-200 p-6 rounded-2xl shadow-sm mb-8 flex gap-4 items-start">
            <Activity className="w-8 h-8 text-blue-600 shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-blue-900 mb-1">AI Summary</h3>
              <p className="text-blue-800 leading-relaxed">{aiInsights.summary}</p>
            </div>
          </div>
        </>
      ) : null}

      <h2 className="text-2xl font-bold text-secondary-900 mb-6">Performance Charts</h2>
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="shadow-md rounded-2xl">
          <CardBody className="p-6">
            <div className="text-lg font-semibold text-secondary-900 mb-6">Score Trend</div>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attempts}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: "#3b82f6"}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-md rounded-2xl">
          <CardBody className="p-6">
            <div className="text-lg font-semibold text-secondary-900 mb-6">Subject Accuracy</div>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} max={100} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="accuracy" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md rounded-2xl">
          <CardBody className="p-6">
            <div className="text-lg font-semibold text-secondary-900 mb-6">Subject Distribution (Accuracy focus)</div>
            <div className="w-full h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attemptStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {attemptStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-md rounded-2xl">
          <CardBody className="p-6">
            <div className="text-lg font-semibold text-secondary-900 mb-4">Weak Topics Heatmap</div>
            <div className="flex flex-wrap gap-2">
              {weakTopics.length > 0 ? (
                weakTopics.map((topic, i) => (
                  <div key={i} className="bg-red-100 text-red-800 px-3 py-2 rounded-lg text-sm font-medium border border-red-200">
                    {topic}
                  </div>
                ))
              ) : (
                <p className="text-secondary-500 text-sm">No weak topics found yet. Keep practicing!</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
