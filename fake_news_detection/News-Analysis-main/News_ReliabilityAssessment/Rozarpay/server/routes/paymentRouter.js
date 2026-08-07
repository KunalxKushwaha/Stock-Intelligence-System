import express from "express";
import { checkout, paymentVerification } from "../controllers/paymentController.js";

const router = express.Router();

// Route for checkout
router.route("/checkout").post(checkout);

// Route for payment verification
router.route("/paymentverification").post(paymentVerification);

export default router;
