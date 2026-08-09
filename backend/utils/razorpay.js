import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

if (process.env.NODE_ENV !== "production") {
  if (keyId && !keyId.startsWith("rzp_test_")) {
    // eslint-disable-next-line no-console
    console.warn(
      "[Razorpay] RAZORPAY_KEY_ID should start with rzp_test_ in local/dev to avoid live validation and card rules."
    );
  }
  if (!keyId || !keySecret) {
    // eslint-disable-next-line no-console
    console.warn(
      "[Razorpay] Set RAZORPAY_KEY_ID (rzp_test_…) and RAZORPAY_KEY_SECRET in backend/.env — see .env.example"
    );
  }
}

/** SDK requires non-empty keys at init; replace with real rzp_test_* values for checkout to work */
export const razorpayInstance = new Razorpay({
  key_id: keyId || "rzp_test_REPLACE_ME",
  key_secret: keySecret || "replace_me_secret"
});

export function isRazorpayTestKey() {
  return String(keyId || "").startsWith("rzp_test_");
}
