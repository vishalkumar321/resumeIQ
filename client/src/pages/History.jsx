import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { downloadPDF } from "../services/pdf";

function ScoreBadge({ score }) {
    const color =
        score >= 75 ? "bg-green-100 text-green-700 border-green-200"
            : score >= 50 ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                : "bg-red-100 text-red-700 border-red-200";
    const label = score >= 75 ? "Strong" : score >= 50 ? "Moderate" : "Weak";
    return (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${color}`}>
            {score} — {label}
        </span>
    );
}

function TypeBadge({ type }) {
    return type === "jd" ? (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-indigo-50 border-indigo-200 text-indigo-700">
            JD Match
        </span>
    ) : (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-gray-100 border-gray-200 text-gray-600">
            Role Analysis
        </span>
    );
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
    });
}

/** Inline toast-style error that auto-dismisses or can be closed manually */
function InlineError({ message, onClose }) {
    if (!message) return null;
    return (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span className="flex-1">{message}</span>
            {onClose && (
                <button onClick={onClose} className="shrink-0 text-red-400 hover:text-red-600 font-bold leading-none">×</button>
            )}
        </div>
    );
}

export default function History() {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState(null);
    const [confirmId, setConfirmId] = useState(null);
    const [deleteError, setDeleteError] = useState("");
    const [pdfError, setPdfError] = useState("");

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get("/report/history");
                setReports(res.data.data.reports);
            } catch (err) {
                if (err.response?.status !== 401) {
                    const rawError = err.response?.data?.error;
                    setError(typeof rawError === "object" ? rawError?.message : rawError || "Failed to load report history.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    const handleDelete = async (id) => {
        if (deletingId) return;
        setDeleteError("");
        setDeletingId(id);
        try {
            await api.delete(`/report/${id}`);
            setReports((prev) => prev.filter((r) => r.id !== id));
            setConfirmId(null);
        } catch (err) {
            const rawError = err.response?.data?.error;
            setDeleteError(
                typeof rawError === "object" ? rawError?.message : rawError || "Delete failed. Please try again."
            );
            setConfirmId(null);
        } finally {
            setDeletingId(null);
        }
    };

    const handlePDFDownload = async (report) => {
        setPdfError("");
        try {
            const slug = (report.role ?? "jd-match").toLowerCase().replace(/\s+/g, "-");
            await downloadPDF(report.id, `resumeiq-${slug}-report.pdf`);
        } catch {
            setPdfError("PDF download failed. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
                <button onClick={() => navigate("/")} className="text-xl font-bold tracking-tight text-gray-900 hover:opacity-80 transition">
                    Resume<span className="text-indigo-600">IQ</span>
                </button>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate("/")} className="text-sm text-gray-500 hover:text-gray-800 transition">← Dashboard</button>
                    <button onClick={handleLogout} className="text-sm bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-100 transition">Logout</button>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Report History</h2>
                    <p className="text-sm text-gray-400 mt-1">All past analyses, newest first.</p>
                </div>

                {/* Global inline errors */}
                <InlineError message={deleteError} onClose={() => setDeleteError("")} />
                <InlineError message={pdfError} onClose={() => setPdfError("")} />

                {loading && (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                    </div>
                )}

                {!loading && error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
                )}

                {!loading && !error && reports.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
                        <span className="text-5xl">📄</span>
                        <p className="text-gray-500 font-medium">No reports yet.</p>
                        <p className="text-gray-400 text-sm">Upload a resume and generate your first report.</p>
                        <button onClick={() => navigate("/")} className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2 rounded-lg transition">
                            Go to Dashboard
                        </button>
                    </div>
                )}

                {!loading && !error && reports.length > 0 && (
                    <ul className="space-y-3">
                        {reports.map((report) => (
                            <li key={report.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                {/* Card row — clickable area */}
                                <button
                                    onClick={() => navigate(`/report/${report.id}`)}
                                    className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors group"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="space-y-1 min-w-0">
                                            <p className="font-semibold text-gray-800 truncate group-hover:text-indigo-600 transition-colors">
                                                {report.analysis_type === "jd" ? "JD Match Analysis" : report.role}
                                            </p>
                                            <p className="text-xs text-gray-400">{formatDate(report.created_at)}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <TypeBadge type={report.analysis_type} />
                                            <ScoreBadge score={report.score} />
                                            <span className="text-gray-300 group-hover:text-indigo-400 transition-colors text-lg">→</span>
                                        </div>
                                    </div>
                                    {report.analysis_type === "jd" && report.match_score != null && (
                                        <p className="mt-1.5 text-xs text-gray-400">
                                            JD Match: <span className={`font-medium ${report.match_score >= 75 ? "text-green-600" : report.match_score >= 50 ? "text-yellow-500" : "text-red-500"}`}>{report.match_score}</span>
                                        </p>
                                    )}
                                </button>

                                {/* Actions row */}
                                <div className="border-t border-gray-100 px-5 py-2.5 flex items-center justify-between gap-3">
                                    {confirmId === report.id ? (
                                        <div className="flex items-center gap-3 flex-1">
                                            <span className="text-xs text-red-600 font-medium flex-1">Delete permanently?</span>
                                            <button
                                                onClick={() => setConfirmId(null)}
                                                className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1 rounded-lg transition"
                                            >Cancel</button>
                                            <button
                                                onClick={() => handleDelete(report.id)}
                                                disabled={deletingId === report.id}
                                                className="text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg transition"
                                            >
                                                {deletingId === report.id ? "Deleting…" : "Yes, Delete"}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmId(report.id); }}
                                            className="text-xs text-gray-400 hover:text-red-500 transition"
                                        >
                                            🗑 Delete
                                        </button>
                                    )}

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePDFDownload(report); }}
                                        className="text-xs text-gray-400 hover:text-gray-700 transition ml-auto"
                                    >
                                        ⬇ PDF
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
}
