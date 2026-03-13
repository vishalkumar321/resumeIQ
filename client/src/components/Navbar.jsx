import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = async () => {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith("resumeiq_") || key === "token" || key === "user") {
                localStorage.removeItem(key);
            }
        });
        await signOut();
        navigate("/");
    };

    const firstName = user?.user_metadata?.full_name?.split(" ")[0] ||
        (user?.email?.split("@")[0].charAt(0).toUpperCase() + user?.email?.split("@")[0].slice(1)) || "User";

    const navLink = ({ isActive }) =>
        `text-xs font-semibold uppercase tracking-widest transition-colors pb-1 border-b-2 ${isActive ? "text-slate-900 border-slate-900" : "text-slate-500 border-transparent hover:text-slate-900"}`;

    return (
        <>
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link to="/" className="text-xl tracking-tighter flex items-center">
                        <span className="font-bold text-slate-900">Resume</span>
                        <span className="font-extrabold text-indigo-600">IQ</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-6">
                        <NavLink to="/dashboard" className={navLink}>Dashboard</NavLink>
                        <NavLink to="/history" className={navLink}>History</NavLink>
                        <NavLink to="/profile" className={navLink}>Profile</NavLink>
                    </div>
                </div>

                <div className="flex items-center gap-4 relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white ring-offset-2 uppercase transition-transform hover:scale-105"
                    >
                        {firstName?.charAt(0) || "U"}
                    </button>

                    {isDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                            <div className="absolute right-0 top-14 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
                                <div className="px-5 py-3 border-b border-slate-100">
                                    <p className="text-xs font-bold text-slate-900 truncate">{firstName}</p>
                                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                                </div>
                                <button onClick={() => { navigate("/profile"); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">Profile & Settings</button>
                                <button onClick={handleLogout} className="w-full text-left px-5 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100 mt-1 pt-3">Sign Out</button>
                            </div>
                        </>
                    )}

                    <button className="md:hidden text-gray-500" onClick={() => setIsSidebarOpen(true)}>
                        <span className="text-2xl">☰</span>
                    </button>
                </div>
            </nav>

            {isSidebarOpen && (
                <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}>
                    <div className="absolute right-0 top-0 bottom-0 w-64 bg-white p-8 space-y-6" onClick={e => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-2xl" onClick={() => setIsSidebarOpen(false)}>×</button>
                        <div className="flex flex-col gap-6 pt-10">
                            <NavLink to="/dashboard" onClick={() => setIsSidebarOpen(false)} className="text-sm font-semibold uppercase tracking-widest text-slate-700 hover:text-slate-900">Dashboard</NavLink>
                            <NavLink to="/history" onClick={() => setIsSidebarOpen(false)} className="text-sm font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900">History</NavLink>
                            <NavLink to="/profile" onClick={() => setIsSidebarOpen(false)} className="text-sm font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900">Profile</NavLink>
                            <button onClick={handleLogout} className="text-sm font-semibold uppercase tracking-widest text-red-600 hover:text-red-700 pt-4 border-t border-slate-100 text-left">Sign Out</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
