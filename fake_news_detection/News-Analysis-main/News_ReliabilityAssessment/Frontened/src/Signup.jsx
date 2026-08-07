import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate for routing

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  
  const navigate = useNavigate(); // Hook to navigate to another page

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Signup Data:", formData);
    alert("Signup successful! Data logged to console.");
  };

  const handleForgotPassword = () => {
    // Navigate to the forgot password page
    navigate("/forgot-password");
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-pink-400 via-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white bg-opacity-50 backdrop-blur-sm shadow-lg rounded-lg p-8 max-w-md w-full">
        <h1 className="text-4xl font-extrabold text-center text-white mb-6">Create an Account</h1>

        {/* Circular Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">👤</span> {/* Replace with your logo */}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full border-b-2 border-gray-300 p-2 bg-transparent text-gray-700 focus:outline-none focus:ring focus:ring-blue-300"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1 block w-full border-b-2 border-gray-300 p-2 bg-transparent text-gray-700 focus:outline-none focus:ring focus:ring-blue-300"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="mt-1 block w-full border-b-2 border-gray-300 p-2 bg-transparent text-gray-700 focus:outline-none focus:ring focus:ring-blue-300"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 transition"
          >
            Signup
          </button>
        </form>

        {/* Forgot Password link */}
        <div className="mt-4 text-center">
          <button
            onClick={handleForgotPassword}
            className="text-pink-600 hover:text-pink-800 focus:outline-none"
          >
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
