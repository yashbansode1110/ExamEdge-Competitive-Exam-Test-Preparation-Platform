import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../services/api.js";
import { updatePaymentState } from "../store/authSlice.js";
import { normalizeTestsListResponse } from "../utils/testsApi.js";
import {
  buildRazorpayCheckoutOptions,
  logRazorpayFailure,
  razorpayFailureMessage,
  resolveRazorpayPublicKey
} from "../utils/razorpayCheckout.js";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Modal } from "../components/ui/Modal";

function normalizeExam(examValue) {
  const v = String(examValue || "").toUpperCase();
  if (v.includes("JEE")) return "JEE Main";
  if (v.includes("MHT")) return "MHT-CET";
  return "Other";
}

export function TestSelectionPage() {
  const nav = useNavigate();
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((s) => s.auth);

  const [tests, setTests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | JEE Main | MHT-CET
  const [selectedTest, setSelectedTest] = useState(null);
  const [startBusy, setStartBusy] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [testsAttempted, setTestsAttempted] = useState(0);

  const pageSessionKey = useMemo(() => `examedge_page_session_${Date.now()}`, []);
  const pageSessionId = useMemo(
    () => (crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`).toString(),
    [pageSessionKey]
  );

  /**
   * IMPORTANT: depend only on `accessToken` (stable string).
   * Including `user` caused infinite reload: /me updates user → effect re-runs →
   * previous fetch cleanup sets cancelled=true → finally skips setLoading(false) → skeleton forever.
   */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log("[TestSelection] Fetching tests from /api/tests …");
        }

        const data = await apiFetch("/api/tests", { token: accessToken });

        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log("[TestSelection] Tests API response:", data);
        }

        const list = normalizeTestsListResponse(data);
        if (!cancelled) setTests(list);

        try {
          const me = await apiFetch("/api/auth/me", { token: accessToken });
          if (!cancelled && me?.user) {
            dispatch(
              updatePaymentState({
                isPremium: me.user.isPremium,
                purchasedTests: me.user.purchasedTests,
                testsAttempted: me.user.testsAttempted
              })
            );
            setIsPremium(!!me.user.isPremium);
            setTestsAttempted(me.user.testsAttempted || 0);
          }
        } catch {
          if (!cancelled) {
            const u = user;
            if (u) {
              setIsPremium(!!u.isPremium);
              setTestsAttempted(u.testsAttempted || 0);
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e.message || "Failed to load tests";
          setError(msg);
          setTests([]);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, dispatch]);

  const filtered = useMemo(() => {
    if (!Array.isArray(tests)) return [];
    if (filter === "all") return tests;
    return tests.filter((t) => normalizeExam(t.exam) === filter);
  }, [tests, filter]);

  if (!accessToken) {
    return (
      <div className="container-centered py-12">
        <Card className="max-w-2xl mx-auto">
          <CardBody className="py-12 text-center">
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">Test Selection</h1>
            <p className="text-secondary-600 mb-6">Please log in to pick your exam.</p>
            <Link to="/login">
              <Button variant="primary">Go to Login</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  const freeLimitReached = !isPremium && testsAttempted >= 2;

  const handlePayment = async (type, testId = null) => {
    try {
      setStartBusy(true);
      setError("");

      const orderRes = await apiFetch("/api/payment/create-order", {
        method: "POST",
        token: accessToken,
        body: { type, testId }
      });

      // eslint-disable-next-line no-console
      console.log("[Razorpay] Order response:", orderRes);

      if (!orderRes.success || !orderRes.order || !orderRes.order.id) {
        throw new Error(orderRes?.message || "Could not create order or missing order_id");
      }

      let keyData = null;
      if (!orderRes.key && !orderRes.key_id) {
        keyData = await apiFetch("/api/payment/get-key", { token: accessToken });
        if (!keyData.success || !keyData.key) throw new Error("Could not retrieve payment keys");
      } else {
        keyData = { key: orderRes.key || orderRes.key_id, mode: orderRes.mode };
      }

      if (keyData.mode === "live" && import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[Razorpay] Live key in dev — use rzp_test_* for local test payments.");
        toast("Live Razorpay key in development. Prefer rzp_test_* keys.", { icon: "⚠️" });
      }

      const publicKey = resolveRazorpayPublicKey(orderRes, keyData);
      if (!publicKey) throw new Error("Missing Razorpay public key");

      const description = type === "full" ? "Unlock All Tests" : "Unlock Single Test";

      const options = buildRazorpayCheckoutOptions({
        key: publicKey,
        order: orderRes.order,
        name: "ExamEdge",
        description,
        user,
        onDismiss: () => {
          // eslint-disable-next-line no-console
          console.log("[Razorpay] Checkout closed");
          toast("Checkout closed", { icon: "ℹ️" });
        },
        handler: async function (response) {
          // eslint-disable-next-line no-console
          console.log("[Razorpay] Payment success:", response);
          try {
            const verifyRes = await apiFetch("/api/payment/verify-payment", {
              method: "POST",
              token: accessToken,
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                type: orderRes.type,
                testId: orderRes.testId
              }
            });

            if (verifyRes.success || verifyRes.ok) {
              dispatch(
                updatePaymentState({
                  isPremium: verifyRes.isPremium,
                  purchasedTests: verifyRes.purchasedTests
                })
              );
              setIsPremium(!!verifyRes.isPremium);
              // The user state is managed by Redux, so mutating user.purchasedTests directly throws an error.
              // We rely on the updatePaymentState dispatch above to update the Redux state.
              toast.success("Payment successful! You can now start the test.");
            } else {
              const msg = "Payment verification failed";
              toast.error(msg);
              setError(msg);
            }
          } catch (e) {
            const msg = e.message || "Payment verification error";
            toast.error(msg);
            setError(msg);
          }
        }
      });

      // eslint-disable-next-line no-console
      console.log("[Razorpay] Checkout options:", {
        ...options,
        key: options.key ? `${String(options.key).slice(0, 10)}…` : ""
      });

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        logRazorpayFailure("TestSelectionPage", response);
        const msg = razorpayFailureMessage(response);
        toast.error(msg);
        setError(msg);
      });
      rzp.open();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Razorpay] handlePayment error:", e);
      const msg = e.message || "Payment initiation failed";
      toast.error(msg);
      setError(msg);
    } finally {
      setStartBusy(false);
    }
  };

  return (
    <div className="container-centered py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-secondary-900">Choose Your Test</h1>
        <p className="text-secondary-600 mt-1">
          {user?.name ? `Hi ${user.name.split(" ")[0]}. ` : ""}Select JEE Main or MHT-CET and start.
        </p>
      </div>

      {freeLimitReached && !isPremium && (
        <div className="mb-6">
          <Alert variant="warning">
            <div className="font-semibold mb-1">Free Limit Reached</div>
            <div>You have used all 2 of your free mock tests. Upgrade to Premium to access all tests permanently.</div>
            <div className="mt-4">
              <Button variant="primary" onClick={() => handlePayment("full")}>
                Unlock All Tests for ₹299
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {error ? (
        <Alert variant="error" dismissible onDismiss={() => setError("")} className="mb-6">
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-secondary-700">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All Exams</option>
            <option value="JEE Main">JEE Main</option>
            <option value="MHT-CET">MHT-CET</option>
          </select>
        </div>

        <Button variant="outline" size="sm" onClick={() => nav("/")}>
          Back to Dashboard
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5">
              <div className="skeleton h-8 w-2/3" />
              <div className="mt-3 skeleton h-4 w-full" />
              <div className="mt-2 skeleton h-4 w-5/6" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50">
          <CardBody className="py-10 text-center">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Could not load tests</h2>
            <p className="text-red-800 text-sm mb-4">{error}</p>
            <p className="text-secondary-600 text-sm mb-4">
              Check that the backend is running, <code className="bg-white px-1 rounded">GET /api/tests</code> returns JSON,
              and your session is valid.
            </p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardBody>
        </Card>
      ) : !tests.length ? (
        <Card>
          <CardBody className="py-12 text-center">
            <h2 className="text-lg font-semibold text-secondary-900 mb-2">No tests available</h2>
            <p className="text-secondary-600 text-sm max-w-lg mx-auto">
              The server returned an empty list. Seed or create tests in MongoDB (active tests) or use the admin panel to
              add tests.
            </p>
          </CardBody>
        </Card>
      ) : !filtered.length ? (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="text-secondary-600">No tests match this filter. Try &quot;All Exams&quot;.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const id = t._id ?? t.id;
            return (
              <Card key={String(id)} className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-lg text-secondary-900">{t.name || "Untitled Test"}</div>
                      <div className="text-sm text-secondary-600">{normalizeExam(t.exam)}</div>
                    </div>
                    <span className="badge bg-primary-100 text-primary-700">Available</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3 py-3 border-t border-b border-secondary-200">
                    <div>
                      <div className="text-xs text-secondary-600 font-medium">Duration</div>
                      <div className="text-sm font-semibold text-secondary-900">{Math.round(Number(t.durationMs || 0) / 60000)} min</div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary-600 font-medium">Questions</div>
                      <div className="text-sm font-semibold text-secondary-900">{t.totalQuestions || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary-600 font-medium">Difficulty</div>
                      <div className="text-sm font-semibold text-success-700">Easy</div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary-600 font-medium">Pattern</div>
                      <div className="text-sm font-semibold text-secondary-900">MCQ</div>
                    </div>
                  </div>
                  {t.description && <div className="text-sm text-secondary-600 mb-2">{t.description}</div>}
                </div>
                <div>
                  {freeLimitReached && !isPremium && !(user?.purchasedTests || []).some((p) => String(p) === String(id)) ? (
                    <Button variant="primary" className="w-full" onClick={() => handlePayment("single", id)} disabled={startBusy}>
                      Unlock for ₹99
                    </Button>
                  ) : (
                    <Button variant="primary" className="w-full" onClick={() => setSelectedTest({ ...t, _id: id })} disabled={startBusy}>
                      Start Test
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!selectedTest}
        onClose={() => !startBusy && setSelectedTest(null)}
        title="Start Test"
        onSubmit={async () => {
          if (!selectedTest || !accessToken) return;
          setStartBusy(true);
          setError("");
          try {
            const data = await apiFetch("/api/test-sessions/start", {
              method: "POST",
              token: accessToken,
              body: {
                testId: selectedTest._id,
                sessionId: pageSessionId
              }
            });
            try {
              localStorage.setItem(`examedge_attempt_session_${data.testSessionId}`, pageSessionId);
            } catch {
              // ignore storage failures
            }
            setSelectedTest(null);
            nav(`/exam/${data.testSessionId}`);
          } catch (e) {
            setError(e.message || "Failed to start test");
          } finally {
            setStartBusy(false);
          }
        }}
        submitLabel={startBusy ? "Starting..." : "Start"}
        closeLabel="Cancel"
      >
        <p className="text-sm text-secondary-700">Are you sure you want to start this test? Timer will begin immediately.</p>
      </Modal>
    </div>
  );
}

export default TestSelectionPage;
