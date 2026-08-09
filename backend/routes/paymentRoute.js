import { Router } from "express";
import { createOrder, verifyPayment, getKey } from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const paymentRoutes = Router();

paymentRoutes.get("/get-key", authMiddleware(), getKey);
paymentRoutes.post("/create-order", authMiddleware(), createOrder);
paymentRoutes.post("/verify-payment", authMiddleware(), verifyPayment);
