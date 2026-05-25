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
                        <NavLink to="/job-match" className={navLink}>Find Jobs</NavLink>
                        <NavLink to="/ai-rewrite" className={navLink}>Rewrite Resume</NavLink>
                        <NavLink to="/profile" className={navLink}>Account</NavLink>
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
                            <div className="absolute right-0 top-14 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
                                <div className="px-5 py-3 border-b border-slate-100">
                                    <p className="text-xs font-bold text-slate-900 truncate">{firstName}</p>
                                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                                </div>
                                <button onClick={() => { navigate("/profile"); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    My Profile
                                </button>
                                <button onClick={() => { navigate("/settings"); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    Settings
                                </button>
                                <button onClick={handleLogout} className="w-full text-left px-5 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100 mt-1 pt-3 flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                    Sign Out
                                </button>
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
                            <NavLink to="/job-match" onClick={() => setIsSidebarOpen(false)} className="text-sm font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900">Find Jobs</NavLink>
                            <NavLink to="/ai-rewrite" onClick={() => setIsSidebarOpen(false)} className="text-sm font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900">Rewrite Resume</NavLink>
                            <NavLink to="/profile" onClick={() => setIsSidebarOpen(false)} className="text-sm font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900">My Profile</NavLink>
                            <NavLink to="/settings" onClick={() => setIsSidebarOpen(false)} className="text-sm font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900">Settings</NavLink>
                            <button onClick={handleLogout} className="text-sm font-semibold uppercase tracking-widest text-red-600 hover:text-red-700 pt-4 border-t border-slate-100 text-left">Sign Out</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
