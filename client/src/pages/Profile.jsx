import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import api from "../services/api";
import { useToast } from "../components/Toast";
import Navbar from "../components/Navbar";
import ConfirmModal from "../components/ConfirmModal";

export default function Profile() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { showToast } = useToast();

    // Auth Data
    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
    const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    // Stats & History
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Settings States
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [notifications, setNotifications] = useState(
        localStorage.getItem("resumeiq_notifications") !== "false"
    );

    // Modal States
    const [showDeleteReportsModal, setShowDeleteReportsModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    const [deleteEmailConfirm, setDeleteEmailConfirm] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const res = await api.get("/report/history");
                setReports(res.data.data.reports || []);
            } catch (err) {
                setError("Could not load profile data. Please refresh.");
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, []);

    // ── Profile Logic ────────────────────────────────────────────────────────

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: fullName }
            });
            if (error) throw error;
            showToast("Profile updated!", "success");
            setIsEditing(false);
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update User Metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
            showToast("Avatar updated!", "success");
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    // ── Stats Calculation ────────────────────────────────────────────────────

    const stats = useMemo(() => {
        const total = reports.length;
        const best = total > 0 ? Math.max(...reports.map(r => r.score || 0)) : 0;
        const optimized = reports.filter(r => r.optimized_resume != null).length;

        const createdDate = new Date(user?.created_at);
        const diffTime = Math.abs(new Date() - createdDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let memberLabel = `${diffDays} days`;
        if (diffDays > 60) {
            memberLabel = `${Math.floor(diffDays / 30)} months`;
        }

        return { total, best, optimized, memberLabel };
    }, [reports, user]);

    // ── Settings Logic ───────────────────────────────────────────────────────

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (passwords.new.length < 8) {
            showToast("Password must be at least 8 characters", "error");
            return;
        }
        if (passwords.new !== passwords.confirm) {
            showToast("Passwords do not match", "error");
            return;
        }

        setPasswordLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwords.new
            });
            if (error) throw error;
            showToast("Password updated!", "success");
            setShowPasswordForm(false);
            setPasswords({ current: "", new: "", confirm: "" });
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setPasswordLoading(false);
        }
    };

    const toggleNotifications = () => {
        const newValue = !notifications;
        setNotifications(newValue);
        localStorage.setItem("resumeiq_notifications", newValue.toString());
        showToast(`Notifications ${newValue ? "enabled" : "disabled"}`, "info");
    };

    const handleExportData = async () => {
        showToast("Preparing your data...", "info");
        try {
            const res = await api.get("/report/history");
            const data = JSON.stringify(res.data.data.reports, null, 2);
            const blob = new Blob([data], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `resumeiq_data_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("Data exported successfully!", "success");
        } catch (err) {
            showToast("Failed to export data", "error");
        }
    };

    // ── Danger Zone Logic ────────────────────────────────────────────────────

    const handleDeleteAllReports = async () => {
        setDeleteLoading(true);
        try {
            await api.delete("/report/all");
            setReports([]);
            localStorage.removeItem("resumeiq_downloads");
            showToast("All reports deleted", "success");
            setShowDeleteReportsModal(false);
        } catch (err) {
            showToast("Failed to delete reports", "error");
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteLoading(true);
        try {
            await api.post("/report/delete-account");
            await signOut();
            navigate("/");
            showToast("Account deleted successfully", "success");
        } catch (err) {
            showToast("Failed to delete account", "error");
        } finally {
            setDeleteLoading(false);
        }
    };

    // ── Activity Logic ───────────────────────────────────────────────────────

    const activityFeed = useMemo(() => {
        const downloadIds = JSON.parse(localStorage.getItem("resumeiq_downloads") || "[]");
        const items = [];

        reports.forEach(r => {
            // Analyzed
            items.push({
                type: "analyzed",
                label: "Analyzed resume",
                detail: r.role || "Resume",
                date: new Date(r.created_at),
                color: "bg-indigo-600"
            });

            // Optimized
            if (r.optimized_resume) {
                items.push({
                    type: "optimized",
                    label: "Optimized resume",
                    detail: r.role || "Target Role",
                    date: new Date(r.created_at), // Using report date as proxy
                    color: "bg-green-500"
                });
            }

            // Downloaded
            if (downloadIds.includes(r.id)) {
                items.push({
                    type: "downloaded",
                    label: "Downloaded PDF",
                    detail: r.role || "Resume",
                    date: new Date(r.created_at), // Using report date as proxy
                    color: "bg-blue-500"
                });
            }
        });

        return items.sort((a, b) => b.date - a.date).slice(0, 5);
    }, [reports]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 uppercase tracking-widest font-black">
                <Navbar />
                <main className="max-w-6xl mx-auto px-6 py-12 space-y-8 animate-pulse">
                    <div className="h-48 bg-white rounded-3xl border border-gray-100 shadow-sm" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white rounded-3xl border border-gray-100 shadow-sm" />)}
                    </div>
                </main>
            </div>
        );
    }

    const initials = user?.user_metadata?.full_name?.split(" ").map(n => n[0]).join("") || user?.email?.[0].toUpperCase() || "U";
    const memberSince = new Date(user?.created_at).toLocaleDateString("en-US", { month: 'long', year: 'numeric' });

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">

                {/* ── SECTION 2: PROFILE HEADER CARD ────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                    <div className="relative group">
                        <div
                            onClick={handleAvatarClick}
                            className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-3xl text-white font-black shadow-2xl shadow-indigo-100 cursor-pointer overflow-hidden border-4 border-white"
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : initials}
                        </div>
                        <button
                            onClick={handleAvatarClick}
                            className="mt-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition block text-center w-full"
                        >
                            Change Photo
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-1">
                        {isEditing ? (
                            <div className="space-y-4 max-w-sm">
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Full Name"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-50 transition"
                                />
                                <div className="text-gray-400 text-xs font-bold px-1">
                                    Email: {user?.email} <span className="block mt-1 font-medium opacity-60">(Contact support to change email)</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition disabled:opacity-50"
                                    >
                                        {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                    <button
                                        onClick={() => { setIsEditing(false); setFullName(user?.user_metadata?.full_name || ""); }}
                                        className="bg-gray-50 text-gray-400 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight">{fullName || "Set Your Name"}</h1>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{user?.email}</p>
                                <p className="text-xs font-bold text-gray-400 mt-2 italic">Member since {memberSince}</p>
                            </>
                        )}
                    </div>

                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="md:absolute top-8 right-8 border-2 border-indigo-50 text-indigo-600 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition"
                        >
                            ✏ Edit Profile
                        </button>
                    )}
                </div>

                {/* ── SECTION 3: STATS CARDS ROW ────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-indigo-600">
                        <span className="text-2xl mb-2 block">📄</span>
                        <div className="text-3xl font-black text-gray-900">{stats.total}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Resumes Analyzed</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-green-600">
                        <span className="text-2xl mb-2 block">⚡</span>
                        <div className={`text-3xl font-black ${stats.best >= 80 ? "text-green-600" : stats.best >= 60 ? "text-amber-600" : "text-red-600"}`}>
                            {stats.total > 0 ? stats.best : "—"}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Best ATS Score</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-purple-600">
                        <span className="text-2xl mb-2 block">🔁</span>
                        <div className="text-3xl font-black text-gray-900">{stats.optimized}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Resumes Optimized</div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-blue-600">
                        <span className="text-2xl mb-2 block">📅</span>
                        <div className="text-3xl font-black text-gray-900">{stats.memberLabel}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Member For</div>
                    </div>
                </div>

                {/* ── SECTION 4: ACCOUNT SETTINGS ────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Account Settings</h2>

                    <div className="space-y-6">
                        {/* Row 1: Password */}
                        <div className="border-b border-gray-50 pb-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="text-sm font-black uppercase tracking-widest text-gray-900">Change Password</div>
                                    <div className="text-xs font-bold text-gray-400">Update your account password</div>
                                </div>
                                <button
                                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                                    className="bg-indigo-50 text-indigo-600 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition whitespace-nowrap"
                                >
                                    {showPasswordForm ? "Cancel" : "Update Password"}
                                </button>
                            </div>

                            {showPasswordForm && (
                                <form onSubmit={handlePasswordUpdate} className="mt-8 bg-gray-50 p-6 rounded-2xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">New Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={passwords.new}
                                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100 transition"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Confirm Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={passwords.confirm}
                                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100 transition"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={passwordLoading}
                                        className="w-full bg-indigo-600 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition disabled:opacity-50"
                                    >
                                        {passwordLoading ? "Updating..." : "Update Password"}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Row 2: Notifications */}
                        <div className="border-b border-gray-50 pb-6 flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="text-sm font-black uppercase tracking-widest text-gray-900">Email Notifications</div>
                                <div className="text-xs font-bold text-gray-400">Receive tips and resume improvement reminders</div>
                            </div>
                            <button
                                onClick={toggleNotifications}
                                className={`w-14 h-8 rounded-full transition-all duration-300 relative ${notifications ? "bg-indigo-600" : "bg-gray-200"}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${notifications ? "left-7" : "left-1"}`} />
                            </button>
                        </div>

                        {/* Row 3: History */}
                        <div className="border-b border-gray-50 pb-6 flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="text-sm font-black uppercase tracking-widest text-gray-900">Resume History</div>
                                <div className="text-xs font-bold text-gray-400">View and manage all your analyzed resumes</div>
                            </div>
                            <Link
                                to="/history"
                                className="bg-gray-50 text-gray-400 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition flex items-center gap-2"
                            >
                                View History <span>→</span>
                            </Link>
                        </div>

                        {/* Row 4: Export */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="text-sm font-black uppercase tracking-widest text-gray-900">Export My Data</div>
                                <div className="text-xs font-bold text-gray-400">Download all your resume reports as JSON</div>
                            </div>
                            <button
                                onClick={handleExportData}
                                className="bg-blue-50 text-blue-600 px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition"
                            >
                                Export
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── SECTION 5: DANGER ZONE ────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-red-100 border-l-8 border-l-red-500 shadow-sm p-8 space-y-8">
                    <h2 className="text-xl font-black text-red-600 tracking-tight uppercase">Danger Zone</h2>

                    <div className="space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="text-sm font-black uppercase tracking-widest text-gray-900">Delete All Reports</div>
                                <div className="text-xs font-bold text-gray-400">Permanently delete all your resume analysis history. This cannot be undone.</div>
                            </div>
                            <button
                                onClick={() => setShowDeleteReportsModal(true)}
                                className="border-2 border-red-50 text-red-600 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition whitespace-nowrap"
                            >
                                Delete All Reports
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-8 border-t border-gray-50">
                            <div className="space-y-1">
                                <div className="text-sm font-black uppercase tracking-widest text-gray-900">Delete Account</div>
                                <div className="text-xs font-bold text-gray-400">Permanently delete your account and all associated data. This cannot be undone.</div>
                            </div>
                            <button
                                onClick={() => setShowDeleteAccountModal(true)}
                                className="bg-red-600 text-white px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition shadow-lg shadow-red-100 whitespace-nowrap"
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── SECTION 6: ACTIVITY SUMMARY ────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Recent Activity</h2>

                    <div className="space-y-6">
                        {activityFeed.length > 0 ? (
                            <>
                                {activityFeed.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 group">
                                        <div className={`w-3 h-3 rounded-full ${item.color} shadow-sm group-hover:scale-125 transition duration-300`} />
                                        <div className="flex-1">
                                            <span className="text-xs font-black uppercase tracking-widest text-gray-900 mr-2">{item.label}</span>
                                            <span className="text-xs font-bold text-gray-400">{item.detail}</span>
                                        </div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {item.date.toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                ))}
                                <Link to="/history" className="text-indigo-600 text-xs font-black uppercase tracking-widest mt-4 block text-center hover:opacity-80 transition">
                                    View Full History →
                                </Link>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-sm font-bold text-gray-400">No activity yet. Upload your first resume to get started.</p>
                                <Link to="/dashboard" className="text-indigo-600 text-xs font-black uppercase tracking-widest mt-4 block hover:opacity-80 transition">
                                    Start Analysis →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

            </main>

            {/* ── MODALS ────────────────────────────── */}

            <ConfirmModal
                isOpen={showDeleteReportsModal}
                onClose={() => setShowDeleteReportsModal(false)}
                onConfirm={handleDeleteAllReports}
                title="Delete all reports?"
                message={`This will permanently delete all ${reports.length} of your resume reports. This cannot be undone.`}
                confirmValue="DELETE"
                confirmText="Delete Everything"
                loading={deleteLoading}
            />

            <ConfirmModal
                isOpen={showDeleteAccountModal}
                onClose={() => setShowDeleteAccountModal(false)}
                onConfirm={handleDeleteAccount}
                title="Delete your account?"
                message="This is permanent. All your data, resumes, and reports will be wiped forever."
                confirmValue={user?.email}
                confirmText="Confirm Account Deletion"
                loading={deleteLoading}
            />

        </div>
    );
}
