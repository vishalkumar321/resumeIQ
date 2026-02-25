import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { PasswordStrengthIndicator, isPasswordStrong } from "../utils/passwordRules.jsx";

export default function Settings() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem("token");
        navigate("/login");
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!isPasswordStrong(newPassword)) {
            setError("Please meet all password requirements below.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                setError(updateError.message);
                return;
            }

            setSuccess("Password changed successfully. Logging you out...");

            // Force logout after a short delay to show success message
            setTimeout(async () => {
                await supabase.auth.signOut();
                localStorage.removeItem("token");
                navigate("/login", {
                    state: { message: "Password updated successfully. Please sign in with your new password." }
                });
            }, 2000);

        } catch (err) {
            setError("Failed to change password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
                <button
                    onClick={() => navigate("/")}
                    className="text-xl font-bold tracking-tight text-gray-900 hover:opacity-80 transition"
                >
                    Resume<span className="text-indigo-600">IQ</span>
                </button>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate("/")} className="text-sm text-gray-500 hover:text-gray-800 transition">
                        ← Dashboard
                    </button>
                    <button
                        onClick={handleLogout}
                        className="text-sm bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-100 transition"
                    >
                        Logout
                    </button>
                </div>
            </nav>

            <main className="max-w-lg mx-auto px-4 py-10 space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
                    <p className="text-sm text-gray-400 mt-1">Manage your account preferences.</p>
                </div>

                {/* Profile Information */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Account Information</h3>
                    <div className="flex flex-col space-y-1">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Email Address</span>
                        <span className="text-sm text-gray-700 font-medium">{user?.email || "Loading..."}</span>
                    </div>
                </div>

                {/* Change Password Card */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Change Password</h3>
                        <p className="text-sm text-gray-400 mt-0.5">Changing your password will sign you out of all devices.</p>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input
                                type="password"
                                required
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Create a strong password"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <PasswordStrengthIndicator password={newPassword} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                required
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat your new password"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
                            )}
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                {error}
                            </p>
                        )}
                        {success && (
                            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                ✓ {success}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition"
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
