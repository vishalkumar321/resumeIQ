import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { PasswordStrengthIndicator, isPasswordStrong } from "../utils/passwordRules.jsx";

export default function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState("");

    // Supabase sends /reset-password#access_token=...&type=recovery
    // We read the hash, set the session, then allow the form.
    useEffect(() => {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace("#", "?"));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token") ?? "";
        const type = params.get("type");

        if (type !== "recovery" || !accessToken) {
            setSessionError("Invalid or expired reset link. Please request a new one.");
            return;
        }

        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            .then(({ error }) => {
                if (error) {
                    setSessionError("Reset link has expired. Please request a new one.");
                } else {
                    setSessionReady(true);
                    // Clean hash from URL
                    window.history.replaceState(null, "", window.location.pathname);
                }
            });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!isPasswordStrong(password)) {
            setError("Please meet all password requirements below.");
            return;
        }
        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) {
                setError(updateError.message);
                return;
            }

            // After successful reset, clear any local tokens and redirect to login
            localStorage.removeItem("token");
            navigate("/login", {
                state: { message: "Password updated successfully. Please sign in with your new password." }
            });
        } catch (err) {
            setError("Failed to reset password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (sessionError) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center space-y-4">
                    <div className="text-4xl">⚠️</div>
                    <h2 className="text-xl font-bold text-gray-800">Link expired</h2>
                    <p className="text-sm text-gray-500">{sessionError}</p>
                    <button
                        onClick={() => navigate("/forgot-password")}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition"
                    >
                        Request New Link
                    </button>
                </div>
            </div>
        );
    }

    if (!sessionReady) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
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
                    <p className="text-sm text-gray-400 mt-1">Set your new password</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <input
                            type="password"
                            required
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder="Repeat your new password"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        {confirm && password !== confirm && (
                            <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
                        )}
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
                        {loading ? "Saving…" : "Set New Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}
