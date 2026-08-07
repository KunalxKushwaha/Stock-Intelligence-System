import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import p12Image from "./p12.jpg"; // Adjust the path based on your folder structure
import axios from "axios";

const Home = () => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Sync dark mode with localStorage to persist user's theme preference across page reloads
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") {
      setIsDarkMode(true);
    }
  }, []);

  // Toggle Dark Mode and update localStorage
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("theme", !isDarkMode ? "dark" : "light");
  };

  const handleGetStarted = () => {
    navigate("/analyze");
  };

  const checkoutHandler = async (amount) => {
    try {
      const {
        data: { key },
      } = await axios.get("http://localhost:4000/api/getkey");

      const {
        data: { order },
      } = await axios.post("http://localhost:4000/api/checkout", {
        amount,
      });

      const options = {
        key,
        amount: order.amount,
        currency: "INR",
        name: "Vaibhav",
        description: "RazorPay",
        image: "https://avatars.githubusercontent.com/u/145020241?v=4",
        order_id: order.id,
        callback_url: "http://localhost:4000/api/paymentverification",
        prefill: {
          name: "Vaibhav",
          email: "vaibhavkhandelwal@example.com",
          contact: "7737821875",
        },
        notes: {
          address: "Razorpay Corporate Office",
        },
        theme: {
          color: "#121212",
        },
      };

      const razor = new window.Razorpay(options);
      razor.open();
    } catch (error) {
      console.error("Checkout Error:", error.message);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-all duration-500 ${
        isDarkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-800"
      }`}
    >
      {/* Dark Mode Toggle Button */}
      <div className="absolute top-16 right-6 z-50">
        <button
          onClick={toggleDarkMode}
          className="bg-indigo-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-indigo-400 transition-colors ease-in-out duration-300 transform hover:scale-110"
        >
          {isDarkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative py-20 bg-gradient-to-r from-blue-500 via-lightblue-400 to-teal-300">
        <div className="container mx-auto text-center text-white">
          <h1 className="text-4xl font-bold mb-6">
            Welcome to Fake News Detector
          </h1>
          <p className="text-lg mb-8 opacity-90">
            Leverage advanced AI to analyze news content or URLs to assess
            their authenticity.
          </p>
          <img
            src={p12Image}
            alt="Fake News Detection"
            className="mb-8 rounded-lg shadow-xl border-8 border-white mx-auto"
          />
          <button
            onClick={handleGetStarted}
            className="bg-white text-teal-600 text-lg px-10 py-4 rounded-full shadow-xl hover:bg-teal-100 transition-transform ease-in-out duration-300 transform hover:scale-105"
          >
            Get Started
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-300">
        <div className="container mx-auto text-center text-gray-800">
          <h2 className="text-3xl font-semibold mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="p-6 bg-white rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <h3 className="text-xl font-semibold mb-4 text-teal-400">
                Real-Time Analysis
              </h3>
              <p className="text-gray-700">
                Instantly assess the content or URL using cutting-edge AI to
                ensure credibility.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <h3 className="text-xl font-semibold mb-4 text-teal-400">
                Easy to Use
              </h3>
              <p className="text-gray-700">
                A user-friendly interface designed to offer a seamless
                experience for all.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <h3 className="text-xl font-semibold mb-4 text-teal-400">
                Reliable Results
              </h3>
              <p className="text-gray-700">
                Powered by AI models that ensure high accuracy for every
                analysis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-16 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600">
        <div className="container mx-auto text-center text-white">
          <h2 className="text-3xl font-semibold mb-8">What Users Are Saying</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="p-6 bg-white rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <p className="text-gray-700 italic mb-4">
                "This tool is incredibly accurate! It has helped me avoid
                spreading fake news."
              </p>
              <p className="font-semibold text-teal-500">- John D.</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <p className="text-gray-700 italic mb-4">
                "Essential for any journalist or content creator. A must-have
                tool."
              </p>
              <p className="font-semibold text-teal-500">- Sarah L.</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <p className="text-gray-700 italic mb-4">
                "Effortless to use and highly reliable. I highly recommend it!"
              </p>
              <p className="font-semibold text-teal-500">- Mark P.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-16 bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800">
        <div className="container mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-6">
            Start Detecting Fake News Today
          </h2>
          <button
            onClick={handleGetStarted}
            className="bg-white text-teal-600 text-lg px-10 py-4 rounded-full shadow-xl hover:bg-teal-100 transition-transform ease-in-out duration-300 transform hover:scale-105"
          >
            Get Started Now
          </button>
        </div>
      </div>

      <div className="text-center my-10">
        <button
          onClick={() => checkoutHandler(5000)}
          className="bg-teal-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-teal-500 transition-colors ease-in-out duration-300"
        >
          Subscribe Now
        </button>
      </div>

      {/* Footer Section */}
      <footer className="bg-gray-800 text-gray-400 py-6">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-center md:text-left mb-4 md:mb-0">
            © 2024 Fake News Detector. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-white transition ease-in-out duration-300">
              Terms of Service
            </a>
            <a href="#" className="hover:text-white transition ease-in-out duration-300">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition ease-in-out duration-300">
              Contact Us
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
