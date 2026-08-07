import React from "react";
import { useLocation } from "react-router-dom";

const Result = () => {
  const location = useLocation();
  const { result, confidence } = location.state || {}; // Get the analysis result and confidence from state

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <div className="container mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold text-center mb-8">Analysis Result</h2>
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold">Result: {result}</h3>
          <p className="mt-4">Confidence Level: {confidence}%</p>
        </div>
      </div>
    </div>
  );
};

export default Result;
