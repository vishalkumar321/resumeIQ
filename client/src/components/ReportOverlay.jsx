import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import ScoreBadge from "./ScoreBadge";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "./Toast";

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

export default function ReportOverlay({ report: initialReport, onClose }) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [report, setReport] = useState(initialReport);
    const [screen, setScreen] = useState(1); // 1: Analysis, 2: Optimizer Loading, 3: Comparison, 4: Jobs
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [downloading, setDownloading] = useState(false);

    // Derived Data
    let verdict = "";
    if (report.score >= 85) verdict = "Excellent — You're interview ready";
    else if (report.score >= 75) verdict = "Good — A few improvements will make this strong";
    else if (report.score >= 60) verdict = "Moderate — Needs some work before applying";
    else verdict = "Needs Improvement — Let's fix this together";

    const strengths = report.strengths || [];
    const weaknesses = report.weaknesses || [];
    const missingKeywords = report.missing_keywords || [];
    const suggestions = report.suggestions || [];
    const isReadyForComparison = !!report.optimized_resume;

    // Helper: verdict styling
    const getVerdictStyle = (s) => {
        if (s >= 85) return "bg-green-50 text-green-700 border-green-200";
        if (s >= 75) return "bg-blue-50 text-blue-700 border-blue-200";
        if (s >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
        return "bg-red-50 text-red-700 border-red-200";
    };

    // Helper: score colors
    const getScoreColor = (s) => {
        if (s >= 80) return "text-green-600";
        if (s >= 60) return "text-amber-500";
        return "text-red-600";
    };

    const getScoreBg = (s) => {
        if (s >= 80) return "bg-green-600";
        if (s >= 60) return "bg-amber-500";
        return "bg-red-600";
    };

    // Simulated Optimizer Sequence
    const handleOptimize = async () => {
        if (isReadyForComparison) {
            setScreen(3);
            return;
        }

        setScreen(2);

        try {
            const role = report.role || "Software Engineer";
            const res = await api.post(`/report/rewrite/${report.id}`, { targetRole: role });
            const optimized = res.data.data.optimized;
            setReport(prev => ({ ...prev, optimized_resume: optimized }));
            setScreen(3);
        } catch (err) {
            showToast("Optimization failed. Please try again.", "error");
            setScreen(1);
        }
    };

    const handleFetchJobs = async () => {
        setScreen(4);
        if (jobs.length > 0) return;
        setLoadingJobs(true);
        try {
            const res = await api.get(`/report/jobs/${report.id}`);
            setJobs(res.data.data.jobs || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingJobs(false);
        }
    };

    const handleDownload = async () => {
        try {
            setDownloading(true);
            const response = await api.get(`/report/download/${report.id}`, {
                responseType: "blob"
            });
            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `optimized-resume.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            showToast("PDF downloaded successfully!", "success");
        } catch (err) {
            console.error("Download failed:", err);
            showToast("Failed to download PDF. Please try again.", "error");
        } finally {
            setDownloading(false);
        }
    };


    // Top Bar
    const renderTopBar = () => {
        const reportTitle = report.report_name || report.role || 'Resume Analysis';

        if (screen === 1) {
            return (
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
                    <button onClick={onClose} className="text-slate-600 hover:text-slate-900 font-medium text-sm flex items-center gap-2">
                        ← Back to Dashboard
                    </button>
                    <div className="font-semibold text-slate-800 text-sm truncate max-w-sm">{reportTitle} Analysis</div>
                    <div className="w-32"></div>
                </div>
            );
        }

        return (
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
                <button onClick={() => setScreen(1)} className="text-slate-600 hover:text-slate-900 font-medium text-sm flex items-center gap-2">
                    ← Back to Analysis
                </button>
                <div className="font-semibold text-slate-800 text-sm truncate max-w-sm">Optimizing for: {report.role || 'Software Engineer'}</div>
                <div className="w-32"></div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-100/50 backdrop-blur-sm flex flex-col animate-in slide-in-from-bottom-full duration-500 overflow-hidden">
            <div className="bg-white flex-1 flex flex-col shadow-2xl relative w-full h-full overflow-hidden">
                {renderTopBar()}

                {/* Step indicator */}
                <div className="flex items-center px-6 py-2.5 bg-slate-50 border-b border-slate-100 gap-0">
                    {[
                        { n: 1, label: "Analysis", screens: [1] },
                        { n: 2, label: "Optimize", screens: [2, 3] },
                        { n: 3, label: "Find Jobs", screens: [4] },
                    ].map((step, i) => {
                        const isActive = step.screens.includes(screen);
                        const isDone = (screen > Math.max(...step.screens));
                        return (
                            <div key={step.n} className="flex items-center">
                                <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                                    isActive ? "bg-slate-900 text-white" :
                                    isDone ? "text-slate-500" : "text-slate-400"
                                }`}>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                        isActive ? "bg-white text-slate-900" :
                                        isDone ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-400"
                                    }`}>
                                        {isDone ? "✓" : step.n}
                                    </span>
                                    {step.label}
                                </div>
                                {i < 2 && <div className="w-8 h-px bg-slate-200 mx-1" />}
                            </div>
                        );
                    })}
                </div>

                <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">

                    {/* SCREEN 1: Analysis */}
                    {screen === 1 && (
                        <div className="max-w-4xl mx-auto px-6 py-12 space-y-12 animate-in fade-in zoom-in-95 duration-500">
                            {/* Hero Score Section */}
                            <div className="text-center space-y-4">
                                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Your ATS Score</h2>
                                <div className={`text-8xl font-extrabold tracking-tighter ${getScoreColor(report.score)} drop-shadow-sm`}>
                                    {report.score}
                                </div>
                                <div className="text-sm text-slate-400">out of 100</div>

                                <div className="max-w-md mx-auto h-3 bg-slate-100 rounded-full overflow-hidden mt-6 shadow-inner">
                                    <div
                                        className={`h-full ${getScoreBg(report.score)} rounded-full shadow-sm transition-all duration-1000 ease-out`}
                                        style={{ width: `${report.score}%` }}
                                    />
                                </div>
                                <div className="mt-6">
                                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border ${getVerdictStyle(report.score)}`}>
                                        {verdict}
                                    </span>
                                </div>
                            </div>

                            {/* Content Below Score */}
                            <div className="grid md:grid-cols-2 gap-6 mt-12">
                                {/* Strengths */}
                                <div className="bg-white border border-slate-200 border-t-2 border-t-green-400 rounded-2xl p-6 shadow-sm min-h-[160px]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">What's working</h3>
                                    </div>
                                    <div className="space-y-0">
                                        {strengths.length > 0 ? strengths.map((s, i) => (
                                            <div key={i} className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                                                <span className="text-sm text-slate-600 leading-relaxed">{s}</span>
                                            </div>
                                        )) : <p className="text-sm text-slate-400 italic">No data available</p>}
                                    </div>
                                </div>

                                {/* Weaknesses */}
                                <div className="bg-white border border-slate-200 border-t-2 border-t-amber-400 rounded-2xl p-6 shadow-sm min-h-[160px]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">What to improve</h3>
                                    </div>
                                    <div className="space-y-0">
                                        {weaknesses.length > 0 ? weaknesses.map((w, i) => (
                                            <div key={i} className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                                                <span className="text-sm text-slate-600 leading-relaxed">{w}</span>
                                            </div>
                                        )) : <p className="text-sm text-slate-400 italic">No data available</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Missing Keywords */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-lg font-extrabold text-[#0f172a]">Keywords employers are looking for</h3>
                                <p className="text-xs font-semibold text-slate-500 mb-6 uppercase tracking-widest mt-1">Adding these could improve your score significantly</p>
                                <div className="flex flex-wrap gap-0">
                                    {missingKeywords.length > 0 ? missingKeywords.map((kw, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-200 rounded-md text-xs font-medium text-red-700 m-1">
                                            + {kw}
                                        </span>
                                    )) : (
                                        <p className="text-sm text-green-600 font-medium">Great — no major keywords missing!</p>
                                    )}
                                </div>
                            </div>

                            {/* Suggestions */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-lg font-extrabold text-[#0f172a] mb-6">Action Items</h3>
                                <div className="space-y-0">
                                    {suggestions.length > 0 ? suggestions.map((s, i) => (
                                        <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                                                {i + 1}
                                            </span>
                                            <span className="text-sm text-slate-600 leading-relaxed">
                                                {s}
                                            </span>
                                        </div>
                                    )) : <p className="text-sm text-slate-400 italic">No data available</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SCREEN 2: Loading State — honest spinner */}
                    {screen === 2 && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[500px] animate-in fade-in duration-500">
                            <div className="flex flex-col items-center gap-6 text-center max-w-sm">
                                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                <div className="space-y-2">
                                    <p className="text-xl font-bold text-slate-800">Optimizing your resume...</p>
                                    <p className="text-sm text-slate-500">AI is rewriting every section to improve your ATS score.</p>
                                    <p className="text-xs text-slate-400 mt-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                                        This takes 20–40 seconds — please don't close this tab.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SCREEN 3: Comparison Panels */}
                    {screen === 3 && report.optimized_resume && (
                        <div className="w-full h-full flex flex-col animate-in fade-in zoom-in-95 duration-500">
                            {/* Score Banner */}
                            <div className="w-full bg-gradient-to-r from-[#0f172a] to-slate-800 text-white flex items-center justify-center py-6 shadow-inner shrink-0 z-10">
                                <div className="flex items-center gap-8 md:gap-16 font-extrabold text-2xl md:text-3xl tracking-tight">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Before</span>
                                        <span className="opacity-90">{report.score}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-green-400 drop-shadow-md">
                                        <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                        <span className="bg-green-400/10 px-3 py-1 rounded-lg">+{report.optimized_resume.ats_score_after - report.score} pts</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-[10px] uppercase tracking-widest text-green-400 font-bold">After</span>
                                        <span className="text-green-400 drop-shadow-sm">{report.optimized_resume.ats_score_after}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Comparison Columns */}
                            <div className="flex-1 flex flex-col md:flex-row min-h-0">
                                {/* Left: Original */}
                                <div className="flex-1 border-r border-slate-200 flex flex-col min-h-0 bg-slate-50 overflow-hidden">
                                    <div className="bg-slate-100 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
                                        <h3 className="font-extrabold text-slate-800 tracking-tight">Original Resume</h3>
                                        <ScoreBadge score={report.score} size="sm" />
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

                                {/* Right: Optimized */}
                                <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-0">
                                    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
                                        <h3 className="font-extrabold text-[#0f172a] tracking-tight">Optimized Resume</h3>
                                        <ScoreBadge score={report.optimized_resume.ats_score_after} size="sm" />
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

                                        {report.missing_keywords && report.missing_keywords.length > 0 && (
                                            <div className="mb-4">
                                                <div className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-slate-400 border-b border-slate-200 pb-1 mb-2.5 mt-5">Keywords Added</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {report.missing_keywords.map((k, i) => (
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
                        </div>
                    )}

                    {/* SCREEN 4: Jobs */}
                    {screen === 4 && (
                        <div className="max-w-5xl mx-auto px-6 py-12 space-y-8 animate-in slide-in-from-right-10 fade-in duration-500">
                            <div className="text-center space-y-2 mb-12">
                                <h3 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">Jobs matching your optimized profile</h3>
                                <p className="text-slate-500 font-medium">Based on your skills and target role: <strong className="text-slate-800">{report.role || "Software Engineer"}</strong></p>
                            </div>

                            {loadingJobs ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                </div>
                            ) : jobs.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">No jobs found.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {jobs.map((job, i) => {
                                        const colors = { LinkedIn: "#0077b5", Indeed: "#003399", Glassdoor: "#0caa41", Naukri: "#ff7555", Wellfound: "#000000" };
                                        const color = colors[job.platform] || "#6366f1";
                                        return (
                                            <a key={i} href={job.url} target="_blank" rel="noreferrer" className="group bg-white border border-slate-200 rounded-2xl p-6 hover:-translate-y-1 hover:border-slate-300 transition-all shadow-sm hover:shadow-md flex flex-col justify-between h-56">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                                        <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{job.platform}</span>
                                                    </div>
                                                    <h4 className="text-lg font-bold text-[#0f172a] group-hover:text-indigo-600 transition leading-tight">{job.title}</h4>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm font-bold opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300" style={{ color }}>
                                                        Apply Now →
                                                    </div>
                                                    <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded">External Link</span>
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="text-center pt-8">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">These are direct search links. Click to open and browse real listings.</p>
                            </div>
                        </div>
                    )}


                    {/* STICKY BOTTOM BAR */}
                </div>

                {/* STICKY BOTTOM BAR */}
                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] px-6 py-4 z-20">
                    <div className="max-w-6xl mx-auto flex items-center justify-between">

                        {/* LEFT SECTION */}
                        <div className="flex flex-col w-1/4">
                            {screen === 3 ? (
                                <div className="font-bold text-sm">
                                    <span className="text-slate-500 line-through mr-2">{report.score}</span>
                                    <span className="text-green-600 text-lg">{report.optimized_resume.ats_score_after}</span>
                                    <span className="text-green-600 text-xs ml-2 font-semibold bg-green-50 px-2 py-0.5 rounded-md border border-green-200">(+{report.optimized_resume.ats_score_after - report.score} pts)</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-800">Score</span>
                                        <span className={`text-sm font-extrabold ${getScoreColor(report.score)} bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200`}>{report.score}/100</span>
                                    </div>
                                    <div className="text-xs font-medium text-slate-500 truncate mt-1 max-w-[200px]">{report.report_name || report.role || 'Resume Analysis'}</div>
                                </>
                            )}
                        </div>

                        {/* CENTER SECTION */}
                        <div className="flex flex-col items-center justify-center flex-1">
                            {screen === 1 && (
                                <div className="flex flex-col items-center relative group">
                                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 group-hover:-translate-y-1 transition-transform">Want a higher score?</span>
                                    <button
                                        onClick={handleOptimize}
                                        className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-8 py-3.5 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group-hover:scale-105"
                                    >
                                        Optimize This Resume <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </button>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#16a34a] mt-2 group-hover:translate-y-1 transition-transform bg-green-50 px-3 py-1 rounded-full border border-green-200">AI rewrites to score 90+</span>
                                </div>
                            )}
                            {screen === 3 && (
                                <div className="flex flex-col items-center group">
                                    <button
                                        onClick={handleDownload}
                                        disabled={downloading}
                                        className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-10 py-3.5 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group-hover:scale-102 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {downloading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Generating PDF...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Download Optimized PDF
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* RIGHT SECTION */}
                        <div className="flex flex-col items-end gap-2 w-1/4">
                            {screen === 1 && (
                                <>
                                    <button onClick={handleFetchJobs} className="border-2 border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm">
                                        View Matching Jobs
                                    </button>
                                    <button onClick={() => navigate(`/report/${report.id}`)} className="text-slate-400 hover:text-indigo-600 text-xs font-bold underline underline-offset-4 transition-colors">
                                        Go to full report
                                    </button>
                                </>
                            )}
                            {screen === 3 && (
                                <>
                                    <button onClick={handleFetchJobs} className="border-2 border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2">
                                        View Matching Jobs <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                    <button onClick={() => setScreen(1)} className="text-slate-400 hover:text-slate-700 text-xs font-bold underline underline-offset-4 transition-colors">
                                        Re-optimize with different role
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
