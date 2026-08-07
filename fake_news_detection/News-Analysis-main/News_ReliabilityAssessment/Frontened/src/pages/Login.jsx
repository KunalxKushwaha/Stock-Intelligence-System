import React, { useState } from "react";
import axios from "axios";
import { FaGoogle, FaFacebook, FaTwitter, FaInstagram, FaLock, FaUser } from "react-icons/fa";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post("http://localhost:5000/login", formData);
      setMessage(response.data.message);  // Display login success message
    } catch (error) {
      setMessage(error.response ? error.response.data.message : 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-pink-400 via-blue-500 to-purple-600">
      <div className="bg-white bg-opacity-50 backdrop-blur-sm shadow-lg rounded-lg p-8 max-w-sm w-full">
        <h1 className="text-4xl font-extrabold text-center text-white mb-6">Welcome Back</h1>
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">👤</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center border-b-2 border-gray-300 pb-2">
            <FaUser className="text-gray-600 mr-2" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1 block w-full bg-transparent text-gray-700 focus:outline-none"
              placeholder="Email"
            />
          </div>
          <div className="flex items-center border-b-2 border-gray-300 pb-2">
            <FaLock className="text-gray-600 mr-2" />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="mt-1 block w-full bg-transparent text-gray-700 focus:outline-none"
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 transition"
          >
            Login
          </button>

          <div className="text-center mt-4">
            <a href="/forgot-password" className="text-pink-600 hover:underline">
              Forgot Password?
            </a>
          </div>
        </form>

        {message && <div className="text-center mt-4 text-white">{message}</div>}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">Or login with</p>
          <div className="flex justify-center gap-4">
            <button onClick={() => handleSocialLogin("google")} className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100">
              <FaGoogle className="text-red-600" />
            </button>
            <button onClick={() => handleSocialLogin("facebook")} className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100">
              <FaFacebook className="text-blue-600" />
            </button>
            <button onClick={() => handleSocialLogin("twitter")} className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100">
              <FaTwitter className="text-blue-400" />
            </button>
            <button onClick={() => handleSocialLogin("instagram")} className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100">
              <FaInstagram className="text-pink-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
