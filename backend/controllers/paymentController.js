import crypto from "crypto";
import { razorpayInstance } from "../utils/razorpay.js";
import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";

export const createOrder = async (req, res, next) => {
  try {
    const { type, testId } = req.body;
    let amount;

    if (type === "single") {
      amount = 9900; // ₹99
    } else if (type === "full") {
      amount = 29900; // ₹299
    } else {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    const options = {
      amount,
      currency: "INR",
      receipt: `receipt_${type}_${Date.now()}`
    };

    const order = await razorpayInstance.orders.create(options);
    
    if (!order) {
      return res.status(500).json({ success: false, message: "Order creation failed" });
    }

    res.status(201).json({
      success: true,
      order,
      type,
      testId
    });
  } catch (error) {
    console.error("Payment Order Creation Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, type, testId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "YourKeySecret")
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature"
      });
    }

    // Payment verified, update User
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let amount = type === "single" ? 9900 : 29900;

    if (type === "single") {
      if (testId && !user.purchasedTests.includes(testId)) {
        user.purchasedTests.push(testId);
      }
    } else if (type === "full") {
      user.isPremium = true;
    }
    
    await user.save();

    // Store payment in DB
    const payment = new Payment({
      userId: req.user.id,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount,
      type,
      testId: type === "single" ? testId : undefined,
      status: "success"
    });
    await payment.save();

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      isPremium: user.isPremium,
      purchasedTests: user.purchasedTests
    });
  } catch (error) {
    console.error("Payment Verification Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
