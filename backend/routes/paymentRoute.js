import { Router } from "express";
import { createOrder, verifyPayment } from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const paymentRoutes = Router();

paymentRoutes.post("/create-order", authMiddleware(), createOrder);
paymentRoutes.post("/verify-payment", authMiddleware(), verifyPayment);
