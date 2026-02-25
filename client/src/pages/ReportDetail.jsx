import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { downloadPDF } from "../services/pdf";

function scoreColor(score) {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
}

function scoreBg(score) {
    if (score >= 75) return "bg-green-50 border-green-200";
    if (score >= 50) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function SectionCard({ title, items, icon, color }) {
    return (
        <div className={`border rounded-lg p-5 ${color}`}>
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span>{icon}</span> {title}
            </h3>
            <ul className="space-y-2">
                {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-0.5 shrink-0">•</span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function ReportDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get(`/report/${id}`);
                setReport(res.data.data.report);
            } catch (err) {
                if (err.response?.status !== 401) {
                    setError(err.response?.data?.message || "Failed to load report.");
                }
            } finally {
                setLoading(false);
            }
        };
        if (id) fetch();
    }, [id]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    const handleDownloadPDF = async () => {
        if (!report?.id || pdfLoading) return;
        setPdfLoading(true);
        setPdfError("");
        try {
            const slug = (report.role ?? "jd-match").toLowerCase().replace(/\s+/g, "-");
            await downloadPDF(report.id, `resumeiq-${slug}-report.pdf`);
        } catch {
            setPdfError("PDF download failed. Please try again.");
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!report?.id || deleteLoading) return;
        setDeleteLoading(true);
        setDeleteError("");
        try {
            await api.delete(`/report/${report.id}`);
            navigate("/history");
        } catch (err) {
            const rawError = err.response?.data?.error;
            setDeleteError(
                typeof rawError === "object" ? rawError?.message : rawError || "Failed to delete report. Please try again."
            );
            setConfirmDelete(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    const isJD = report?.analysis_type === "jd";

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
                <button onClick={() => navigate("/")} className="text-xl font-bold tracking-tight text-gray-900 hover:opacity-80 transition">
                    Resume<span className="text-indigo-600">IQ</span>
                </button>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate("/history")} className="text-sm text-gray-500 hover:text-gray-800 transition">← History</button>
                    <button onClick={handleLogout} className="text-sm bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-100 transition">Logout</button>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
                {loading && (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                    </div>
                )}

                {!loading && error && (
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
                        <button onClick={() => navigate("/history")} className="text-sm text-indigo-600 hover:underline">← Back to history</button>
                    </div>
                )}

                {!loading && !error && report && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {isJD ? "JD Match Report" : report.role}
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">Generated on {formatDate(report.created_at)}</p>
                            </div>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${isJD ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-gray-100 border-gray-200 text-gray-600"}`}>
                                {isJD ? "JD Match" : "Role Analysis"}
                            </span>
                        </div>

                        {/* Score cards */}
                        <div className={`grid gap-4 ${isJD ? "grid-cols-2" : "grid-cols-1"}`}>
                            <div className={`border rounded-xl p-5 ${scoreBg(report.score)}`}>
                                <p className="text-xs uppercase tracking-widest text-gray-500 font-medium mb-1">ATS Score</p>
                                <p className={`text-5xl font-extrabold leading-none ${scoreColor(report.score)}`}>{report.score}</p>
                                <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${report.score >= 75 ? "bg-green-500" : report.score >= 50 ? "bg-yellow-400" : "bg-red-500"}`} style={{ width: `${report.score}%` }} />
                                </div>
                            </div>

                            {isJD && (
                                <div className={`border rounded-xl p-5 ${scoreBg(report.match_score)}`}>
                                    <p className="text-xs uppercase tracking-widest text-gray-500 font-medium mb-1">JD Match Score</p>
                                    <p className={`text-5xl font-extrabold leading-none ${scoreColor(report.match_score)}`}>{report.match_score}</p>
                                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${report.match_score >= 75 ? "bg-green-500" : report.match_score >= 50 ? "bg-yellow-400" : "bg-red-500"}`} style={{ width: `${report.match_score}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Missing Keywords (JD only) */}
                        {isJD && report.missing_keywords?.length > 0 && (
                            <div className="border border-orange-200 bg-orange-50 rounded-lg p-5">
                                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <span>🔍</span> Missing Keywords
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {report.missing_keywords.map((kw, i) => (
                                        <span key={i} className="bg-white border border-orange-200 text-orange-700 text-xs px-2.5 py-1 rounded-full">{kw}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Standard sections */}
                        <div className="grid gap-4">
                            <SectionCard title="Strengths" items={report.strengths} icon="💪" color="bg-green-50 border-green-200" />
                            <SectionCard title="Weaknesses" items={report.weaknesses} icon="⚠️" color="bg-yellow-50 border-yellow-200" />
                            <SectionCard title="Suggestions" items={report.suggestions} icon="✏️" color="bg-blue-50 border-blue-200" />
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            {pdfError && (
                                <p className="text-xs text-red-600 text-center">{pdfError}</p>
                            )}
                            {deleteError && (
                                <p className="text-xs text-red-600 text-center">{deleteError}</p>
                            )}
                            <div className="flex gap-3">
                                <button onClick={() => navigate("/history")} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-100 transition">← Back to History</button>
                                <button onClick={() => navigate("/")} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm transition">New Analysis</button>
                            </div>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={pdfLoading}
                                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition"
                            >
                                {pdfLoading ? (
                                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Generating PDF…</>
                                ) : (
                                    <>⬇ Download PDF Report</>
                                )}
                            </button>

                            {/* Delete section */}
                            {!confirmDelete ? (
                                <button
                                    onClick={() => setConfirmDelete(true)}
                                    className="w-full text-sm text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 py-2.5 rounded-lg transition"
                                >
                                    🗑 Delete Report
                                </button>
                            ) : (
                                <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
                                    <p className="text-sm text-red-700 font-medium text-center">Delete this report permanently?</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setConfirmDelete(false)}
                                            className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
                                        >Cancel</button>
                                        <button
                                            onClick={handleDelete}
                                            disabled={deleteLoading}
                                            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
                                        >
                                            {deleteLoading ? "Deleting…" : "Yes, Delete"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
