import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import UploadBox from "../components/UploadBox";
import { downloadPDF } from "../services/pdf";

const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "Machine Learning Engineer",
  "DevOps / Cloud Engineer",
  "Mobile Developer",
  "UI / UX Designer",
  "Product Manager",
  "QA / Test Engineer",
  "Cybersecurity Analyst",
  "Business Analyst",
];

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

// ── Mode Toggle ────────────────────────────────────────────────────────────
function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      {[
        { value: "role", label: "🎯 Role Analysis" },
        { value: "jd", label: "📋 JD Match" },
      ].map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`flex-1 py-2 text-sm font-medium transition ${mode === value
            ? "bg-indigo-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  const [step, setStep] = useState("upload");
  const [resume, setResume] = useState(null);
  const [mode, setMode] = useState("role");
  const [role, setRole] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const handleUploaded = (uploadedResume) => {
    setResume(uploadedResume);
    setStep("configure");
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

  const handleGenerate = async () => {
    setError("");

    // client-side validation
    if (mode === "role" && !role) {
      setError("Please select a target role.");
      return;
    }
    if (mode === "jd" && jobDesc.trim().length < 100) {
      setError("Please paste a job description (at least 100 characters).");
      return;
    }

    setStep("loading");

    try {
      const payload = {
        resume_id: resume.id,
        mode,
        ...(mode === "role" ? { role } : { job_description: jobDesc.trim() }),
      };

      const res = await api.post("/report/generate", payload);
      setReport(res.data.data.report);
      setStep("result");
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Report generation failed. Please try again.";
      setError(msg);
      setStep("configure");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleReset = () => {
    setStep("upload");
    setResume(null);
    setMode("role");
    setRole("");
    setJobDesc("");
    setReport(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Resume<span className="text-indigo-600">IQ</span>
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/history")}
            className="text-sm text-gray-500 hover:text-gray-800 transition"
          >
            History
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="text-sm text-gray-500 hover:text-gray-800 transition"
          >
            Settings
          </button>
          {step === "result" && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-800 transition"
            >
              ← New Analysis
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-sm bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-100 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* STEP 1: Upload */}
        {step === "upload" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Upload Your Resume</h2>
              <p className="text-gray-500 text-sm mt-1">PDF only · Max 5 MB · Text-based (not scanned)</p>
            </div>
            <UploadBox onUploaded={handleUploaded} />
          </section>
        )}

        {/* STEP 2: Configure */}
        {step === "configure" && (
          <section className="bg-white border rounded-xl p-6 shadow-sm space-y-5">
            {/* Upload success */}
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-green-600 text-lg">✔</span>
              <div>
                <p className="text-sm font-medium text-green-800">Resume uploaded</p>
                <p className="text-xs text-green-600 truncate max-w-xs">
                  {resume?.file_path?.split("/").pop()}
                </p>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Analysis Mode</label>
              <ModeToggle mode={mode} onChange={(m) => { setMode(m); setError(""); }} />
            </div>

            {/* Role mode */}
            {mode === "role" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Target Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Select a role…</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {/* JD mode */}
            {mode === "jd" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Job Description
                </label>
                <textarea
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  rows={8}
                  placeholder="Paste the full job description here…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
                <p className={`text-xs text-right ${jobDesc.trim().length < 100 ? "text-red-400" : "text-gray-400"}`}>
                  {jobDesc.trim().length} / 100 min chars
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleGenerate}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition text-sm"
            >
              Generate AI Report
            </button>
          </section>
        )}

        {/* STEP 3: Loading */}
        {step === "loading" && (
          <section className="flex flex-col items-center justify-center py-24 space-y-5">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            <div className="text-center">
              <p className="text-gray-700 font-medium">
                {mode === "jd" ? "Matching resume to job description…" : "Analyzing your resume…"}
              </p>
              <p className="text-gray-400 text-sm mt-1">This usually takes 10–20 seconds</p>
            </div>
          </section>
        )}

        {/* STEP 4: Result */}
        {step === "result" && report && (
          <section className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Analysis Report</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {report.analysis_type === "jd"
                    ? "JD Match Analysis"
                    : `Role: ${report.role}`}
                </p>
              </div>
              {/* Analysis type badge */}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${report.analysis_type === "jd"
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-gray-100 border-gray-200 text-gray-600"
                }`}>
                {report.analysis_type === "jd" ? "JD Match" : "Role Analysis"}
              </span>
            </div>

            {/* Scores row */}
            <div className={`grid gap-4 ${report.analysis_type === "jd" ? "grid-cols-2" : "grid-cols-1"}`}>
              {/* ATS Score */}
              <div className={`border rounded-xl p-5 ${scoreBg(report.score)}`}>
                <p className="text-xs uppercase tracking-widest text-gray-500 font-medium mb-1">
                  ATS Score
                </p>
                <p className={`text-5xl font-extrabold leading-none ${scoreColor(report.score)}`}>
                  {report.score}
                </p>
                <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${report.score >= 75 ? "bg-green-500" : report.score >= 50 ? "bg-yellow-400" : "bg-red-500"}`}
                    style={{ width: `${report.score}%` }}
                  />
                </div>
              </div>

              {/* Match Score (JD mode only) */}
              {report.analysis_type === "jd" && (
                <div className={`border rounded-xl p-5 ${scoreBg(report.match_score)}`}>
                  <p className="text-xs uppercase tracking-widest text-gray-500 font-medium mb-1">
                    JD Match Score
                  </p>
                  <p className={`text-5xl font-extrabold leading-none ${scoreColor(report.match_score)}`}>
                    {report.match_score}
                  </p>
                  <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${report.match_score >= 75 ? "bg-green-500" : report.match_score >= 50 ? "bg-yellow-400" : "bg-red-500"}`}
                      style={{ width: `${report.match_score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Missing Keywords (JD mode only) */}
            {report.analysis_type === "jd" && report.missing_keywords?.length > 0 && (
              <div className="border border-orange-200 bg-orange-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>🔍</span> Missing Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {report.missing_keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="bg-white border border-orange-200 text-orange-700 text-xs px-2.5 py-1 rounded-full"
                    >
                      {kw}
                    </span>
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
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Analyze Another Resume
                </button>
                <button
                  onClick={() => navigate("/history")}
                  className="flex-1 border border-indigo-200 text-indigo-600 py-2.5 rounded-lg text-sm hover:bg-indigo-50 transition"
                >
                  View History
                </button>
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
            </div>
          </section>
        )}
      </main>
    </div>
  );
}