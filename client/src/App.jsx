import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import {Canvas} from "./components/Canvas";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  const token = localStorage.getItem("token");

  return (
    <Router>
      <Routes>
        {/* Redirect to Canvas if already logged in, otherwise to Login */}
        <Route path="/" element={<Canvas />} />

        {/* Auth Pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Canvas Route */}
        <Route
          path="/canvas"
          element={<Canvas />}
        />
      </Routes>
    </Router>
  );
}

export default App;
