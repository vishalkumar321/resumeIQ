import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";

export default function JobMatch() {
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [fetchingResumes, setFetchingResumes] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        setFetchingResumes(true);
        // We'll use reports history to find unique uploaded resumes
        const { data } = await api.get("/report/history");
        const uniqueResumes = Array.from(new Map(data.data.reports.map(r => [r.resume_id, { id: r.resume_id, name: r.report_name || "Resume", date: r.created_at }])).values());
        setResumes(uniqueResumes);
        if (uniqueResumes.length > 0) {
          setSelectedResumeId(uniqueResumes[0].id);
        }
      } catch (err) {
        console.error("Error fetching resumes:", err);
      } finally {
        setFetchingResumes(false);
      }
    };
    fetchResumes();
  }, []);

  const handleMatch = async (e) => {
    e.preventDefault();
    if (!selectedResumeId || !jobDescription) {
      setError("Please select a resume and paste a job description.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        resumeId: selectedResumeId,
        jobTitle: jobTitle || "Untitled Job",
        jobDescription: jobDescription,
        jobSource: "manual"
      };

      const response = await api.post("/job/match", payload);
      setResult(response.data.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to analyze job match. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Column: Input Form */}
        <section className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm h-fit">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Job Match Engine</h1>
          <p className="text-sm text-slate-500 mb-8">
            Select a previously uploaded resume and see how well it matches a specific job description.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleMatch} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                1. Select Resume
              </label>
              {fetchingResumes ? (
                <div className="animate-pulse bg-slate-100 h-10 w-full rounded-lg"></div>
              ) : resumes.length === 0 ? (
                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  No resumes found. Please <Link to="/dashboard" className="underline font-bold">upload a resume</Link> first.
                </div>
              ) : (
                <select 
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {resumes.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({new Date(r.date).toLocaleDateString()})</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                2. Job Title
              </label>
              <input 
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                3. Job Description
              </label>
              <textarea 
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={10}
                placeholder="Paste the full job description here..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading || resumes.length === 0}
              className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all flex items-center justify-center ${loading || resumes.length === 0 ? "bg-slate-300 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800 shadow-md transform hover:-translate-y-0.5"}`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Analyzing Match...
                </div>
              ) : "Calculate Match"}
            </button>
          </form>
        </section>

        {/* Right Column: Results */}
        <section>
          {result ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center pb-8 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-500 uppercase tracking-widest mb-4">Match Score</h2>
                <div className={`mx-auto w-32 h-32 flex items-center justify-center rounded-full border-4 text-4xl font-black ${getScoreColor(result.match_percentage)}`}>
                  {result.match_percentage}%
                </div>
              </div>

              {result.missing_skills && result.missing_skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Missing Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.missing_skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.matched_skills && result.matched_skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-green-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Matched Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.matched_skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.strengths_alignment && result.strengths_alignment.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3">Strong Points</h3>
                  <ul className="space-y-2">
                    {result.strengths_alignment.map((strength, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-700">
                        <span className="text-indigo-500 font-bold">•</span> {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.improvement_plan && result.improvement_plan.length > 0 && (
                <div className="pt-8 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Improvement Plan</h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                    {result.improvement_plan.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="bg-white w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                          {i + 1}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-full min-h-[400px] flex items-center justify-center text-slate-400 font-medium">
              Run an analysis to see your match results here.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
