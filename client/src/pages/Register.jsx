import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        alert("Registration successful! Please login.");
        navigate("/login"); // redirect to login after registration
      } else {
        alert(data.message || "Registration failed!");
      }
    } catch (err) {
      console.error(err);
      alert("Registration failed!");
    }
    setLoading(false);
  };

  return (
   <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 px-4">
  <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 sm:p-10">
    <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
      Create Account
    </h1>
    <p className="text-center text-gray-500 mb-8">
      Sign up to start collaborating on Collab Canvas
    </p>

    <form onSubmit={handleRegister} className="flex flex-col gap-5">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className={`bg-blue-600 text-white py-3 rounded-lg shadow hover:bg-blue-700 transition font-semibold ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {loading ? "Registering..." : "Register"}
      </button>
    </form>

    <div className="mt-6 text-center">
      <p className="text-gray-500">
        Already have an account?{" "}
        <span
          onClick={() => navigate("/login")}
          className="text-blue-600 font-medium cursor-pointer hover:underline"
        >
          Login
        </span>
      </p>
    </div>
  </div>
</div>

  );
}
