import React from 'react';
import { useSearchParams } from "react-router-dom";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const referenceNum = searchParams.get("reference");

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-r from-green-400 via-green-500 to-green-600 text-white">
      <div className="bg-white text-green-600 shadow-lg rounded-lg p-10 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-16 h-16 mx-auto mb-6 text-green-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5 8.5A9.003 9.003 0 0112 21a9.003 9.003 0 01-8.535-5.5M3.5 12a9.003 9.003 0 0117.03-4.5m.47 1.5A9.003 9.003 0 0112 3a9.003 9.003 0 00-8.535 5.5M9 12l2 2 4-4"
          />
        </svg>
        <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-lg text-gray-700 mb-6">
          Thank you for your payment. Your transaction has been successfully completed.
        </p>
        {referenceNum && (
          <p className="text-lg text-gray-900 font-semibold">
            Reference ID: {referenceNum}
          </p>
        )}
        <button
          onClick={() => (window.location.href = '/')}
          className="px-6 py-3 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition-all duration-300"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
