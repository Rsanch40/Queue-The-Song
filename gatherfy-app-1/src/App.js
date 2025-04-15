import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NowPlaying from "./pages/NowPlaying";
import WelcomePage from "./pages/welcomePage.js";
import { useNavigate } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/nowPlaying" element={<NowPlaying />} />
      </Routes>
    </Router>
  );
}

export default App;
