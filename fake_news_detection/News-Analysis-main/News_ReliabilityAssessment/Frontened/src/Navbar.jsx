import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="bg-gray-800 text-white fixed top-0 left-0 w-full shadow-md z-50">
      <div className="container mx-auto flex justify-between items-center py-4 px-6">
        <h2 className="text-lg font-bold">Fake News Detector</h2>
        <div className="flex space-x-6">
          <Link to="/" className="text-white hover:text-gray-300">Home</Link>
          <Link to="/about" className="text-white hover:text-gray-300">About</Link>
          <Link to="/login" className="text-white hover:text-gray-300">Login</Link>
          <Link to="/signup" className="text-white hover:text-gray-300">Signup</Link>
          <Link to="/Analyze" className="text-white hover:text-gray-300">Analyze</Link> {/* New Analyze link */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
