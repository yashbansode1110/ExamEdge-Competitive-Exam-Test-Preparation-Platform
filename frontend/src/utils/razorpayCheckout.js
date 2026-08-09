/**
 * Razorpay Standard Checkout (India / INR).
 *
 * IMPORTANT: When `order_id` is set, do NOT pass `amount` or `currency` in checkout options.
 * Razorpay loads them from the order; passing mismatched types/values often causes
 * `api.razorpay.com/... 400 (Bad Request)` at payment time.
 *
 * Test UPI: success@razorpay
 * @see https://razorpay.com/docs/payments/payments/test-card-upi-details/
 */

/** Prefer key returned with the order (same account as order); optional VITE_RAZORPAY_KEY for sanity check */
export function resolveRazorpayPublicKey(orderResponse, keyResponse) {
  const fromOrder = orderResponse?.key || orderResponse?.key_id || "";
  const fromApi = keyResponse?.key || "";
  const fromEnv = String(import.meta.env.VITE_RAZORPAY_KEY || "").trim();
  const chosen = fromOrder || fromApi || fromEnv;
  if (fromEnv && fromOrder && fromEnv !== fromOrder) {
    // eslint-disable-next-line no-console
    console.warn(
      "[Razorpay] VITE_RAZORPAY_KEY does not match server order key — using server key so payment matches the order."
    );
  }
  if (fromEnv && !fromOrder && !fromApi && fromEnv) {
    // eslint-disable-next-line no-console
    console.warn("[Razorpay] Using VITE_RAZORPAY_KEY only — ensure it matches backend RAZORPAY_KEY_ID.");
  }
  return chosen;
}

/** 10-digit Indian mobile; omit if invalid (bad contact strings can break checkout) */
export function sanitizeIndianContact(user) {
  const raw = user?.phone || user?.contact || "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return "";
}

export function buildRazorpayCheckoutOptions({
  key,
  order,
  name,
  description,
  user,
  handler,
  onDismiss
}) {
  const orderId = order?.id || order?.order_id;
  const isTestKey = String(key || "").startsWith("rzp_test_");

  if (!key) {
    throw new Error("Missing Razorpay key_id");
  }
  if (!orderId) {
    throw new Error("Missing Razorpay order_id");
  }

  const prefill = {
    name: user?.name || "",
    email: user?.email || ""
  };
  const contact = sanitizeIndianContact(user);
  if (contact) {
    prefill.contact = contact;
  }

  const options = {
    key,
    /** amount & currency intentionally omitted — resolved from order when order_id is present */
    order_id: orderId,
    name: name || "ExamEdge",
    description: description || "Unlock Premium Tests",
    handler,
    modal: {
      ondismiss() {
        // eslint-disable-next-line no-console
        console.log("[Razorpay] Checkout closed (modal ondismiss)");
        if (typeof onDismiss === "function") onDismiss();
      }
    },
    prefill,
    theme: {
      color: "#2563eb"
    },
    ...(isTestKey
      ? {
          notes: {
            checkout: "test"
          }
        }
      : {})
  };

  return options;
}

export function logRazorpayFailure(context, response) {
  // eslint-disable-next-line no-console
  console.error(`[Razorpay] payment.failed (${context}):`, response);
  const err = response?.error;
  if (err) {
    // eslint-disable-next-line no-console
    console.error("[Razorpay] error object:", err);
  }
}

export function razorpayFailureMessage(response) {
  const e = response?.error;
  if (!e) return "Payment failed";
  const parts = [e.description, e.reason, e.code, e.step, e.source, e.field].filter(Boolean);
  const msg = parts.join(" — ") || "Payment failed";
  if (String(e.description || "").toLowerCase().includes("international")) {
    return `${msg} In test mode use a Razorpay test card or UPI success@razorpay (see Razorpay test docs).`;
  }
  if (String(e.description || e.reason || "").toLowerCase().includes("bad request")) {
    return `${msg} If this persists, confirm backend uses rzp_test_* keys and order was created with the same account.`;
  }
  return msg;
}
