import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../services/auth";
import { PasswordStrengthIndicator, isPasswordStrong } from "../utils/passwordRules.jsx";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isPasswordStrong(password)) {
      setError("Please meet all password requirements below.");
      return;
    }

    setLoading(true);
    try {
      await signup(email, password);
      setSuccess(true);
    } catch (err) {
      const status = err.response?.status;
      // Server sends either a plain string (via fail()) or an object (via validate middleware)
      const rawError = err.response?.data?.error;
      const msg = typeof rawError === "object" ? rawError?.message : rawError;
      if (status === 503) {
        setError("Service temporarily unavailable. Please try again in a moment.");
      } else {
        setError(msg || "Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center space-y-4">
          <div className="text-4xl">📧</div>
          <h2 className="text-xl font-bold text-gray-800">Check your email</h2>
          <p className="text-sm text-gray-500">
            We sent a verification link to <strong>{email}</strong>. Click it before signing in.
          </p>
          <button
            onClick={() => nav("/login")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Resume<span className="text-indigo-600">IQ</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <PasswordStrengthIndicator password={password} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}