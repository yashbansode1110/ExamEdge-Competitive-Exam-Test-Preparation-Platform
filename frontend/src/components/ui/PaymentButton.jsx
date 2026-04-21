import React, { useState } from "react";
import { Button } from "./Button";
import { apiFetch } from "../../services/api";
import { useSelector, useDispatch } from "react-redux";
import { updatePaymentState } from "../../store/authSlice";
import { Alert } from "./Alert";

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

      if (!orderData || !orderData.order) {
        throw new Error("Failed to create order");
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_YourKeyId",
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "ExamEdge",
        description: type === "full" ? "Unlock All Premium Tests" : "Unlock Single Test",
        order_id: orderData.order.id,
        handler: async function (response) {
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
              dispatch(updatePaymentState({ 
                isPremium: verifyData.isPremium, 
                purchasedTests: verifyData.purchasedTests 
              }));
              
              if (onPaymentSuccess) {
                onPaymentSuccess();
              }
            } else {
              setError("Payment verification failed. Security mismatch.");
            }
          } catch (err) {
            console.error("Verification error:", err);
            setError(err.message || "Payment verification failed");
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email
        },
        theme: {
          color: type === "full" ? "#3b82f6" : "#f59e0b"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        console.error("Payment Failed:", response.error);
        setError(response.error.description || "Payment failed");
      });
      rzp.open();
    } catch (err) {
      setError(err.message || "Error initiating payment");
    } finally {
      setLoading(false);
    }
  };

  const defaultText = type === "full" ? "Unlock All Tests for ₹299" : "Unlock for ₹99";

  return (
    <div className={`flex flex-col items-center ${className || 'w-full'}`}>
      {error && (
        <Alert variant="error" className="mb-4" dismissible onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}
      <Button 
        variant={variant} 
        onClick={(e) => { e.stopPropagation(); handlePayment(); }} 
        disabled={loading}
        className={type === "full" ? "w-full sm:w-auto px-8 py-3 text-lg font-bold shadow-xl hover:shadow-2xl transition-all" : "w-full"}
      >
        {loading ? "Processing..." : (text || defaultText)}
      </Button>
    </div>
  );
}
