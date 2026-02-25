import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Race the request against a 12-second timeout.
        // Without this, the button stays on "Sending…" forever if Supabase is unreachable.
        const timeoutMs = 12000;
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), timeoutMs)
        );

        try {
            const { error: resetError } = await Promise.race([
                supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                }),
                timeoutPromise,
            ]);

            if (resetError) {
                setError(resetError.message);
            } else {
                setSent(true);
            }
        } catch (err) {
            if (err.message === "timeout") {
                setError("Service temporarily unavailable. Please try again in a moment.");
            } else {
                setError("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center space-y-4">
                    <div className="text-4xl">📬</div>
                    <h2 className="text-xl font-bold text-gray-800">Check your inbox</h2>
                    <p className="text-sm text-gray-500">
                        If an account with <strong>{email}</strong> exists, a password reset link has been sent.
                    </p>
                    <Link
                        to="/login"
                        className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition text-center"
                    >
                        Back to Login
                    </Link>
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
                    <p className="text-sm text-gray-400 mt-1">Reset your password</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email address
                        </label>
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
                        {loading ? "Sending…" : "Send Reset Link"}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500">
                    Remembered it?{" "}
                    <Link to="/login" className="text-indigo-600 hover:underline font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
