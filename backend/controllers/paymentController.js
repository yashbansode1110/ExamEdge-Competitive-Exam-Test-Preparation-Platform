import crypto from "crypto";
import { razorpayInstance, isRazorpayTestKey } from "../utils/razorpay.js";
import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";

/** Prices in whole INR; Razorpay orders require amount in paise (INR × 100) */
const PRICE_SINGLE_INR = 99;
const PRICE_FULL_INR = 299;

function rupeesToPaise(rupees) {
  return Math.round(Number(rupees) * 100);
}

export const getKey = (req, res) => {
  const key = process.env.RAZORPAY_KEY_ID || "";
  const mode = key.startsWith("rzp_test_") ? "test" : key.startsWith("rzp_live_") ? "live" : "unknown";
  res.status(200).json({
    success: true,
    key,
    mode,
    currency: "INR"
  });
};

export const createOrder = async (req, res, next) => {
  try {
    const { type, testId } = req.body;
    let amountPaise;

    if (type === "single") {
      amountPaise = rupeesToPaise(PRICE_SINGLE_INR);
    } else if (type === "full") {
      amountPaise = rupeesToPaise(PRICE_FULL_INR);
    } else {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    if (!keyId || !keySecret) {
      // eslint-disable-next-line no-console
      console.error("[Razorpay] createOrder: missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment");
      return res.status(500).json({ success: false, message: "Razorpay is not configured on the server" });
    }

    if (!keyId.startsWith("rzp_test_") && process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[Razorpay] createOrder: expected rzp_test_* key in development for test checkout.");
    }

    const receipt = `r_${Date.now()}`;
    const options = {
      amount: amountPaise,
      currency: "INR",
      receipt,
      payment_capture: 1,
      notes: {
        source: "examedge",
        ptype: String(type),
        tid: testId ? String(testId) : "na"
      }
    };

    // eslint-disable-next-line no-console
    console.log("[Razorpay] Creating order:", {
      ...options,
      amount_paise: options.amount,
      amount_inr: options.amount / 100,
      testMode: isRazorpayTestKey()
    });

    const order = await razorpayInstance.orders.create(options);

    if (!order?.id) {
      // eslint-disable-next-line no-console
      console.error("[Razorpay] createOrder: missing order id", order);
      return res.status(500).json({ success: false, message: "Order creation failed" });
    }

    // eslint-disable-next-line no-console
    console.log("[Razorpay] Generated order:", {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt
    });

    res.status(201).json({
      success: true,
      ok: true,
      key: keyId,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency || "INR"
      },
      order_id: order.id,
      amount: order.amount,
      currency: order.currency || "INR",
      key_id: keyId,
      type,
      testId: testId || null,
      mode: isRazorpayTestKey() ? "test" : "live"
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Razorpay] Payment Order Creation Error:", error?.message || error, error?.error || "");
    res.status(500).json({
      success: false,
      message: error?.error?.description || error?.message || "Internal Server Error"
    });
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, type, testId } = req.body;

    // eslint-disable-next-line no-console
    console.log("[Razorpay] verifyPayment request:", {
      has_order_id: !!razorpay_order_id,
      has_payment_id: !!razorpay_payment_id,
      has_signature: !!razorpay_signature,
      type
    });

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      // eslint-disable-next-line no-console
      console.error("[Razorpay] verifyPayment: RAZORPAY_KEY_SECRET is not set");
      return res.status(500).json({ success: false, message: "Payment configuration error" });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment verification fields" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac("sha256", secret).update(body.toString()).digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // eslint-disable-next-line no-console
      console.error("[Razorpay] verifyPayment: signature mismatch");
      return res.status(400).json({
        success: false,
        message: "Invalid signature"
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const amountPaise = type === "single" ? rupeesToPaise(PRICE_SINGLE_INR) : rupeesToPaise(PRICE_FULL_INR);

    if (type === "single") {
      if (testId && !user.purchasedTests.some((id) => id.toString() === testId.toString())) {
        user.purchasedTests.push(testId);
      }
    } else if (type === "full") {
      user.isPremium = true;
    }

    await user.save();

    const payment = new Payment({
      userId: req.user.id,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: amountPaise,
      type,
      testId: type === "single" ? testId : undefined,
      status: "success"
    });
    await payment.save();

    // eslint-disable-next-line no-console
    console.log("[Razorpay] verifyPayment success:", { userId: req.user.id, razorpay_payment_id, type });

    res.status(200).json({
      success: true,
      ok: true,
      message: "Payment verified successfully",
      isPremium: user.isPremium,
      purchasedTests: user.purchasedTests
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Razorpay] Payment Verification Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
