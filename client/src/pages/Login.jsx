import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle, user } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [forgotMessage, setForgotMessage] = useState(location.state?.message || "");
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setForgotMessage("");
    setLoading(true);

    const { error } = await signIn(formData.email, formData.password);

    if (error) {
      setApiError(error.message);
      setLoading(false);
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) setApiError(error.message);
    } catch (err) {
      setApiError("Google Sign In failed.");
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setApiError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setApiError(error.message);
    } else {
      setForgotMessage("Reset link sent to your email!");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans text-gray-900">

      {/* ── LEFT SIDE (60%) ──────────────────────────────────────────────── */}
      <div className="hidden md:flex md:w-3/5 bg-[#0f172a] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-16 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <Link to="/" className="relative z-10 text-3xl font-bold tracking-tight">
          Resume<span className="text-[#6366f1]">IQ</span>
        </Link>

        <div className="relative z-10 space-y-8 mb-12 max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
            Welcome back
          </h1>
          <p className="text-lg font-medium text-white/80 leading-relaxed">
            Your optimized resume and analytics are waiting for you.
          </p>
        </div>

        {/* Decorative Score Card */}
        <div className="relative z-10 bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl max-w-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold opacity-80">Your last resume</span>
            <span className="w-2 h-2 rounded-full bg-[#16a34a]"></span>
          </div>
          <div className="space-y-4">
            <h4 className="text-2xl font-bold italic">ATS Score: 89</h4>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="w-[89%] h-full bg-white opacity-80"></div>
            </div>
            <p className="text-xs font-semibold opacity-60">Ready to download</p>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE (40%) ─────────────────────────────────────────────── */}
      <div className="w-full md:w-2/5 p-8 md:p-16 lg:p-24 flex flex-col justify-center animate-in fade-in duration-500">
        {/* Logo for mobile */}
        <Link to="/" className="md:hidden text-2xl font-bold tracking-tight mb-12 block">
          Resume<span className="text-[#6366f1]">IQ</span>
        </Link>

        <div className="space-y-2 mb-10">
          <h2 className="text-2xl font-bold text-[#0f172a] tracking-tight">Welcome back</h2>
          <p className="text-slate-500 font-medium text-sm">Login to your ResumeIQ account</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-3 rounded-xl shadow-sm hover:shadow hover:bg-slate-50 transition font-semibold text-sm text-[#0f172a]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z" />
              <path fill="#FBBC05" d="M16.04 18.013c-1.09.327-2.294.496-3.54.496-3.126 0-5.83-1.872-7.05-4.57L1.24 17.054C3.198 21.006 7.27 23.704 12 23.704c3.055 0 5.782-1.145 7.91-3l-3.87-2.691z" />
              <path fill="#4285F4" d="M19.91 20.704c4.61 0 8.09-3.055 8.09-8.704 0-.818-.082-1.636-.211-2.45h-7.879v4.582h4.527c-.218 1.145-.873 2.127-1.8 2.836l3.273 2.736z" />
              <path fill="#34A853" d="M1.24 6.65L5.266 9.765C6.486 7.067 9.19 5.195 12.316 5.195c1.454 0 2.8.5 3.845 1.345l3.418-3.418C17.482 1.145 15.055 0 12.316 0 7.27 0 3.198 2.698 1.24 6.65z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-4 text-slate-200">
            <div className="flex-1 h-px bg-current"></div>
            <span className="text-xs font-semibold text-slate-500">or</span>
            <div className="flex-1 h-px bg-current"></div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {apiError && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-xs font-bold text-red-600 animate-in shake duration-300">
                ⚠️ {apiError}
              </div>
            )}
            {forgotMessage && (
              <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-xs font-bold text-green-600 animate-in slide-in-from-top duration-300">
                ✓ {forgotMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 ml-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="vishal@email.com"
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 rounded-xl px-5 py-3 text-sm font-medium transition outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1 leading-none">
                <label className="text-xs font-semibold text-slate-500">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 rounded-xl px-5 py-3 text-sm font-medium transition outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-indigo-600 text-lg"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled={loading}
                className="w-full bg-[#111827] hover:bg-[#1e293b] text-white py-3 rounded-xl text-sm font-semibold shadow-sm transition active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Login →"}
              </button>
            </div>
          </form>

          <div className="text-center pt-8 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-600">Don't have an account? <Link to="/signup" className="text-indigo-600 hover:scale-105 inline-block ml-1 font-semibold">Sign Up</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}