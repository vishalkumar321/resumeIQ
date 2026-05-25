import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import api from "../services/api";
import { downloadPDF } from "../services/pdf";
import ScoreBadge from "../components/ScoreBadge";
import Skeleton from "../components/Skeleton";
import Navbar from "../components/Navbar";

// ── Shared Components ──────────────────────────────────────────────────────

const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-8 ${className}`}>
        {children}
    </div>
);

const Badge = ({ children, color = "indigo" }) => {
    const colors = {
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
        green: "bg-green-50 text-green-700 border-green-100",
        amber: "bg-amber-50 text-amber-700 border-amber-100",
        rose: "bg-rose-50 text-rose-700 border-rose-100",
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${colors[color]}`}>
            {children}
        </span>
    );
};

const CircularScore = ({ score }) => {
    const normalizedScore = score || 0;
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;
    const color = normalizedScore >= 80 ? "#16a34a" : normalizedScore >= 60 ? "#d97706" : "#dc2626";
    
    return (
        <div className="relative w-24 h-24 flex flex-col items-center justify-center drop-shadow-sm">
            <svg className="absolute w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r={radius} stroke="#f1f5f9" strokeWidth="6" fill="none" />
                <circle cx="48" cy="48" r={radius} stroke={color} strokeWidth="6" fill="white" fillOpacity="0.5" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
            <span className="text-3xl font-extrabold text-slate-800 relative z-10">{normalizedScore}</span>
        </div>
    );
};

// ── Main Page ──────────────────────────────────────────────────────────────

// Cleans CamelCase and normalizes capitalization in candidate names.
const cleanName = (name) => {
    if (!name) return 'Resume';
    return name
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
};

export default function ReportDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    // ── States ────────────────────────────────────────────────────────────────
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("analysis");

    // Optimization State
    const [targetRole, setTargetRole] = useState("");
    const [optimizeLoading, setOptimizeLoading] = useState(false);
    const [optimizeError, setOptimizeError] = useState("");
    const [copyStates, setCopyStates] = useState({});

    // Jobs State
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);

    // Persistence State
    const [checkedSuggestions, setCheckedSuggestions] = useState({});
    const [atsHistory, setAtsHistory] = useState([]);

    const skillGaps = useMemo(() => {
        if (!report?.optimized_resume) return [];
        const own = report.optimized_resume.skills.slice(0, 5);
        const added = report.optimized_resume.keywords_added.slice(0, 3);
        return [...own.map(s => ({ n: s, t: 'Strong', v: 90, c: 'indigo' })), ...added.map(s => ({ n: s, t: 'Improved', v: 65, c: 'amber' }))];
    }, [report?.optimized_resume]);

    // ── Effects ───────────────────────────────────────────────────────────────

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await api.get(`/report/${id}`);
                const data = res.data.data.report;
                setReport(data);
                setTargetRole(data.role || "");

                // Init/Restore LocalStorage
                initLocalStorage(data);
            } catch (err) {
                setError("Could not load report. Please go back and try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [id]);

    const initLocalStorage = (data) => {
        // 1. Suggestions
        let storedChecklist = {};
        try {
            storedChecklist = JSON.parse(localStorage.getItem(`suggestions_${id}`) || "{}");
        } catch (e) {
            storedChecklist = {};
        }
        setCheckedSuggestions(storedChecklist);

        // 2. ATS History
        let history = [];
        try {
            const parsed = JSON.parse(localStorage.getItem(`ats_history_${id}`));
            if (Array.isArray(parsed)) history = parsed;
        } catch (e) { }

        if (history.length === 0) {
            history = [{ attempt: "Original", score: data.score || 0 }];
            localStorage.setItem(`ats_history_${id}`, JSON.stringify(history));
        }
        setAtsHistory(history);
    };

    const handleToggleSuggestion = (index) => {
        const newState = { ...checkedSuggestions, [index]: !checkedSuggestions[index] };
        setCheckedSuggestions(newState);
        localStorage.setItem(`suggestions_${id}`, JSON.stringify(newState));
    };

    const handleOptimize = async () => {
        if (optimizeLoading) return;

        const role = targetRole.trim() || report?.role || "Software Engineer";
        if (targetRole.trim() !== role) setTargetRole(role);

        setOptimizeLoading(true);
        setOptimizeError("");
        try {
            const res = await api.post(`/report/rewrite/${id}`, { targetRole: role });
            const optimized = res.data.data.optimized;

            setReport(prev => ({ ...prev, optimized_resume: optimized }));

            // Update History
            const safeHistory = Array.isArray(atsHistory) ? atsHistory : [];
            const newHistory = [...safeHistory, {
                attempt: `Attempt ${safeHistory.length}`,
                score: optimized.ats_score_after
            }];
            setAtsHistory(newHistory);
            localStorage.setItem(`ats_history_${id}`, JSON.stringify(newHistory));

        } catch (err) {
            setOptimizeError(err.response?.data?.error || "AI optimization failed.");
        } finally {
            setOptimizeLoading(false);
        }
    };

    const handleFetchJobs = async () => {
        if (loadingJobs) return;
        setLoadingJobs(true);
        try {
            const res = await api.get(`/report/jobs/${id}`);
            setJobs(res.data.data.jobs);
        } catch (err) {
            console.error("Jobs error:", err);
        } finally {
            setLoadingJobs(false);
        }
    };

    const handleCopy = (text, section) => {
        navigator.clipboard.writeText(text);
        setCopyStates({ ...copyStates, [section]: true });
        setTimeout(() => setCopyStates({ ...copyStates, [section]: false }), 1500);
    };

    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        try {
            setDownloading(true);
            const filename = `optimized-resume-${report.optimized_resume.candidate_name.replace(/\s+/g, '-')}.pdf`;
            const response = await api.get(`/report/download/${id}`, { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download failed:", err);
            alert("Download failed. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    // ── Render Helpers ────────────────────────────────────────────────────────

    if (loading) return (
        <>
            <Navbar />
            <div className="max-w-6xl mx-auto px-6 py-12 space-y-8 animate-pulse">
                <div className="flex justify-between items-start">
                    <div className="space-y-4">
                        <Skeleton.Block className="h-10 w-64" />
                        <Skeleton.Block className="h-4 w-32" />
                    </div>
                    <Skeleton.Block className="w-32 h-32 rounded-full" />
                </div>
                <Skeleton.Block className="h-12 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton.Block className="h-96" />
                    <Skeleton.Block className="h-96 md:col-span-2" />
                </div>
            </div>
        </>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center space-y-6">
            <div className="text-6xl">⚠️</div>
            <h2 className="text-2xl font-bold text-[#0f172a]">{error}</h2>
            <button
                onClick={() => navigate("/dashboard")}
                className="bg-[#111827] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#1e293b] transition"
            >
                ← Back to Dashboard
            </button>
        </div>
    );

    const checklistProgress = report.suggestions.length > 0
        ? Math.round((Object.values(checkedSuggestions).filter(Boolean).length / report.suggestions.length) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans pb-20">
            <Navbar />

            {/* ── HEADER SECTION ──────────────────────────────────────────────────── */}
            <header className="max-w-6xl mx-auto px-6 pt-10 pb-8">
                <button
                    onClick={() => navigate("/dashboard")}
                    className="text-slate-500 hover:text-slate-900 font-semibold text-sm flex items-center gap-2 mb-6 transition"
                >
                    ← Back to Dashboard
                </button>

                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">
                            {report.report_name || report.role || "Resume Analysis"}
                        </h1>
                        <p className="text-sm font-medium text-slate-500">
                            Uploaded on {new Date(report.created_at).toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' })}
                            {report.score ? ` • ATS Score: ${report.score}` : ''}
                        </p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <CircularScore score={report.score} />
                        <span className="text-slate-500 font-semibold text-xs uppercase tracking-widest mt-1">ATS Score</span>
                    </div>
                </div>
            </header>

            {/* ── PROGRESS INDICATOR ──────────────────────────────────────────────── */}
            <div className="max-w-6xl mx-auto px-6 mb-8">
                <div className="flex items-center text-sm font-semibold text-slate-500 overflow-x-auto no-scrollbar py-2">
                    {/* Step 1 */}
                    <button onClick={() => setActiveTab("analysis")} className="flex items-center gap-2 text-slate-900 group shrink-0">
                        <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">✓</div>
                        <span>1. Analysis</span>
                    </button>

                    <div className="w-8 h-px bg-slate-300 mx-4 shrink-0"></div>

                    {/* Step 2 */}
                    <button onClick={() => setActiveTab("optimizer")} className={`flex items-center gap-2 group shrink-0 ${report.optimized_resume ? 'text-slate-900' : 'text-indigo-600'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${report.optimized_resume ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white relative'}`}>
                            {report.optimized_resume ? '✓' : (
                                <>
                                    <span className="absolute w-full h-full rounded-full bg-indigo-400 animate-ping opacity-50"></span>
                                    2
                                </>
                            )}
                        </div>
                        <span>2. Optimize {report.optimized_resume ? '' : '→'}</span>
                    </button>

                    <div className="w-8 h-px bg-slate-300 mx-4 shrink-0"></div>

                    {/* Step 3 */}
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className={`flex items-center gap-2 group shrink-0 ${report.optimized_resume ? 'text-indigo-600' : 'text-slate-400'}`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${report.optimized_resume ? 'bg-indigo-600 text-white relative' : 'bg-slate-200 text-slate-500'}`}>
                            {downloading ? (
                                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                report.optimized_resume ? (
                                    <>
                                        <span className="absolute w-full h-full rounded-full bg-indigo-400 animate-ping opacity-50"></span>
                                        3
                                    </>
                                ) : '3'
                            )}
                        </div>
                        <span>3. {downloading ? 'Downloading...' : 'Download'}</span>
                    </button>

                    <div className="w-8 h-px bg-slate-300 mx-4 shrink-0"></div>

                    {/* Step 4 */}
                    <button onClick={() => setActiveTab("jobs")} className={`flex items-center gap-2 group shrink-0 ${report.optimized_resume ? 'text-slate-500 hover:text-slate-900 transition-colors' : 'text-slate-400'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${report.optimized_resume ? 'bg-slate-200 text-slate-600' : 'bg-slate-200 text-slate-500'}`}>4</div>
                        <span>4. Find Jobs</span>
                    </button>
                </div>
            </div>

            {/* ── STICKY TAB BAR ──────────────────────────────────────────────────── */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-y border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                <div className="max-w-6xl mx-auto flex gap-8 px-6">
                    {[
                        { id: "analysis", label: "Analysis" },
                        { id: "optimizer", label: "Optimizer", dot: report.optimized_resume },
                        { id: "jobs", label: "Jobs" },
                        { id: "pulse", label: "Career Pulse" }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-4 text-sm font-semibold whitespace-nowrap relative transition-colors ${activeTab === tab.id ? "text-[#0f172a]" : "text-slate-500 hover:text-slate-900"}`}
                        >
                            {tab.label}
                            {tab.dot && <span className="absolute top-4 -right-2 w-1.5 h-1.5 bg-green-500 rounded-full" />}
                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0f172a]" />}
                        </button>
                    ))}
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-6 py-10">

                {/* ── TAB 1: ANALYSIS ───────────────────────────────────────────────── */}
                {activeTab === "analysis" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Card className="bg-slate-50 border-slate-200">
                            <div className="flex items-start gap-4">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-[#0f172a]">Overall Verdict</h3>
                                    <p className="text-slate-600 leading-relaxed font-medium">{report.suggestions[0]?.includes("score") ? report.suggestions[0] : "Your resume is well-structured but needs more impact-focused wording to beat top-tier ATS filters."}</p>
                                </div>
                            </div>
                        </Card>

                        <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                                <h3 className="text-sm font-semibold text-slate-800 mb-6 flex items-center gap-2">Strengths</h3>
                                <ul className="space-y-4">
                                    {report.strengths.map((s, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a] mt-2 shrink-0" />
                                            <span className="text-sm text-slate-600">{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Card>

                            <Card>
                                <h3 className="text-sm font-semibold text-slate-800 mb-6 flex items-center gap-2">Weaknesses</h3>
                                <ul className="space-y-4">
                                    {report.weaknesses.map((w, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#d97706] mt-2 shrink-0" />
                                            <span className="text-sm text-slate-600">{w}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        </div>

                        <Card>
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-800">Missing Keywords</h3>
                                <p className="text-xs font-medium text-slate-500 mt-1">Add these to improve your ATS match rate</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {report.missing_keywords?.length > 0 ? (
                                    report.missing_keywords.map((kw, i) => (
                                        <Badge key={i} color="rose">{kw}</Badge>
                                    ))
                                ) : (
                                    <p className="text-sm font-medium text-[#16a34a] py-2">No missing keywords detected</p>
                                )}
                            </div>
                        </Card>

                        {report.formatting_issues && report.formatting_issues.length > 0 && (
                            <Card className="border-rose-100 bg-rose-50/30">
                                <h3 className="text-sm font-semibold text-rose-900 mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Formatting Issues
                                </h3>
                                <ul className="space-y-4">
                                    {report.formatting_issues.map((issue, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                                            <span className="text-sm text-rose-800">{issue}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}

                        <Card className="relative overflow-hidden">
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-800">Improvement Checklist</h3>
                                <p className="text-xs font-medium text-slate-500 mt-1">Check off each improvement as you apply it</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                {report.suggestions.map((s, i) => (
                                    <label key={i} className="flex items-center gap-4 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-2 border-gray-200 text-indigo-600 focus:ring-indigo-600 transition"
                                            checked={!!checkedSuggestions[i]}
                                            onChange={() => handleToggleSuggestion(i)}
                                        />
                                        <span className={`text-sm font-bold transition-all ${checkedSuggestions[i] ? "text-green-600 line-through opacity-50" : "text-gray-700 group-hover:text-gray-900"}`}>
                                            {s}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-semibold text-slate-500">
                                    <span className={checklistProgress === 100 ? "text-[#16a34a]" : "text-slate-500"}>
                                        {checklistProgress === 100 ? "All improvements applied!" : `${Object.values(checkedSuggestions).filter(Boolean).length} of ${report.suggestions.length} applied`}
                                    </span>
                                    <span className="text-[#0f172a]">{checklistProgress}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-700 ${checklistProgress === 100 ? "bg-[#16a34a]" : "bg-[#111827]"}`}
                                        style={{ width: `${checklistProgress}%` }}
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ── TAB 2: OPTIMIZER ──────────────────────────────────────────────── */}
                {activeTab === "optimizer" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {!report.optimized_resume ? (
                            <div className="space-y-8 max-w-2xl mx-auto">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-left shadow-sm">
                                    <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                                        <span>Your current score: <span className="text-red-600">{report.score}</span></span>
                                        <span>Target: <span className="text-green-600">85+</span></span>
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded-full w-full overflow-hidden my-3">
                                        <div className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-green-500 transition-all duration-1000" style={{ width: `${report.score}%` }}></div>
                                    </div>
                                    <p className="text-sm font-medium text-slate-600 mt-2 text-center">AI can rewrite your resume to improve by ~20-30 pts</p>
                                    <div className="mt-4 pt-4 border-t border-slate-200 text-center">
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Select your role below and click Optimize</p>
                                    </div>
                                </div>

                                <Card className="py-12 px-10 text-center space-y-8">
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-extrabold text-[#0f172a]">Resume Optimizer</h2>
                                        <p className="text-sm font-medium text-slate-500">Rewrite your resume with AI to maximize your ATS score</p>
                                    </div>

                                    <div className="space-y-4 text-left">
                                        <label className="text-xs font-semibold text-slate-500 ml-1">What role are you applying for?</label>
                                        <input
                                            type="text"
                                            value={targetRole}
                                            onChange={(e) => setTargetRole(e.target.value)}
                                            placeholder="e.g. Senior React Engineer, Full Stack Developer"
                                            className="w-full bg-transparent border-0 border-b-2 border-slate-300 rounded-none px-1 py-3 text-base focus:border-[#0f172a] focus:outline-none focus:ring-0 transition-colors"
                                        />
                                    </div>

                                    <button
                                        onClick={handleOptimize}
                                        disabled={optimizeLoading}
                                        className="w-full bg-[#111827] hover:bg-[#1e293b] disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold py-3 rounded-lg transition-all text-base flex items-center justify-center gap-2"
                                    >
                                        {optimizeLoading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                <span>Running optimizer...</span>
                                            </>
                                        ) : (
                                            "Optimize My Resume"
                                        )}
                                    </button>

                                    {optimizeError && <p className="text-sm text-[#dc2626] font-medium">{optimizeError}</p>}

                                    <div className="flex flex-wrap justify-center gap-3">
                                        <Badge color="green">Quantified achievements</Badge>
                                        <Badge color="indigo">ATS keywords added</Badge>
                                        <Badge color="amber">Stronger action verbs</Badge>
                                    </div>
                                </Card>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Score Banner */}
                                <div className="bg-[#111827] rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md border border-slate-800">
                                    <div className="space-y-1">
                                        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Optimization Results</h3>
                                        <p className="text-2xl font-bold tracking-tight text-white">ATS Score improved from {report.optimized_resume.ats_score_before} to {report.optimized_resume.ats_score_after}</p>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="flex items-center gap-4 text-2xl font-bold">
                                            <span className="text-slate-500">{report.optimized_resume.ats_score_before}</span>
                                            <span className="text-slate-600">→</span>
                                            <span className="text-4xl text-white">{report.optimized_resume.ats_score_after}</span>
                                        </div>
                                        <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10 text-center">
                                            <span className="text-2xl font-bold">+{report.optimized_resume.ats_score_after - report.optimized_resume.ats_score_before}</span>
                                            <p className="text-[10px] font-semibold uppercase text-slate-400">points gained</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Comparison UI */}
                                <div className="grid md:grid-cols-2 gap-8 h-[600px]">
                                    {/* Left Panel: Original */}
                                    <div className="flex flex-col bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
                                        <div className="bg-slate-100 px-6 py-4 flex items-center justify-between border-b border-slate-200">
                                            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Original Resume</span>
                                            <ScoreBadge score={report.optimized_resume.ats_score_before} size="sm" />
                                        </div>
                                        <div className="flex-1 p-0 overflow-hidden bg-white">
                                            {report.resume_url ? (
                                                // Render the actual uploaded PDF — no toolbar
                                                <iframe
                                                    src={`${report.resume_url}#toolbar=0&navpanes=0&scrollbar=0`}
                                                    title="Original Resume PDF"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        minHeight: '500px',
                                                        border: 'none',
                                                        display: 'block'
                                                    }}
                                                />
                                            ) : (() => {
                                                const originalText =
                                                    report?.resume_text ||
                                                    report?.raw_text ||
                                                    report?.extracted_text ||
                                                    report?.text ||
                                                    null;

                                                if (originalText) {
                                                    const displayText = originalText.length > 8000
                                                        ? originalText.slice(0, 8000) + '\n\n... (truncated for display)'
                                                        : originalText;

                                                    return (
                                                        <div style={{ maxHeight: '100%', overflowY: 'auto', padding: '16px' }}>
                                                            <pre style={{
                                                                fontFamily: "'Courier New', Courier, monospace",
                                                                fontSize: '0.72rem',
                                                                lineHeight: '1.65',
                                                                color: '#475569',
                                                                whiteSpace: 'pre-wrap',
                                                                wordBreak: 'break-word',
                                                                margin: 0
                                                            }}>
                                                                {displayText}
                                                            </pre>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 px-6 text-center">
                                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                                                <polyline points="14 2 14 8 20 8" />
                                                            </svg>
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-600">Original text unavailable</p>
                                                        <p className="text-xs text-slate-400 leading-relaxed">
                                                            This report was analyzed before text saving was added.
                                                            Re-upload your resume to see the comparison.
                                                        </p>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Right Panel: Optimized */}
                                    <div className="flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                                        <div className="bg-[#0f172a] px-6 py-4 flex items-center justify-between border-b border-slate-800">
                                            <span className="text-xs font-semibold uppercase tracking-widest text-white flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
                                                Optimized Resume
                                            </span>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => setReport({ ...report, optimized_resume: null })}
                                                    className="bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                                                >
                                                    Re-Optimize
                                                </button>
                                                <ScoreBadge score={report.optimized_resume.ats_score_after} size="sm" />
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10 select-none bg-white font-serif text-[#334155] leading-relaxed" style={{ fontFamily: "'Georgia', serif" }}>
                                            <div className="text-[1.4rem] font-bold text-[#0f172a] mb-[2px] tracking-tight">
                                                {cleanName(
                                                    (report.optimized_resume.candidate_name &&
                                                        !report.optimized_resume.candidate_name.toLowerCase().includes('candidate'))
                                                        ? report.optimized_resume.candidate_name
                                                        : null
                                                )}
                                            </div>
                                            <div className="text-[0.85rem] text-indigo-500 font-medium mb-4">{report.optimized_resume.target_role || report.role || 'Target Role'}</div>

                                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-4 pb-3 border-b border-slate-100">
                                                {report.optimized_resume.contact_email && (
                                                    <span className="text-xs text-slate-500">{report.optimized_resume.contact_email}</span>
                                                )}
                                                {report.optimized_resume.contact_phone && (
                                                    <span className="text-xs text-slate-500">{report.optimized_resume.contact_phone}</span>
                                                )}
                                                {report.optimized_resume.contact_location && (
                                                    <span className="text-xs text-slate-500">{report.optimized_resume.contact_location}</span>
                                                )}
                                                {report.optimized_resume.contact_linkedin && (
                                                    <span className="text-xs text-slate-500">{report.optimized_resume.contact_linkedin}</span>
                                                )}
                                            </div>

                                            {report.optimized_resume.summary && (
                                                <div className="mb-4">
                                                    <div className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-slate-400 border-b border-slate-200 pb-1 mb-2.5 mt-5">Professional Summary</div>
                                                    <div className="text-[0.82rem] leading-[1.7] text-slate-700">{report.optimized_resume.summary}</div>
                                                </div>
                                            )}

                                            {report.optimized_resume.experience && report.optimized_resume.experience.length > 0 && (
                                                <div className="mb-4">
                                                    <div className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-slate-400 border-b border-slate-200 pb-1 mb-2.5 mt-5">Experience</div>
                                                    {report.optimized_resume.experience.map((exp, i) => (
                                                        <div key={i} className="mb-4">
                                                            <div className="flex justify-between items-baseline mb-1">
                                                                <span className="text-[0.88rem] font-semibold text-[#0f172a]">{exp.role || exp.title}</span>
                                                                <span className="text-[0.78rem] text-slate-400">{exp.duration}</span>
                                                            </div>
                                                            <div className="text-[0.82rem] text-indigo-500 font-medium mb-1.5">{exp.company}</div>
                                                            {(exp.bullets || []).map((b, j) => (
                                                                <div key={j} className="text-[0.8rem] leading-[1.6] text-slate-600 pl-[14px] relative mb-[3px] before:content-['•'] before:absolute before:left-1 before:text-slate-400">
                                                                    {b}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {report.optimized_resume.skills && report.optimized_resume.skills.length > 0 && (
                                                <div className="mb-4">
                                                    <div className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-slate-400 border-b border-slate-200 pb-1 mb-2.5 mt-5">Skills</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {report.optimized_resume.skills.map((s, i) => (
                                                            <span key={i} className="border border-slate-200 rounded px-2 py-0.5 text-[0.75rem] text-slate-600 m-[2px] bg-transparent">{s}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {report.optimized_resume.keywords_added && report.optimized_resume.keywords_added.length > 0 && (
                                                <div className="mb-4">
                                                    <div className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-slate-400 border-b border-slate-200 pb-1 mb-2.5 mt-5">Keywords Added</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {report.optimized_resume.keywords_added.map((k, i) => (
                                                            <span key={i} className="border border-green-200 rounded px-2 py-0.5 text-[0.75rem] text-green-700 m-[2px] bg-transparent">{k}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {(!report.optimized_resume.experience || report.optimized_resume.experience.length === 0) && !report.optimized_resume.skills && !report.optimized_resume.summary && (
                                                <p className="text-sm text-slate-500 italic mt-10 text-center">No optimized content generated.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleDownload}
                                        disabled={downloading}
                                        className="w-full bg-[#111827] hover:bg-[#1e293b] text-white font-semibold py-4 rounded-lg transition-all text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {downloading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Generating PDF...
                                            </>
                                        ) : (
                                            "Download Optimized PDF"
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 3: JOBS ─────────────────────────────────────────────────── */}
                {activeTab === "jobs" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {!report.optimized_resume ? (
                            <div className="space-y-8">
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-extrabold text-[#0f172a] tracking-tight">Here's what's waiting for you</h3>
                                    <p className="text-sm font-medium text-slate-500">Unlock personalized job matches based on your optimized profile</p>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-3xl">
                                        <div className="bg-white px-8 py-6 rounded-2xl shadow-xl text-center space-y-4 border border-slate-100 max-w-sm">
                                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-xl">
                                                🔒
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-lg">Optimize your resume to unlock job matches</h4>
                                            <button
                                                onClick={() => setActiveTab("optimizer")}
                                                className="w-full bg-[#0f172a] hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2"
                                            >
                                                Go to Optimizer →
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 blur-sm pointer-events-none select-none opacity-60">
                                        {[1, 2, 3, 4, 5].map((job, i) => (
                                            <div key={i} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col justify-between h-64">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-slate-300" />
                                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 text-transparent rounded w-16">Platform</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h4 className="text-lg font-bold bg-slate-200 text-transparent rounded w-3/4">Job Title</h4>
                                                        <h4 className="text-lg font-bold bg-slate-200 text-transparent rounded w-1/2">Company</h4>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-100 text-transparent rounded w-32 py-1 text-sm font-semibold">
                                                    Apply Here →
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="max-w-2xl mx-auto space-y-8 text-center py-12">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-extrabold text-[#0f172a] tracking-tight">Finding jobs for: {targetRole || "Software Engineer"}</h3>
                                    <p className="text-slate-500 font-medium text-sm">We've tailored these suggestions based on your optimized profile</p>
                                </div>
                                <button
                                    onClick={handleFetchJobs}
                                    disabled={loadingJobs}
                                    className="bg-[#111827] hover:bg-[#1e293b] disabled:bg-slate-100 text-white font-semibold px-8 py-3 rounded-lg transition-all flex items-center justify-center gap-2 mx-auto"
                                >
                                    {loadingJobs ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Searching...
                                        </>
                                    ) : (
                                        "Find Matching Jobs"
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-2xl font-extrabold text-[#0f172a] tracking-tight">Matching Jobs for {targetRole}</h3>
                                    <p className="text-slate-500 font-medium text-sm">Click any card to open the job search</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {jobs.map((job, i) => {
                                        const colors = {
                                            LinkedIn: "#0077b5",
                                            Indeed: "#003399",
                                            Glassdoor: "#0caa41",
                                            Naukri: "#ff7555",
                                            Wellfound: "#000000"
                                        };
                                        const color = colors[job.platform] || "#6366f1";

                                        return (
                                            <a
                                                key={i}
                                                href={job.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="group bg-white border border-gray-100 rounded-3xl p-8 hover:-translate-y-2 transition-all duration-300 shadow-sm hover:shadow-2xl hover:shadow-gray-200 flex flex-col justify-between h-64"
                                            >
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                                        <span className="text-xs font-bold text-slate-500">{job.platform}</span>
                                                    </div>
                                                    <h4 className="text-lg font-bold text-[#0f172a] group-hover:text-indigo-600 transition">{job.title}</h4>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm font-semibold opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300" style={{ color }}>
                                                    Apply on {job.platform} →
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 4: CAREER PULSE ──────────────────────────────────────────── */}
                {activeTab === "pulse" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

                        {/* Chart Section */}
                        <Card className="h-[400px] flex flex-col">
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-[#0f172a] tracking-tight">ATS Score History</h3>
                                <p className="text-xs font-medium text-slate-500 mt-1">Track your improvement over optimization attempts</p>
                            </div>
                            <div className="flex-1 w-full min-h-[250px]">
                                {atsHistory.length <= 1 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                        <p className="text-sm font-medium text-slate-400">Optimize your resume to track improvement</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={atsHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis
                                                dataKey="attempt"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', fill: '#9ca3af' }}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                labelStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="score"
                                                stroke="#6366f1"
                                                strokeWidth={4}
                                                dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                                                activeDot={{ r: 8, strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Card>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Skill Gap Section */}
                            <Card>
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-[#0f172a]">Skill Gap Analysis</h3>
                                    <p className="text-xs font-medium text-slate-500 mt-1">Relevance to {targetRole || "target role"}</p>
                                </div>

                                {report.optimized_resume ? (
                                    <div className="space-y-6">
                                        {skillGaps.map((s, i) => (
                                            <div key={i} className="space-y-2">
                                                <div className="flex justify-between items-center text-xs font-semibold">
                                                    <span className="text-[#0f172a]">{s.n}</span>
                                                    <span className={s.c === 'indigo' ? "text-[#0f172a]" : "text-amber-600"}>{s.t} {s.v}%</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${s.c === 'indigo' ? "bg-[#111827]" : "bg-amber-400"} transition-all duration-1000`}
                                                        style={{ width: `${s.v}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center">
                                        <p className="text-sm font-bold text-gray-300 italic">Run the optimizer to see your skill gap</p>
                                    </div>
                                )}
                            </Card>

                            {/* Strength Meter Grid */}
                            <Card>
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-[#0f172a]">Resume Strength</h3>
                                    <p className="text-xs font-medium text-slate-500 mt-1">Metric distribution</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    {[
                                        { l: "Overall", v: report.score, c: "indigo" },
                                        { l: "Strengths", v: Math.min(100, report.strengths.length * 20), c: "green" },
                                        { l: "Keywords", v: Math.max(0, 100 - (report.missing_keywords?.length || 0) * 10), c: "rose" },
                                        { l: "Completion", v: checklistProgress, c: "emerald" }
                                    ].map((m, i) => (
                                        <div key={i} className="text-center space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <p className="text-xs font-semibold text-slate-500">{m.l}</p>
                                            <p className={`text-2xl font-bold ${m.c === 'indigo' ? 'text-[#0f172a]' : m.c === 'green' ? 'text-[#16a34a]' : m.c === 'rose' ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>
                                                {m.v}%
                                            </p>
                                            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                                <div className={`h-full transition-all duration-500 ${m.c === 'indigo' ? 'bg-[#111827]' : m.c === 'green' ? 'bg-[#16a34a]' : m.c === 'rose' ? 'bg-[#dc2626]' : 'bg-[#16a34a]'}`} style={{ width: `${m.v}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

            </main>

            {/* Floating Action Button (Mobile Only) */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full px-6">
                <button
                    onClick={() => setActiveTab('optimizer')}
                    className="w-full bg-[#111827] text-white font-semibold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
                >
                    Optimizer
                </button>
            </div>

        </div>
    );
}
