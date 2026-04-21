import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: String, required: true },
  paymentId: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["single", "full"], required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },
  status: { type: String, enum: ["success", "failed", "pending"], default: "success" }
}, { timestamps: true });

export const Payment = mongoose.model("Payment", PaymentSchema);
