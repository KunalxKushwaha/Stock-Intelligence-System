import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./Navbar";
import Home from "./pages/Home";
import About from "./pages/About";
import Login from "./pages/Login";
import Signup from "./Signup"; // Import the Signup component
import Analyze from "./Analyze"
import paymentSuccess from "./pages/paymentSuccess";
const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} /> {/* Add the Signup route */}
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/paymentsuccess" element={<paymenSuccess />} />

      </Routes>
    </Router>
  );
};

export default App;
