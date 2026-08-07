import React, { useState } from "react";
import './Analyze.css';

const Analyze = () => {
  const [contentInput, setContentInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [resultColor, setResultColor] = useState("");
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // State to handle loading
  const [error, setError] = useState(""); // Error state

  const handleAnalyze = async () => {
    if (!contentInput.trim() && !urlInput.trim()) {
      alert("Please enter some content or a URL!");
      return;
    }

    setIsLoading(true);
    setError(""); // Clear previous errors

    try {
      const response = await fetch("http://127.0.0.1:5000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: contentInput || urlInput,
        }),
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();

      if (data.result === "REAL") {
        setAnalysisResult("The news is real");
        setResultColor("green");
      } else {
        setAnalysisResult("The news is fake");
        setResultColor("red");
      }

      setIsAnalyzed(true);
    } catch (error) {
      console.error("Fetch error:", error);
      setError("Error in analysis. Please try again.");
      setResultColor("gray");
      setIsAnalyzed(true);
    } finally {
      setIsLoading(false);
    }
  };

  const userInput = contentInput || urlInput;

  return (
    <div className="analyze-container">
      {!isAnalyzed ? (
        <div className="analyze-card">
          <h1 className="analyze-heading">Analyze News Content or URL</h1>
          {error && <div className="error-message">{error}</div>} {/* Display error */}
          <div className="input-section">
            <h2 className="section-heading">Enter URL</h2>
            <textarea
              rows="4"
              placeholder="Paste the URL here..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="analyze-textarea url-textarea"
            ></textarea>
          </div>

          <div className="input-section">
            <h2 className="section-heading">Enter Content</h2>
            <textarea
              rows="6"
              placeholder="Paste the news content here..."
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              className="analyze-textarea content-textarea"
            ></textarea>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={handleAnalyze}
              className="analyze-button"
              disabled={isLoading} // Disable button while loading
            >
              {isLoading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>
      ) : (
        <div className="result-container">
          <div className="result-section fade-in">
            <h1 className={`result-text ${resultColor}`}>{analysisResult}</h1>
            <div className={`highlighted-input ${resultColor}`}>
              <p>{userInput}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analyze;