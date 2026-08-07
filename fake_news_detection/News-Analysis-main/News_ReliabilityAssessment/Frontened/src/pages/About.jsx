import React from "react";
import { FaCheckCircle, FaLightbulb, FaShieldAlt, FaBullhorn } from "react-icons/fa";
import benefitsImage from "./benefits.webp";
import innovationImage from "./innovation.jpeg";
import extensionImage from "./extension-image.png";

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-pink-100 via-rose-100 to-pink-200 text-gray-800 pt-16">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <h1 className="text-5xl font-extrabold text-center text-indigo-900 mb-6 animate__animated animate__fadeIn">
          About Fake News Detector
         
        </h1>
        <p className="text-lg leading-8 text-center max-w-4xl mx-auto mb-12 text-gray-700">
          The Fake News Detector is a powerful AI-driven platform designed to combat the spread of misinformation in today's digital age.
          By analyzing news articles, URLs, or user-provided content, our system helps users quickly determine the authenticity of news.
        </p>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 p-8 rounded-lg shadow-xl hover:shadow-2xl transition transform hover:-translate-y-2">
            <div className="flex items-center mb-4">
              <FaShieldAlt className="text-pink-700 text-3xl mr-4" />
              <h2 className="text-2xl font-semibold text-pink-800">
                How It Works
              </h2>
            </div>
            <p className="text-gray-600 leading-7">
              Our platform uses cutting-edge technologies, including Natural Language Processing (NLP) and deep learning, to analyze the textual patterns, context, and credibility of news content.
              It evaluates factors such as:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-gray-700">
              <li>Source credibility</li>
              <li>Language and writing style patterns</li>
              <li>Cross-referencing with verified databases</li>
              <li>Sentiment and fact-checking analysis</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-pink-50 via-amber-50 to-yellow-50 p-8 rounded-lg shadow-xl hover:shadow-2xl transition transform hover:-translate-y-2">
            <div className="flex items-center mb-4">
              <FaBullhorn className="text-pink-700 text-3xl mr-4" />
              <h2 className="text-2xl font-semibold text-pink-800">
                Why Fake News Detection Matters
              </h2>
            </div>
            <p className="text-gray-600 leading-7">
              Fake news can have a significant impact on society, influencing public opinion, spreading misinformation, and even causing harm.
              Our mission is to empower individuals and organizations to:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-gray-700">
              <li>Identify credible news sources</li>
              <li>Make informed decisions</li>
              <li>Reduce the spread of misinformation</li>
              <li>Foster trust in digital media</li>
            </ul>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center text-pink-900 mb-6">
            Benefits of Using Fake News Detector
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="w-full flex justify-center">
              <img
                src={benefitsImage}
                alt="Benefits of Fake News Detector"
                className="rounded-lg shadow-xl hover:shadow-2xl transition transform hover:scale-105"
              />
            </div>
            <div className="flex flex-col justify-center">
              <ul className="space-y-4">
                <li className="flex items-center text-gray-700">
                  <FaCheckCircle className="text-pink-600 text-2xl mr-3" />
                  <span>Save time by quickly verifying news authenticity.</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <FaCheckCircle className="text-pink-600 text-2xl mr-3" />
                  <span>Promote informed decision-making.</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <FaCheckCircle className="text-pink-600 text-2xl mr-3" />
                  <span>Reduce the spread of harmful misinformation.</span>
                </li>
                <li className="flex items-center text-gray-700">
                  <FaCheckCircle className="text-pink-600 text-2xl mr-3" />
                  <span>Enhance trust in digital media and journalism.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Extension Download Section with Lighter Container */}
        <div className="bg-gradient-to-r from-pink-100 via-pink-200 to-pink-300 p-8 rounded-lg shadow-lg mt-16 hover:shadow-xl transition transform hover:scale-105">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    <div className="flex flex-col justify-center">
      <h2 className="text-3xl font-semibold text-pink-900 mb-4">
        Download Our Extension for Your Social Media Platforms
      </h2>
      <p className="leading-7 mb-6 text-gray-700">
        Enhance your social media experience by adding our Fake News Detector extension. Easily detect fake news while browsing your favorite platforms, stay informed, and make smarter decisions online.
      </p>
      <a 
        href="https://drive.google.com/drive/folders/1z2xibpAAriTdTY_S6kBJyQ_wnz6yiRC3?usp=sharing" 
        download
        className="bg-pink-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:bg-pink-700 transition transform hover:scale-105"
      >
        Download Now
      </a>
    </div>
    <div className="w-full flex justify-center">
      <img
        src={extensionImage}
        alt="Extension Example"
        className="rounded-lg shadow-xl hover:shadow-2xl transition transform hover:scale-105"
      />
    </div>
  </div>
</div>

        {/* Innovation Section with Lighter Container */}
        <div className="bg-gradient-to-r from-pink-100 via-pink-200 to-pink-300 text-gray-800 p-8 rounded-lg shadow-lg mt-16 hover:shadow-xl transition transform hover:scale-105">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col justify-center">
              <h2 className="text-3xl font-semibold mb-4 text-pink-900">
                Our Commitment to Innovation
              </h2>
              <p className="leading-7 text-gray-700">
                We are committed to continually improving our detection capabilities by leveraging the latest advancements in artificial intelligence and machine learning.
                With a growing dataset of verified news articles and robust algorithms, our platform evolves to stay ahead of emerging challenges in the fight against fake news.
              </p>
            </div>
            <div className="w-full flex justify-center">
              <img
                src={innovationImage}
                alt="Innovation"
                className="rounded-lg shadow-xl hover:shadow-2xl transition transform hover:scale-105"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-6 mt-16">
        <div className="container mx-auto text-center">
          <div className="flex justify-center space-x-8 mb-4">
            <a href="/terms" className="hover:underline text-white">
              Terms and Conditions
            </a>
            <a href="/privacy" className="hover:underline text-white">
              Privacy Policy
            </a>
            <a href="/about" className="hover:underline text-white">
              About Us
            </a>
            <a href="/contact" className="hover:underline text-white">
              Contact
            </a>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} Fake News Detector. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default About;
