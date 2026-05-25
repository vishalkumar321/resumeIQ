import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import ScoreBadge from "../components/ScoreBadge";
import Skeleton from "../components/Skeleton";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";

// ── Shared Components ──────────────────────────────────────────────────────

// ── Main Page ──────────────────────────────────────────────────────────────

export default function History() {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { showToast } = useToast();


    // UI States
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("All"); // All, Analyzed Only, Optimized, Downloaded
    const [sort, setSort] = useState("Newest First");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Interaction States
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null);
    const [toast, setToast] = useState("");
    const [downloadingId, setDownloadingId] = useState(null);

    useEffect(() => {

        const fetchHistory = async () => {
            try {
                const res = await api.get("/report/history");
                setReports(res.data.data.reports || []);
            } catch (err) {
                setError("Could not load your reports. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);


    // ── Logic ────────────────────────────────────────────────────────────────

    const stats = useMemo(() => {
        const total = reports.length;
        const best = total > 0 ? Math.max(...reports.map(r => r.score || 0)) : 0;
        const optimized = reports.filter(r => r.optimized_resume != null).length;
        const downloadedIds = JSON.parse(localStorage.getItem("resumeiq_downloads") || "[]");
        const downloaded = reports.filter(r => downloadedIds.includes(r.id)).length;
        return { total, best, optimized, downloaded };
    }, [reports]);

    const filteredAndSortedReports = useMemo(() => {
        let result = [...reports];

        // 1. Filter
        if (filter === "Analyzed Only") {
            result = result.filter(r => r.optimized_resume === null);
        } else if (filter === "Optimized") {
            result = result.filter(r => r.optimized_resume !== null);
        } else if (filter === "Downloaded") {
            const downloadedIds = JSON.parse(localStorage.getItem("resumeiq_downloads") || "[]");
            result = result.filter(r => downloadedIds.includes(r.id));
        }

        // 2. Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(r => {
                const name = (r.report_name || r.role || "Resume Analysis").toLowerCase();
                const role = (r.role || "").toLowerCase();
                const date = new Date(r.created_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
                return name.includes(term) || role.includes(term) || date.includes(term);
            });
        }

        // 3. Sort
        result.sort((a, b) => {
            if (sort === "Newest First") return new Date(b.created_at) - new Date(a.created_at);
            if (sort === "Oldest First") return new Date(a.created_at) - new Date(b.created_at);
            if (sort === "Highest ATS Score") return (b.score || 0) - (a.score || 0);
            if (sort === "Lowest ATS Score") return (a.score || 0) - (b.score || 0);
            return 0;
        });

        return result;
    }, [reports, filter, sort, searchTerm]);

    const paginatedReports = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedReports.slice(start, start + itemsPerPage);
    }, [filteredAndSortedReports, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedReports.length / itemsPerPage);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleDownload = async (id, role) => {
        setDownloadingId(id);
        try {
            const res = await api.get(`/report/download/${id}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            const slug = (role || "optimized").toLowerCase().replace(/\s+/g, "-");
            link.setAttribute('download', `resumeiq-${slug}-optimized.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            // Track download
            const downloadedIds = JSON.parse(localStorage.getItem("resumeiq_downloads") || "[]");
            if (!downloadedIds.includes(id)) {
                downloadedIds.push(id);
                localStorage.setItem("resumeiq_downloads", JSON.stringify(downloadedIds));

                // Track global count for dashboard (backward compat)
                const count = parseInt(localStorage.getItem("resumeiq_downloads_count") || "0");
                localStorage.setItem("resumeiq_downloads_count", (count + 1).toString());
            }
        } catch (err) {
            console.error("Download failed:", err);
        } finally {
            setDownloadingId(null);
        }
    };

    const confirmDelete = (report) => {
        setReportToDelete(report);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!reportToDelete) return;
        try {
            await api.delete(`/report/${reportToDelete.id}`);
            setReports(prev => prev.filter(r => r.id !== reportToDelete.id));

            // Cleanup storage
            const downloadedIds = JSON.parse(localStorage.getItem("resumeiq_downloads") || "[]");
            localStorage.setItem("resumeiq_downloads", JSON.stringify(downloadedIds.filter(id => id !== reportToDelete.id)));

            showToast("Report deleted", "success");
        } catch (err) {
            showToast("Delete failed", "error");
            console.error("Delete failed:", err);
        } finally {
            setShowDeleteModal(false);
            setReportToDelete(null);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 overflow-x-hidden">
            <Navbar />

            <main className="max-w-4xl mx-auto px-6 py-10 space-y-8 animate-in fade-in duration-500">

                {/* ── SECTION 2: PAGE HEADER ────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900">My Resume History</h1>
                        <p className="text-sm font-bold text-gray-400 mt-1">
                            {reports.length === 0 ? "No resumes analyzed yet" :
                                reports.length === 1 ? "1 resume analyzed" :
                                    `${reports.length} resumes analyzed`}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg shadow-indigo-100 transition text-xs"
                    >
                        + Analyze New Resume
                    </button>
                </div>

                {/* ── SECTION 8: STATS SUMMARY BAR ──────────────────────────────────── */}
                <div className="bg-white border border-gray-100 rounded-xl px-6 py-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 shadow-sm overflow-x-auto no-scrollbar gap-8">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-lg">📄</span>
                        <span>{stats.total} Total</span>
                    </div>
                    <div className="w-px h-4 bg-gray-100" />
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-lg text-amber-500">⚡</span>
                        <span>Best Score: <span className="text-gray-900">{stats.best}</span></span>
                    </div>
                    <div className="w-px h-4 bg-gray-100" />
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-lg text-purple-500">🔁</span>
                        <span>{stats.optimized} Optimized</span>
                    </div>
                    <div className="w-px h-4 bg-gray-100" />
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-lg text-blue-500">📥</span>
                        <span>{stats.downloaded} Downloaded</span>
                    </div>
                </div>

                {/* ── SECTION 3: FILTER & SORT ROW ──────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                        {["All", "Analyzed Only", "Optimized", "Downloaded"].map(p => (
                            <button
                                key={p}
                                onClick={() => { setFilter(p); setCurrentPage(1); }}
                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${filter === p ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <div className="relative min-w-[180px]">
                        <select
                            value={sort}
                            onChange={(e) => { setSort(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer appearance-none"
                        >
                            {["Newest First", "Oldest First", "Highest ATS Score", "Lowest ATS Score"].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</div>
                    </div>
                </div>

                {/* ── SECTION 4: SEARCH BAR ─────────────────────────────────────────── */}
                <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg group-focus-within:text-indigo-600 transition tracking-tighter">🔍</span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        placeholder="Search by filename or target role..."
                        className="w-full bg-white border border-gray-100 rounded-2xl px-12 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition shadow-sm outline-none"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-xl text-gray-400"
                        >
                            ×
                        </button>
                    )}
                </div>

                {/* ── SECTION 5: REPORT CARDS LIST ───────────────────────────────────── */}
                <div className="space-y-4">
                    {loading ? (
                        [1, 2, 3].map(n => (
                            <div key={n} className="bg-white border border-gray-100 rounded-2xl p-6 flex gap-6">
                                <Skeleton.Block className="w-14 h-14 rounded-2xl shrink-0" />
                                <div className="flex-1 space-y-3">
                                    <Skeleton.Block className="h-5 w-1/2" />
                                    <Skeleton.Block className="h-3 w-1/3" />
                                    <div className="flex gap-4">
                                        <Skeleton.Block className="h-4 w-16" />
                                        <Skeleton.Block className="h-4 w-16" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : error ? (
                        <div className="bg-red-50 border border-red-100 p-8 rounded-[2rem] text-center space-y-4">
                            <p className="text-red-600 font-bold">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-red-600 text-white font-black uppercase tracking-widest px-6 py-2 rounded-xl text-[10px]"
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredAndSortedReports.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl py-20 flex flex-col items-center justify-center text-center space-y-5">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                                {reports.length === 0 ? (
                                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                ) : (
                                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">
                                    {reports.length === 0 ? "No resumes yet" : "No results found"}
                                </h3>
                                <p className="text-sm text-slate-500 mt-2 max-w-xs">
                                    {reports.length === 0
                                        ? "Upload a PDF resume on the Dashboard, choose a target role, and get your ATS score in ~30 seconds."
                                        : "Try a different filter or clear the search."}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    if (reports.length === 0) navigate("/dashboard");
                                    else { setFilter("All"); setSearchTerm(""); }
                                }}
                                className="bg-slate-900 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-slate-700 transition"
                            >
                                {reports.length === 0 ? "Analyze My First Resume →" : "Clear Filters"}
                            </button>
                        </div>
                    ) : (
                        paginatedReports.map(report => (
                            <div key={report.id} className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition group shadow-sm border-l-4 border-l-transparent hover:border-l-indigo-600">
                                <div className="flex items-start gap-6 flex-1 min-w-0">
                                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                                        <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h4 className="text-lg font-black text-gray-900 truncate">
                                                {report.report_name || report.role || "Resume Analysis"}
                                            </h4>
                                            {report.optimized_resume ? (
                                                <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-green-50 text-green-600 border border-green-100">Optimized ✅</span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 border border-gray-100">Not Optimized</span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-1 text-[10px] font-bold text-gray-400">
                                            <p>Uploaded: <span className="text-gray-600">{new Date(report.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</span></p>
                                            <p>Target Role: <span className="text-gray-600 truncate inline-block align-bottom max-w-[120px]">{report.role || "—"}</span></p>
                                            <div className="flex items-center gap-2">
                                                <span>ATS Score:</span>
                                                <ScoreBadge score={report.score} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span>Optimized Score:</span>
                                                <ScoreBadge score={report.optimized_resume?.ats_score_after} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex md:flex-col gap-3 shrink-0">
                                    <button
                                        onClick={() => navigate(`/report/${report.id}`)}
                                        className="flex-1 md:flex-none bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl hover:bg-indigo-600 hover:text-white transition whitespace-nowrap"
                                    >
                                        View Report →
                                    </button>
                                    {report.optimized_resume && (
                                        <button
                                            onClick={() => handleDownload(report.id, report.role)}
                                            disabled={downloadingId === report.id}
                                            className="flex-1 md:flex-none border border-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl hover:bg-gray-50 transition whitespace-nowrap disabled:opacity-50"
                                        >
                                            {downloadingId === report.id ? "Downloading..." : "⬇ Download PDF"}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => confirmDelete(report)}
                                        className="w-12 h-12 md:w-full md:h-auto border border-red-50 text-red-400 hover:bg-red-50 hover:text-red-600 p-3 rounded-2xl transition flex items-center justify-center text-xs"
                                    >
                                        🗑
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* ── SECTION 9: PAGINATION ─────────────────────────────────────────── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-6 pt-10 border-t border-gray-100">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl shadow-sm hover:shadow-md transition disabled:opacity-30 active:scale-95"
                        >
                            ← Previous
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Page <span className="text-indigo-600">{currentPage}</span> of {totalPages}
                        </span>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl shadow-sm hover:shadow-md transition disabled:opacity-30 active:scale-95"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </main>

            {/* ── SECTION 6: DELETE CONFIRMATION MODAL ────────────────────────────── */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete this report?"
                message={`This will permanently delete the analysis for "${reportToDelete?.role || "this role"}". This cannot be undone.`}
                confirmText="Delete Report"
            />

            {/* Background decoration */}
            <div className="fixed top-0 left-0 -z-10 w-[50vw] h-[50vh] bg-indigo-50/50 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2"></div>
            <div className="fixed bottom-0 right-0 -z-10 w-[50vw] h-[50vh] bg-purple-50/50 rounded-full blur-3xl opacity-30 translate-x-1/2 translate-y-1/2"></div>
        </div>
    );
}
