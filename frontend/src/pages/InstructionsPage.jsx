import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Card, CardBody } from "../components/ui/Card";
import { apiFetch } from "../services/api.js";
import { Loader2 } from "lucide-react";

const INSTRUCTIONS_CONFIG = {
  "JEE Main": {
    duration: 180,
    sections: ["Physics", "Chemistry", "Mathematics"],
    rules: [
      "All subjects are available concurrently.",
      "You can freely switch between Physics, Chemistry, and Mathematics.",
      "No section is locked initially."
    ]
  },
  "MHT-CET": {
    duration: 180,
    sections: ["Physics + Chemistry", "Mathematics"],
    rules: [
      "Physics + Chemistry section is presented first (90 minutes).",
      "Mathematics section is locked initially and unlocks after submitting Physics + Chemistry or when time expires.",
      "You cannot return to Physics + Chemistry after switching to Mathematics."
    ]
  },
  "FILTERED": {
    title: "Practice Test Instructions",
    duration: "Variable",
    sections: ["All Subjects"],
    rules: [
      "This is a practice test",
      "You can attempt questions in any order",
      "No section restrictions",
      "Use Save & Next to navigate",
      "You can review questions anytime",
      "Timer will run continuously"
    ]
  }
};

export function InstructionsPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useSelector((s) => s.auth);
  
  const [agreed, setAgreed] = useState(false);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadTest() {
      if (!testId || !accessToken) return;
      try {
        setLoading(true);
        // Try fetching test data
        try {
          const data = await apiFetch(`/tests/${testId}`, { token: accessToken });
          if (!cancelled) setTest(data);
        } catch (err) {
          // If it fails (e.g. testId was actually a session ID), try fetching session to get test details instead
          const sessionData = await apiFetch(`/api/test-sessions/${testId}`, { token: accessToken });
          if (!cancelled && sessionData?.test) setTest(sessionData.test);
        }
      } catch (err) {
        console.warn("Could not fetch test details for instructions:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTest();
    return () => { cancelled = true; };
  }, [testId, accessToken]);

  const examType = test?.exam || "";
  const isFiltered = test?.isFiltered === true || test?.type === "filtered";
  let config = null;
  if (isFiltered) config = INSTRUCTIONS_CONFIG["FILTERED"];
  else if (examType.toUpperCase().includes("JEE")) config = INSTRUCTIONS_CONFIG["JEE Main"];
  else if (examType.toUpperCase().includes("MHT")) config = INSTRUCTIONS_CONFIG["MHT-CET"];

  // Function to enter fullscreen and start the exam
  const handleStartTest = () => {
    if (!agreed) return;
    
    // Store in sessionStorage to prove user came from instructions page
    sessionStorage.setItem(`instructions_agreed_${testId}`, "true");

    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
      });
    }

    navigate(`/exam/${testId}`);
  };

  return (
    <div className="container-centered py-8 max-w-4xl">
      <Card className="shadow-lg rounded-2xl overflow-hidden border border-secondary-200">
        <div className="bg-primary-600 text-white p-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">Exam Instructions</h1>
          <p className="mt-2 text-primary-100 uppercase font-semibold tracking-wider text-sm">
            Please read carefully before proceeding
          </p>
        </div>

        <CardBody className="p-0">
          <div className="h-[60vh] overflow-y-auto p-6 lg:p-8 space-y-8 bg-secondary-50 custom-scrollbar">
            
            {/* General Instructions */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-secondary-100">
              <h2 className="text-xl font-bold text-secondary-900 border-b pb-2 mb-4 flex items-center gap-2">
                <span className="bg-primary-100 text-primary-700 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">1</span>
                General Instructions
              </h2>
              {loading ? (
                <div className="flex items-center text-secondary-500 py-4"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading test details...</div>
              ) : (
                <ul className="space-y-3 text-secondary-700 ml-4">
                  <li className="flex items-start"><span className="mr-2 text-primary-500">•</span> Total duration of the examination is <strong> {config ? config.duration : 180} {config?.duration === "Variable" ? "" : "minutes"}</strong>.</li>
                  {config ? (
                    config.sections.map((sec, i) => (
                      <li key={i} className="flex items-start"><span className="mr-2 text-primary-500">•</span> {sec} section is available.</li>
                    ))
                  ) : (
                    <>
                      <li className="flex items-start"><span className="mr-2 text-primary-500">•</span> Physics & Chemistry section duration is <strong> 90 minutes</strong>.</li>
                      <li className="flex items-start"><span className="mr-2 text-primary-500">•</span> Mathematics section duration is <strong> 90 minutes</strong>.</li>
                    </>
                  )}
                  <li className="flex items-start"><span className="mr-2 text-primary-500">•</span> The clock will be set at the server. The countdown timer will run continuously.</li>
                </ul>
              )}
            </section>

            {/* Exam Specific Rules */}
            {config && (
              <section className="bg-white p-6 rounded-xl shadow-sm border border-secondary-100">
                <h2 className="text-xl font-bold text-secondary-900 border-b pb-2 mb-4 flex items-center gap-2">
                  <span className="bg-primary-100 text-primary-700 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">2</span>
                  Exam Format ({examType})
                </h2>
                <ul className="space-y-3 text-secondary-700 ml-4">
                  {config.rules.map((rule, i) => (
                    <li key={i} className="flex items-start"><span className="mr-2 text-primary-500">•</span> {rule}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Navigation Instructions */}
            {!isFiltered && (
              <section className="bg-white p-6 rounded-xl shadow-sm border border-secondary-100">
                <h2 className="text-xl font-bold text-secondary-900 border-b pb-2 mb-4 flex items-center gap-2">
                  <span className="bg-primary-100 text-primary-700 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">{config ? 3 : 2}</span>
                  Navigation Instructions
                </h2>
                <ul className="space-y-3 text-secondary-700 ml-4">
                  <li className="flex items-start"><span className="mr-2 text-primary-500">•</span> You can navigate and switch between questions within the active section.</li>
                  <li className="flex items-start"><span className="mr-2 text-primary-500">•</span> Use the <strong>"Save & Next"</strong> button to save your answer and move to the next question.</li>
                  <li className="flex items-start"><span className="mr-2 text-primary-500">•</span> You can use <strong>"Mark for Review"</strong> to remind yourself to look at the question again.</li>
                </ul>
              </section>
            )}

            {/* Marking Scheme */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-secondary-100">
              <h2 className="text-xl font-bold text-secondary-900 border-b pb-2 mb-4 flex items-center gap-2">
                <span className="bg-primary-100 text-primary-700 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">{config ? 4 : 3}</span>
                Marking Scheme
              </h2>
              <ul className="space-y-3 text-secondary-700 ml-4">
                <li className="flex items-start"><span className="mr-2 text-green-500 font-bold">+</span> <strong>Correct Answer: </strong> Awards +1 mark.</li>
                <li className="flex items-start"><span className="mr-2 text-red-500 font-bold">-</span> <strong>Wrong Answer: </strong> 0 or negative marking depending on the specific exam pattern.</li>
                <li className="flex items-start"><span className="mr-2 text-secondary-500 font-bold">○</span> <strong>Unanswered: </strong> 0 marks awarded.</li>
              </ul>
            </section>

            {/* Section Rules */}
            {!isFiltered && (
              <section className="bg-white p-6 rounded-xl shadow-sm border border-secondary-100">
                <h2 className="text-xl font-bold text-red-700 border-b border-red-100 pb-2 mb-4 flex items-center gap-2">
                  <span className="bg-red-100 text-red-700 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">!</span>
                  Strict Examination Rules
                </h2>
                <ul className="space-y-3 text-secondary-700 ml-4">
                  <li className="flex items-start"><span className="mr-2 text-red-500 font-bold">✗</span> <strong>DO NOT refresh </strong> the page during the exam. Doing so may cause loss of progress.</li>
                  <li className="flex items-start"><span className="mr-2 text-red-500 font-bold">✗</span> <strong>DO NOT exit fullscreen </strong> mode. Unwarranted navigation will be logged.</li>
                  <li className="flex items-start"><span className="mr-2 text-red-500 font-bold">✗</span> Any violations or suspicious activity may result in an <strong>auto-submission</strong> of your test.</li>
                </ul>
              </section>
            )}

          </div>

          {/* Footer controls (Sticky) */}
          <div className="bg-white p-6 border-t border-secondary-200">
            <label className="flex items-start gap-4 p-4 mb-6 rounded-lg bg-primary-50 border border-primary-200 cursor-pointer hover:bg-primary-100 transition-colors">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 text-primary-600 border-secondary-300 rounded focus:ring-primary-500 focus:ring-2"
              />
              <span className="text-secondary-800 font-semibold md:text-lg">
                I have read and understood the instructions. I agree to abide by the rules.
              </span>
            </label>
            
            <div className="flex justify-between items-center">
              <button 
                onClick={() => navigate(-1)}
                className="px-6 py-2.5 rounded-lg border border-secondary-300 text-secondary-700 font-bold bg-white hover:bg-secondary-50 transition-colors"
              >
                Go Back
              </button>
              
              <button
                onClick={handleStartTest}
                disabled={!agreed}
                className={`px-8 py-3 rounded-lg font-bold text-white shadow-md transition-all ${
                  agreed 
                    ? "bg-green-600 hover:bg-green-700 hover:shadow-lg transform hover:-translate-y-0.5" 
                    : "bg-secondary-300 cursor-not-allowed"
                }`}
              >
                Start Test
              </button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
