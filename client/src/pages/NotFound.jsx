import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
            <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="text-9xl font-bold text-slate-200 relative">
                    404
                    <div className="absolute inset-0 flex items-center justify-center text-4xl"></div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-[#0f172a] tracking-tight">Page Not Found</h1>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto">
                        The page you're looking for doesn't exist or has been moved to another universe.
                    </p>
                </div>

                <Link
                    to="/"
                    className="inline-block bg-[#111827] text-white px-8 py-3 rounded-lg text-sm font-semibold shadow-sm hover:bg-[#1e293b] hover:-translate-y-0.5 transition active:scale-95"
                >
                    Return Home →
                </Link>
            </div>
        </div>
    );
}
