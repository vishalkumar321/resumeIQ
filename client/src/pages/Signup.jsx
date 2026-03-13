import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, user } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const validate = () => {
    const newErrors = {};
    if (formData.fullName.length < 2) newErrors.fullName = "Name must be at least 2 characters.";
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Please enter a valid email.";
    if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters.";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    const { data, error } = await signUp(formData.email, formData.password);

    if (error) {
      setApiError(error.message);
      setLoading(false);
    } else {
      // Supabase signup success
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

        <div className="relative z-10 space-y-12 mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
            Join 10,000+ job seekers who got hired faster
          </h1>

          <div className="space-y-6">
            <div className="flex items-center gap-4 group">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-green-400 group-hover:scale-110 transition">✓</div>
              <span className="text-lg font-bold text-white/90">Free ATS score analysis</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-green-400 group-hover:scale-110 transition">✓</div>
              <span className="text-lg font-bold text-white/90">AI rewrites your resume in seconds</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-green-400 group-hover:scale-110 transition">✓</div>
              <span className="text-lg font-bold text-white/90">Instant optimized PDF download</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-green-400 group-hover:scale-110 transition">✓</div>
              <span className="text-lg font-bold text-white/90">Personalized job recommendations</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl max-w-lg">
          <p className="text-lg font-bold italic opacity-90 leading-relaxed mb-6">
            "ResumeIQ improved my ATS score from 58 to 91. Got 3 interviews in a week!"
          </p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-xl font-bold">R</div>
            <div>
              <p className="font-bold text-sm">Rahul S.</p>
              <p className="text-xs font-semibold opacity-80">Software Engineer</p>
            </div>
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
          <h2 className="text-2xl font-bold text-[#0f172a] tracking-tight">Create your account</h2>
          <p className="text-slate-500 font-medium text-sm">Start optimizing your resume for free</p>
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 ml-1">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Vishal Kumar"
                className={`w-full bg-slate-50 border ${errors.fullName ? "border-red-300 ring-2 ring-red-50" : "border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"} rounded-xl px-5 py-3 text-sm font-medium transition outline-none`}
              />
              {errors.fullName && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.fullName}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 ml-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="vishal@email.com"
                className={`w-full bg-slate-50 border ${errors.email ? "border-red-300 ring-2 ring-red-50" : "border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"} rounded-xl px-5 py-3 text-sm font-medium transition outline-none`}
              />
              {errors.email && <p className="text-xs font-medium text-red-500 ml-1">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  className={`w-full bg-slate-50 border ${errors.password ? "border-red-300 ring-2 ring-red-50" : "border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"} rounded-xl px-5 py-3 text-sm font-medium transition outline-none`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-indigo-600 text-lg"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {errors.password && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.password}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 ml-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className={`w-full bg-slate-50 border ${errors.confirmPassword ? "border-red-300 ring-2 ring-red-50" : "border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"} rounded-xl px-5 py-3 text-sm font-medium transition outline-none`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-indigo-600 text-lg"
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.confirmPassword}</p>}
            </div>

            <div className="pt-2">
              <button
                disabled={loading}
                className="w-full bg-[#111827] hover:bg-[#1e293b] text-white py-3 rounded-xl text-sm font-semibold shadow-sm transition active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create Account →"}
              </button>
            </div>
          </form>

          <div className="text-center space-y-6 pt-6">
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              By signing up, you agree to our <br />
              <a href="#" className="underline hover:text-indigo-600 transition">Terms of Service</a> & <a href="#" className="underline hover:text-indigo-600 transition">Privacy Policy</a>
            </p>

            <div className="pt-6 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-600">Already have an account? <Link to="/login" className="text-indigo-600 hover:scale-105 inline-block ml-1 font-semibold">Login</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}