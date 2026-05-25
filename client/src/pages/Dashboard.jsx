import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import ScoreBadge from "../components/ScoreBadge";
import Skeleton from "../components/Skeleton";
import ReportOverlay from "../components/ReportOverlay";
import { useToast } from "../components/Toast";

// ── Components ──────────────────────────────────────────────────────────────

const StatCard = ({ title, value, color, loading, delay }) => (
    <div
        className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 ${color} hover:-translate-y-1 fade-in-up`}
        style={{ animationDelay: delay }}
    >
        {loading ? (
            <div className="space-y-3">
                <Skeleton.Block className="h-3 w-20" />
                <Skeleton.Block className="h-8 w-16" />
            </div>
        ) : (
            <>
                <div className="flex items-center justify-between mb-3 text-slate-500 text-xs font-semibold uppercase tracking-widest">
                    <span>{title}</span>
                </div>
                <div className="text-3xl font-extrabold text-[#0f172a]">{value}</div>
            </>
        )}
    </div>
);

const ReportRow = ({ report }) => {
    const navigate = useNavigate();

    return (
        <div className="group/row bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition shadow-sm relative">
            <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="min-w-0">
                    <h4 className="font-bold text-[#0f172a] truncate">
                        {report.report_name || report.role || "Resume Analysis"}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                        {new Date(report.created_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="mx-2">•</span>
                        Role: {report.role || "—"}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">ATS Score</span>
                    <div className="flex items-center gap-2">
                        <ScoreBadge score={report.score} size="md" />
                        {report.optimized_resume ? (
                            <div className="flex items-center gap-1 font-bold text-sm bg-green-50 px-2 py-0.5 rounded-lg border border-green-200 text-green-700">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                {report.optimized_resume.ats_score_after}
                            </div>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/report/${report.id}?tab=optimizer`); }}
                                className="bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-300 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded transition-colors flex items-center gap-1 shadow-sm"
                            >
                                Optimize <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                    <button
                        onClick={() => navigate(`/report/${report.id}`)}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors"
                    >
                        View Report
                    </button>
                    {report.optimized_resume && (
                        <button
                            onClick={() => navigate(`/report/${report.id}`)}
                            title="Download PDF"
                            className="bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-slate-300 p-2 rounded-lg shadow-sm transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Hover Tooltip */}
            <div className="absolute top-[105%] left-1/2 -translate-x-1/2 z-10 w-max bg-[#0f172a] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xl opacity-0 invisible group-hover/row:opacity-100 group-hover/row:visible transition-all duration-200 flex items-center gap-3">
                <span className="text-slate-300">This report has:</span>
                <div className="flex gap-2">
                    <span className="bg-white/10 px-2 py-0.5 rounded">Analysis</span>
                    <span className="bg-white/10 px-2 py-0.5 rounded">Optimizer</span>
                    <span className="bg-white/10 px-2 py-0.5 rounded">Job Matches</span>
                    <span className="bg-white/10 px-2 py-0.5 rounded">Career Pulse</span>
                </div>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0f172a] rotate-45"></div>
            </div>
        </div>
    );
};

// ── Main Page ───────────────────────────────────────────────────────────────

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const fileInputRef = useRef(null);

    const firstName = user?.user_metadata?.full_name?.split(" ")[0] ||
        user?.email?.split("@")[0].charAt(0).toUpperCase() + user?.email?.split("@")[0].slice(1) ||
        "User";


    const { showToast } = useToast();

    // Dashboard Data State
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [stats, setStats] = useState({ total: 0, bestScore: 0, optimized: 0, downloads: 0, tracked: 0 });

    // Tracker state (embedded)
    const [trackerApps, setTrackerApps] = useState([]);
    const [trackerStats, setTrackerStats] = useState({});
    const [trackerLoading, setTrackerLoading] = useState(false);
    const [showTrackerAdd, setShowTrackerAdd] = useState(false);
    const [editTrackerApp, setEditTrackerApp] = useState(null);
    const [trackerForm, setTrackerForm] = useState({ company_name: "", role_title: "", job_url: "", status: "applied", date_applied: new Date().toISOString().slice(0, 10), notes: "", report_id: "" });
    const [savingTracker, setSavingTracker] = useState(false);
    const [deleteTrackerId, setDeleteTrackerId] = useState(null);
    const [trackerMenuOpen, setTrackerMenuOpen] = useState(null);

    const TRACKER_COLS = ["saved", "applied", "interviewing", "offer", "rejected"];
    const TRACKER_LABELS = { saved: "Saved", applied: "Applied", interviewing: "Interviewing", offer: "Offer 🎉", rejected: "Rejected" };
    const TRACKER_BORDERS = { saved: "border-t-2 border-slate-400", applied: "border-t-2 border-blue-400", interviewing: "border-t-2 border-indigo-500", offer: "border-t-2 border-green-500", rejected: "border-t-2 border-red-400" };
    const TRACKER_STATUS_COLORS = { saved: "bg-slate-100 text-slate-600", applied: "bg-blue-50 text-blue-700", interviewing: "bg-indigo-50 text-indigo-700", offer: "bg-green-50 text-green-700", rejected: "bg-red-50 text-red-600", withdrawn: "bg-amber-50 text-amber-700" };

    // Upload/Analyze State
    const [file, setFile] = useState(null);
    const [targetRole, setTargetRole] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [analysisType, setAnalysisType] = useState(null); // 'role' or 'jd'
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [roleSearchQuery, setRoleSearchQuery] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeStage, setAnalyzeStage] = useState(0); // 0=idle 1=uploading 2=analyzing 3=saving
    const [uploadError, setUploadError] = useState("");
    const [isDragging, setIsDragging] = useState(false);

    // Full Screen Results State
    const [generatedReport, setGeneratedReport] = useState(null);

    const dropdownRef = useRef(null);

    // Stage labels shown during analysis
    const STAGE_LABELS = [
        null,
        "Uploading your resume...",
        "AI is reading and scoring your resume...",
        "Saving your results...",
    ];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowRoleDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const TOP_ROLES = [
        "Software Engineer", "Full Stack Developer", "Frontend Developer", "Backend Developer",
        "Data Scientist", "Data Analyst", "Product Manager", "DevOps Engineer",
        "Machine Learning Engineer", "Android Developer", "iOS Developer", "UI/UX Designer",
        "Business Analyst", "Cloud Engineer", "QA Engineer", "Cybersecurity Analyst",
        "React Developer", "Node.js Developer", "Python Developer", "Java Developer"
    ];

    const MORE_ROLES = [
        "Project Manager", "Scrum Master", "Technical Writer", "Database Administrator",
        "Network Engineer", "Salesforce Developer", "SAP Consultant", "Embedded Systems Engineer",
        "Blockchain Developer", "Game Developer", "AR/VR Developer", "AI Engineer",
        "NLP Engineer", "Data Engineer", "BI Developer", "Marketing Analyst",
        "Financial Analyst", "HR Business Partner", "Operations Manager", "Content Strategist"
    ];

    const filteredTopRoles = TOP_ROLES.filter(r => r.toLowerCase().includes(roleSearchQuery.toLowerCase()));
    const filteredMoreRoles = MORE_ROLES.filter(r => r.toLowerCase().includes(roleSearchQuery.toLowerCase()));

    const isAnalyzeDisabled = () => {
        if (!file || analyzing) return true;
        if (!analysisType) return true;
        if (analysisType === "role" && !targetRole) return true;
        if (analysisType === "jd" && !jobDescription.trim()) return true;
        return false;
    };

    useEffect(() => {

        const fetchData = async () => {
            try {
                const [reportRes, trackerRes, appsRes] = await Promise.allSettled([
                    api.get("/report/history"),
                    api.get("/tracker/stats"),
                    api.get("/tracker"),
                ]);
                const list = reportRes.status === 'fulfilled' ? (reportRes.value.data.data?.reports || []) : [];
                const tStats = trackerRes.status === 'fulfilled' ? (trackerRes.value.data.data?.stats || {}) : {};
                const tApps = appsRes.status === 'fulfilled' ? (appsRes.value.data.data?.applications || []) : [];

                setReports(list);
                setTrackerStats(tStats);
                setTrackerApps(tApps);

                const best = list.length > 0 ? Math.max(...list.map(r => r.score || 0)) : 0;
                const optCount = list.filter(r => r.optimized_resume != null).length;
                const dlValue = localStorage.getItem("resumeiq_downloads");
                const dlCount = (dlValue && !isNaN(dlValue)) ? parseInt(dlValue) : 0;

                setStats({
                    total: list.length,
                    bestScore: best,
                    optimized: optCount,
                    downloads: dlCount,
                    tracked: tStats.total || 0,
                });
            } catch (err) {
                console.error("Dashboard error:", err);
                setError("Couldn't load your reports. Try refreshing — if it keeps happening, come back later.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);


    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f && f.type !== "application/pdf") {
            setUploadError("Only PDF files are supported");
            return;
        }
        setFile(f || null);
        setUploadError("");
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f && f.type !== "application/pdf") {
            setUploadError("Only PDF files are supported");
            return;
        }
        setFile(f || null);
        setUploadError("");
    };

    const handleAnalyze = async () => {
        if (isAnalyzeDisabled()) return;
        setAnalyzing(true);
        setAnalyzeStage(1); // Stage 1: Uploading
        setUploadError("");

        try {
            const formData = new FormData();
            formData.append("resume", file);
            const uploadRes = await api.post("/resume/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const resumeId = uploadRes.data.data.resume.id;

            setAnalyzeStage(2); // Stage 2: AI analyzing

            const payload = {
                resume_id: resumeId,
                mode: analysisType
            };

            if (analysisType === "role") {
                payload.role = targetRole;
            } else {
                payload.job_description = jobDescription.length < 100 ? jobDescription.padEnd(100, " ") : jobDescription;
            }

            const analyzeRes = await api.post("/report/generate", payload);

            setAnalyzeStage(3); // Stage 3: Saving

            // Show full screen overlay instead of navigating
            setGeneratedReport(analyzeRes.data.data.report);

            // Refresh dashboard data quietly underneath
            const fetchReports = await api.get("/report/history");
            const list = fetchReports.data.data.reports || [];
            setReports(list);
            const best = list.length > 0 ? Math.max(...list.map(r => r.score || 0)) : 0;
            const optCount = list.filter(r => r.optimized_resume != null).length;
            const dlCount = parseInt(localStorage.getItem("resumeiq_downloads") || "0");
            setStats({ total: list.length, bestScore: best, optimized: optCount, downloads: dlCount });

        } catch (err) {
            console.error("Analysis flow error:", err);
            setUploadError(err.response?.data?.error || "Analysis failed. Please try again.");
        } finally {
            setAnalyzing(false);
            setAnalyzeStage(0);
        }
    };

    const refreshTracker = async () => {
        const [appsRes, statsRes] = await Promise.all([
            api.get("/tracker"),
            api.get("/tracker/stats"),
        ]);
        const newApps = appsRes.data.data?.applications || [];
        const newStats = statsRes.data.data?.stats || {};
        setTrackerApps(newApps);
        setTrackerStats(newStats);
        setStats(s => ({ ...s, tracked: newStats.total || 0 }));
    };

    const handleTrackerSave = async (e) => {
        e.preventDefault();
        setSavingTracker(true);
        try {
            if (editTrackerApp) {
                await api.patch(`/tracker/${editTrackerApp.id}`, trackerForm);
                showToast("Application updated!", "success");
            } else {
                await api.post("/tracker", trackerForm);
                showToast("Application added!", "success");
            }
            setShowTrackerAdd(false);
            await refreshTracker();
        } catch (err) {
            showToast(err.response?.data?.error || "Failed to save application. Please try again.", "error");
        }
        setSavingTracker(false);
    };

    const handleTrackerDelete = async () => {
        if (!deleteTrackerId) return;
        try {
            await api.delete(`/tracker/${deleteTrackerId}`);
            setDeleteTrackerId(null);
            showToast("Application removed.", "info");
            await refreshTracker();
        } catch {
            showToast("Failed to delete application. Please try again.", "error");
        }
    };

    const getScoreColorClass = (s) => {
        if (s >= 80) return "border-t-2 border-t-[#16a34a]";
        if (s >= 60) return "border-t-2 border-t-[#d97706]";
        return "border-t-2 border-t-[#dc2626]";
    };

    const getWelcomeText = () => {
        if (stats.total === 0) return "Upload your first resume to get started";
        if (stats.bestScore < 60) return `Your best ATS score is ${stats.bestScore}. Let's improve it!`;
        if (stats.bestScore < 80) return `Good progress! Your best ATS score is ${stats.bestScore}. Optimize further.`;
        return `Excellent! Your best ATS score is ${stats.bestScore}. You're interview ready.`;
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800">
            <Navbar />

            {/* ── SECTION 2: WELCOME BANNER ────────────────────────────────────────── */}
            <section className="bg-white border-b border-slate-200 py-12 px-6">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-extrabold text-[#0f172a] mb-2 tracking-tight">
                        Welcome back, {firstName}
                    </h2>
                    <p className="text-slate-500 font-medium">
                        {loading ? "Loading your reports..." : getWelcomeText()}
                    </p>
                </div>
            </section>

            <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-[#dc2626] p-4 rounded-lg flex items-center justify-between">
                        <span className="text-sm font-semibold">{error}</span>
                        <button onClick={() => window.location.reload()} className="bg-white hover:bg-red-50 text-[#dc2626] border border-red-200 hover:border-red-300 px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm">Refresh</button>
                    </div>
                )}

                <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <StatCard title="Resumes Analyzed" value={stats.total} color="border-t-2 border-t-slate-800" delay="0ms" loading={loading} />
                    <StatCard title="Best ATS Score" value={stats.total > 0 ? stats.bestScore : "—"} color={getScoreColorClass(stats.bestScore)} delay="75ms" loading={loading} />
                    <StatCard title="Optimized Resumes" value={stats.optimized} color="border-t-2 border-t-indigo-500" delay="150ms" loading={loading} />
                    <StatCard title="PDFs Downloaded" value={stats.downloads} color="border-t-2 border-t-blue-400" delay="225ms" loading={loading} />
                    <StatCard title="Applications Tracked" value={stats.tracked} color="border-t-2 border-t-purple-400" delay="300ms" loading={loading} />
                </section>



                <section className="flex justify-center">
                    <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-sm p-10 space-y-8">

                        {/* Onboarding banner — shown only to new users with no reports */}
                        {!loading && reports.length === 0 && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 space-y-3">
                                <p className="text-sm font-bold text-indigo-900">👋 Welcome to ResumeIQ! Here's how it works:</p>
                                <div className="space-y-2">
                                    {[
                                        "Upload your PDF resume below",
                                        "Choose a target role or paste a job description",
                                        "Get your ATS score + an AI-optimized version in ~30 seconds",
                                    ].map((step, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                            <span className="text-sm text-indigo-800">{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-center">
                            <h3 className="text-xl font-bold text-[#0f172a] mb-2 tracking-tight">Analyze a New Resume</h3>
                            <p className="text-slate-500 font-medium text-sm">Upload your PDF and we'll score it, find gaps, and rewrite it for your target role.</p>
                        </div>

                        {/* STEP 1 & 2: File Drop & Options */}
                        {!file ? (
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => { setIsDragging(false); handleDrop(e); }}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${isDragging ? "bg-indigo-50 border-indigo-300" : "bg-slate-50 border-slate-300 hover:border-indigo-300 hover:bg-white"}`}
                            >
                                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileChange} />
                                <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-center text-3xl mb-4">
                                    ☁️
                                </div>
                                <p className="text-slate-700 font-semibold text-base">Drag & drop your PDF here</p>
                                <p className="text-slate-400 font-medium text-sm my-2">— or —</p>
                                <button className="bg-white border border-slate-200 px-4 py-2 rounded-lg font-medium text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-colors">
                                    Browse File
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between border-2 border-slate-200 bg-slate-50 rounded-xl p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-center text-xl">
                                            📄
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                {file.name}
                                                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            </p>
                                            <p className="text-xs text-slate-500 font-medium">
                                                {(file.size / 1024).toFixed(1)} KB
                                                <button onClick={() => { setFile(null); setAnalysisType(null); }} className="ml-3 text-red-500 hover:text-red-700 underline underline-offset-2">Remove</button>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setAnalysisType("role")}
                                        className={`text-left p-5 rounded-xl border-2 transition-all duration-150 relative cursor-pointer ${analysisType === "role"
                                            ? "border-slate-900 bg-slate-900"
                                            : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 hover:scale-[1.01]"
                                            }`}
                                    >
                                        {analysisType === "role" && (
                                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                                                <span className="text-slate-900 text-xs font-bold">✓</span>
                                            </div>
                                        )}
                                        <div className={`rounded-lg p-2 w-fit ${analysisType === "role" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                                                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                                            </svg>
                                        </div>
                                        <div className={`text-base font-semibold mt-3 ${analysisType === "role" ? "text-white" : "text-slate-900"}`}>
                                            Role Analysis
                                        </div>
                                        <p className={`text-sm mt-1 leading-relaxed ${analysisType === "role" ? "text-slate-300" : "text-slate-500"}`}>
                                            Choose a target role and we analyze your resume against it.
                                        </p>
                                        <div className={`text-xs px-2 py-1 rounded-md w-fit mt-3 ${analysisType === "role" ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-500"}`}>
                                            Best for: exploring job markets
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setAnalysisType("jd")}
                                        className={`text-left p-5 rounded-xl border-2 transition-all duration-150 relative cursor-pointer ${analysisType === "jd"
                                            ? "border-slate-900 bg-slate-900"
                                            : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 hover:scale-[1.01]"
                                            }`}
                                    >
                                        {analysisType === "jd" && (
                                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                                                <span className="text-slate-900 text-xs font-bold">✓</span>
                                            </div>
                                        )}
                                        <div className={`rounded-lg p-2 w-fit ${analysisType === "jd" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                                <line x1="16" y1="13" x2="8" y2="13" />
                                                <line x1="16" y1="17" x2="8" y2="17" />
                                                <polyline points="10 9 9 9 8 9" />
                                            </svg>
                                        </div>
                                        <div className={`text-base font-semibold mt-3 ${analysisType === "jd" ? "text-white" : "text-slate-900"}`}>
                                            Job Description Match
                                        </div>
                                        <p className={`text-sm mt-1 leading-relaxed ${analysisType === "jd" ? "text-slate-300" : "text-slate-500"}`}>
                                            Paste a job posting and we match your resume to it exactly.
                                        </p>
                                        <div className={`text-xs px-2 py-1 rounded-md w-fit mt-3 ${analysisType === "jd" ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-500"}`}>
                                            Best for: specific applications
                                        </div>
                                    </button>
                                </div>

                                {/* STEP 3A: Role Analysis Inputs */}
                                {analysisType === "role" && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300 relative" ref={dropdownRef}>
                                        <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Select your target role</label>
                                        <div
                                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-base font-medium text-slate-800 cursor-pointer flex justify-between items-center"
                                            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                                        >
                                            {targetRole || <span className="text-slate-400">Search for a role...</span>}
                                            <svg className={`w-5 h-5 text-slate-400 transition-transform ${showRoleDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>

                                        {showRoleDropdown && (
                                            <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                                                    <div className="relative">
                                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                        <input
                                                            type="text"
                                                            placeholder="Type to search..."
                                                            value={roleSearchQuery}
                                                            onChange={(e) => setRoleSearchQuery(e.target.value)}
                                                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-[240px] overflow-y-auto overscroll-contain">
                                                    {filteredTopRoles.length > 0 && (
                                                        <div className="py-2">
                                                            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Most In-Demand</div>
                                                            {filteredTopRoles.map(role => (
                                                                <button
                                                                    key={role}
                                                                    onClick={() => { setTargetRole(role); setShowRoleDropdown(false); setRoleSearchQuery(""); }}
                                                                    className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex justify-between items-center"
                                                                >
                                                                    {role}
                                                                    <span className="text-[10px] font-bold tracking-wider text-green-700 bg-green-100 px-2 py-0.5 rounded">High demand</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {filteredMoreRoles.length > 0 && (
                                                        <div className="py-2 border-t border-slate-100">
                                                            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">More Roles</div>
                                                            {filteredMoreRoles.map(role => (
                                                                <button
                                                                    key={role}
                                                                    onClick={() => { setTargetRole(role); setShowRoleDropdown(false); setRoleSearchQuery(""); }}
                                                                    className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                                                >
                                                                    {role}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {filteredTopRoles.length === 0 && filteredMoreRoles.length === 0 && (
                                                        <div className="p-4 text-center text-sm text-slate-500">
                                                            No roles found matching "{roleSearchQuery}".<br />
                                                            <button
                                                                onClick={() => { setTargetRole(roleSearchQuery); setShowRoleDropdown(false); }}
                                                                className="mt-2 text-indigo-600 font-semibold hover:underline"
                                                            >
                                                                Use "{roleSearchQuery}" anyway
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* STEP 3B: Job Description Inputs */}
                                {analysisType === "jd" && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex justify-between">
                                            <span>Paste the job description</span>
                                            <span className="text-slate-400 font-medium normal-case tracking-normal">Tip: include the full posting for best results</span>
                                        </label>
                                        <textarea
                                            value={jobDescription}
                                            onChange={(e) => setJobDescription(e.target.value)}
                                            placeholder="Paste the full job description here — requirements, responsibilities, qualifications..."
                                            rows={6}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {uploadError && (
                            <p className="text-sm font-medium text-[#dc2626] text-center bg-red-50 py-3 rounded-md border border-red-200">{uploadError}</p>
                        )}

                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzeDisabled()}
                            className={`w-full font-semibold py-3 rounded-lg transition-all text-base flex items-center justify-center gap-2 ${isAnalyzeDisabled()
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                                }`}
                        >
                            {analyzing ? (
                                <div className="w-full space-y-2 py-0.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-white/90">{STAGE_LABELS[analyzeStage] || "Processing..."}</span>
                                        <span className="text-xs text-white/60">Step {analyzeStage} of 3</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${Math.round((analyzeStage / 3) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <span>Analyze Resume →</span>
                            )}
                        </button>
                    </div>
                </section>

                {/* Recent Reports — moved above tracker for better priority */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-[#0f172a] tracking-tight">Recent Reports</h3>
                        <Link to="/history" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition">
                            View All →
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            [1, 2, 3].map(n => (
                                <Skeleton.Block key={n} className="h-24" />
                            ))
                        ) : reports.length > 0 ? (
                            reports.slice(0, 3).map(report => (
                                <ReportRow key={report.id} report={report} />
                            ))
                        ) : (
                            <div className="bg-white border text-center border-slate-200 rounded-2xl py-16 flex flex-col items-center justify-center space-y-4">
                                <div>
                                    <p className="text-slate-600 font-medium">Drop your resume above. We'll handle the rest.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Job Tracker (Embedded) ─────────────────────────────────────────── */}
                <section className="space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-[#0f172a] tracking-tight">Application Pipeline</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Track every application from saved to offer</p>
                        </div>
                        <button
                            onClick={() => { setTrackerForm({ company_name: "", role_title: "", job_url: "", status: "applied", date_applied: new Date().toISOString().slice(0, 10), notes: "", report_id: "" }); setEditTrackerApp(null); setShowTrackerAdd(true); }}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-700 transition-colors"
                        >
                            + Add Application
                        </button>
                    </div>

                    {/* Tracker Stats */}
                    {(trackerStats.total > 0) && (
                        <div className="grid grid-cols-5 gap-3">
                            {[
                                { key: 'saved', label: 'Saved', color: 'border-t-2 border-slate-400' },
                                { key: 'applied', label: 'Applied', color: 'border-t-2 border-blue-400' },
                                { key: 'interviewing', label: 'Interviewing', color: 'border-t-2 border-indigo-500' },
                                { key: 'offer', label: 'Offer', color: 'border-t-2 border-green-500' },
                                { key: 'rejected', label: 'Rejected', color: 'border-t-2 border-red-400' },
                            ].map(col => (
                                <div key={col.key} className={`bg-white border border-slate-200 rounded-xl p-3 text-center ${col.color}`}>
                                    <p className="text-xl font-extrabold text-slate-900">{trackerStats[col.key] || 0}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{col.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Mobile: list view (readable on small screens) */}
                    <div className="block md:hidden space-y-3">
                        {trackerApps.length === 0 ? (
                            <div className="text-center py-8 text-sm text-slate-400">
                                No applications yet. Click "+ Add Application" to track your first one.
                            </div>
                        ) : (
                            trackerApps.map(app => (
                                <div key={app.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-slate-800 text-sm truncate">{app.company_name}</p>
                                        <p className="text-xs text-slate-500 truncate">{app.role_title}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{app.date_applied}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${TRACKER_STATUS_COLORS[app.status] || "bg-slate-100 text-slate-600"}`}>
                                            {app.status}
                                        </span>
                                        <button
                                            onClick={() => { setTrackerForm({ company_name: app.company_name, role_title: app.role_title, job_url: app.job_url || "", status: app.status, date_applied: app.date_applied || "", notes: app.notes || "", report_id: app.report_id || "" }); setEditTrackerApp(app); setShowTrackerAdd(true); }}
                                            className="text-slate-400 hover:text-slate-600 p-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop: Kanban board */}
                    <div className="hidden md:grid md:grid-cols-5 gap-4">
                        {TRACKER_COLS.map(status => (
                            <div key={status} className={`bg-slate-50 rounded-xl p-3 min-h-60 border border-slate-200 ${TRACKER_BORDERS[status]}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">{TRACKER_LABELS[status]}</h4>
                                    <span className="text-xs font-bold bg-white border border-slate-200 rounded-full w-5 h-5 flex items-center justify-center text-slate-600">{trackerApps.filter(a => a.status === status).length}</span>
                                </div>
                                <div className="space-y-2">
                                    {trackerApps.filter(a => a.status === status).length === 0 && (
                                        <div className="text-center py-6 text-xs text-slate-400">Empty</div>
                                    )}
                                    {trackerApps.filter(a => a.status === status).map(app => (
                                        <div key={app.id} className="bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-sm transition-shadow relative group">
                                            <div className="pr-5">
                                                <p className="font-bold text-slate-900 text-xs truncate">{app.company_name}</p>
                                                <p className="text-xs text-slate-500 truncate">{app.role_title}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">{app.date_applied}</p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                                                {app.job_url && (
                                                    <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700">Link ↗</a>
                                                )}
                                                {app.report_id && (
                                                    <Link to={`/report/${app.report_id}`} className="text-[10px] font-bold text-slate-500 hover:text-slate-900 ml-auto">Resume</Link>
                                                )}
                                            </div>
                                            <div className="absolute top-2 right-2">
                                                <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity" onClick={() => setTrackerMenuOpen(trackerMenuOpen === app.id ? null : app.id)}>
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4z" /></svg>
                                                </button>
                                                {trackerMenuOpen === app.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setTrackerMenuOpen(null)} />
                                                        <div className="absolute right-0 top-5 w-28 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-20">
                                                            <button className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-slate-50 text-slate-700" onClick={() => { setTrackerForm({ company_name: app.company_name, role_title: app.role_title, job_url: app.job_url || "", status: app.status, date_applied: app.date_applied || "", notes: app.notes || "", report_id: app.report_id || "" }); setEditTrackerApp(app); setShowTrackerAdd(true); setTrackerMenuOpen(null); }}>Edit</button>
                                                            <button className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-red-50 text-red-600" onClick={() => { setDeleteTrackerId(app.id); setTrackerMenuOpen(null); }}>Delete</button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <div className="fixed top-0 right-0 -z-10 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
            <div className="fixed bottom-0 left-0 -z-10 w-96 h-96 bg-purple-50/50 rounded-full blur-3xl opacity-50 -translate-x-1/2 translate-y-1/2"></div>

            {generatedReport && (
                <ReportOverlay
                    report={generatedReport}
                    onClose={() => setGeneratedReport(null)}
                />
            )}

            {/* Tracker Add/Edit Modal */}
            {showTrackerAdd && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-900">{editTrackerApp ? "Edit Application" : "Add Application"}</h2>
                            <button onClick={() => setShowTrackerAdd(false)} className="text-slate-400 hover:text-slate-700 text-2xl">×</button>
                        </div>
                        <form onSubmit={handleTrackerSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Company *</label>
                                    <input required value={trackerForm.company_name} onChange={e => setTrackerForm(f => ({ ...f, company_name: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Acme Corp" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Role *</label>
                                    <input required value={trackerForm.role_title} onChange={e => setTrackerForm(f => ({ ...f, role_title: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Software Engineer" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Job URL</label>
                                <input value={trackerForm.job_url} onChange={e => setTrackerForm(f => ({ ...f, job_url: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Status</label>
                                    <select value={trackerForm.status} onChange={e => setTrackerForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        {["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Date Applied</label>
                                    <input type="date" value={trackerForm.date_applied} onChange={e => setTrackerForm(f => ({ ...f, date_applied: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>
                            {reports.length > 0 && (
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Linked Resume (optional)</label>
                                    <select value={trackerForm.report_id} onChange={e => setTrackerForm(f => ({ ...f, report_id: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option value="">None</option>
                                        {reports.map(r => <option key={r.id} value={r.id}>{r.report_name || r.role || "Report"}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 block mb-1">Notes</label>
                                <textarea value={trackerForm.notes} onChange={e => setTrackerForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Interview notes..." />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowTrackerAdd(false)} className="flex-1 border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
                                <button type="submit" disabled={savingTracker} className="flex-1 bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-700 disabled:opacity-50">{savingTracker ? "Saving..." : editTrackerApp ? "Save Changes" : "Add Application"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tracker Delete Confirm */}
            {deleteTrackerId && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <h3 className="text-base font-bold text-slate-900 mb-2">Delete Application?</h3>
                        <p className="text-sm text-slate-500 mb-6">This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTrackerId(null)} className="flex-1 border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
                            <button onClick={handleTrackerDelete} className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
