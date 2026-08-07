import mongoose from "mongoose";
import Razorpay from "razorpay";

const paymentSchema = new mongoose.Schema({
    razorpay_order_id:{
        type:String,
        required:true,
    },
    razorpay_payment_id:{
        type:String,
        required:true,

    },razorpay_signature:{
        type:String,
        required:true,
    }
});

export const Payment = mongoose.model("Payment",paymentSchema);
