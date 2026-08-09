import React, { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "./Button";
import { apiFetch } from "../../services/api";
import { useSelector, useDispatch } from "react-redux";
import { updatePaymentState } from "../../store/authSlice";
import { Alert } from "./Alert";
import {
  buildRazorpayCheckoutOptions,
  logRazorpayFailure,
  razorpayFailureMessage,
  resolveRazorpayPublicKey
} from "../../utils/razorpayCheckout.js";

export function PaymentButton({ type = "full", testId = null, onPaymentSuccess, text, className, variant = "primary" }) {
  const { accessToken, user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError("");

      const orderData = await apiFetch("/api/payment/create-order", {
        method: "POST",
        token: accessToken,
        body: { type, testId }
      });

      // eslint-disable-next-line no-console
      console.log("[Razorpay] Order response:", orderData);

      if (!orderData?.success || !orderData?.order?.id) {
        throw new Error(orderData?.message || "Failed to create order or missing order_id");
      }

      let keyData = null;
      if (!orderData.key && !orderData.key_id) {
        keyData = await apiFetch("/api/payment/get-key", { token: accessToken });
        if (!keyData.success || !keyData.key) throw new Error("Could not retrieve payment keys");
      } else {
        keyData = { key: orderData.key || orderData.key_id, mode: orderData.mode };
      }

      if (keyData.mode === "live" && import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[Razorpay] Live key in dev — use rzp_test_* keys for local test payments.");
        toast("Using a live Razorpay key in development. Prefer rzp_test_* keys.", { icon: "⚠️" });
      }

      const publicKey = resolveRazorpayPublicKey(orderData, keyData);
      if (!publicKey) throw new Error("Missing Razorpay public key");

      const description = type === "full" ? "Unlock All Premium Tests" : "Unlock Single Test";

      const options = buildRazorpayCheckoutOptions({
        key: publicKey,
        order: orderData.order,
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
            const verifyData = await apiFetch("/api/payment/verify-payment", {
              method: "POST",
              token: accessToken,
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                type,
                testId
              }
            });

            if (verifyData.success || verifyData.ok) {
              dispatch(
                updatePaymentState({
                  isPremium: verifyData.isPremium,
                  purchasedTests: verifyData.purchasedTests
                })
              );
              toast.success("Payment successful! Your access is updated.");
              if (onPaymentSuccess) {
                onPaymentSuccess();
              }
            } else {
              const msg = "Payment verification failed. Security mismatch.";
              toast.error(msg);
              setError(msg);
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("[Razorpay] Verification error:", err);
            const msg = err.message || "Payment verification failed";
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
        logRazorpayFailure("PaymentButton", response);
        const msg = razorpayFailureMessage(response);
        toast.error(msg);
        setError(msg);
      });
      rzp.open();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Razorpay] handlePayment error:", err);
      const msg = err.message || "Error initiating payment";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const defaultText = type === "full" ? "Unlock All Tests for ₹299" : "Unlock for ₹99";

  return (
    <div className={`flex flex-col items-center ${className || "w-full"}`}>
      {error && (
        <Alert variant="error" className="mb-4" dismissible onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}
      <Button
        variant={variant}
        onClick={(e) => {
          e.stopPropagation();
          handlePayment();
        }}
        disabled={loading}
        className={type === "full" ? "w-full sm:w-auto px-8 py-3 text-lg font-bold shadow-xl hover:shadow-2xl transition-all" : "w-full"}
      >
        {loading ? "Processing..." : text || defaultText}
      </Button>
      {import.meta.env.DEV ? (
        <p className="mt-2 max-w-md text-center text-xs text-secondary-500">
          Test mode: UPI <span className="font-mono font-semibold">success@razorpay</span>. Use the same{" "}
          <span className="font-mono">rzp_test_*</span> account in backend <span className="font-mono">.env</span> and
          optional <span className="font-mono">VITE_RAZORPAY_KEY</span>.
        </p>
      ) : null}
    </div>
  );
}
