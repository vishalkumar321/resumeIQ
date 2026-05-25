import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";

export default function ResumeRewriter() {
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleRewrite = async (e) => {
    e.preventDefault();
    if (!resumeText || !targetRole) {
      setError("Please paste a resume and a target role.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        resumeText: resumeText,
        targetRole: targetRole,
      };

      const response = await api.post("/ai/rewrite", payload);
      setResult(response.data.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to rewrite resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Column: Input Form */}
        <section className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm h-fit">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Resume Rewriter</h1>
          <p className="text-sm text-slate-500 mb-8">
            Paste your raw resume text and let AI rewrite it with strong action verbs and ATS-optimized formatting targeting a specific role.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleRewrite} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                1. Target Role
              </label>
              <input 
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Product Manager"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                2. Raw Resume Text
              </label>
              <textarea 
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={12}
                placeholder="Paste your full resume text here..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all flex items-center justify-center ${loading ? "bg-slate-300 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800 shadow-md transform hover:-translate-y-0.5"}`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Rewriting Resume...
                </div>
              ) : "Rewrite Resume"}
            </button>
          </form>
        </section>

        {/* Right Column: Results */}
        <section>
          {result ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{result.candidate_name || "Optimized Resume"}</h2>
                  <p className="text-sm font-semibold text-indigo-600">{targetRole}</p>
                </div>
              </div>

              {result.improved_resume?.summary && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Professional Summary</h3>
                  <div className="group relative bg-[#f8fafc] border border-slate-200 rounded-lg p-4 text-sm text-slate-700 leading-relaxed">
                    {result.improved_resume.summary}
                    <button 
                      onClick={() => handleCopy(result.improved_resume.summary)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white p-1.5 rounded-md shadow outline-none text-slate-400 hover:text-slate-900 transition-opacity"
                      title="Copy Summary"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                </div>
              )}

              {result.improved_resume?.experience && result.improved_resume.experience.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Optimized Experience</h3>
                  <div className="space-y-6">
                    {result.improved_resume.experience.map((job, idx) => (
                      <div key={idx} className="relative group bg-[#f8fafc] border border-slate-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{job.role || job.title}</p>
                            <p className="text-xs font-semibold text-indigo-600 mb-2">{job.company}</p>
                          </div>
                          <span className="text-xs font-semibold text-slate-400 bg-white px-2 py-1 rounded border border-slate-100">{job.duration || "Present"}</span>
                        </div>
                        <ul className="space-y-2">
                          {job.bullets.map((b, bIdx) => (
                            <li key={bIdx} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                              <span className="text-indigo-400 font-bold">•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                        <button 
                          onClick={() => handleCopy(job.bullets.join("\n"))}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white p-1.5 rounded-md shadow border border-slate-100 outline-none text-slate-400 hover:text-slate-900 transition-opacity"
                          title="Copy Bullets"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.improved_resume?.skills && result.improved_resume.skills.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Optimized Skills</h3>
                  <div className="flex flex-wrap gap-2 relative group">
                     {result.improved_resume.skills.map((s, i) => (
                       <span key={i} className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-full">
                         {s}
                       </span>
                     ))}
                     <button 
                      onClick={() => handleCopy(result.improved_resume.skills.join(", "))}
                      className="absolute -top-10 right-0 opacity-0 group-hover:opacity-100 bg-white p-1.5 rounded-md shadow border border-slate-100 outline-none text-slate-400 hover:text-slate-900 transition-opacity"
                      title="Copy Skills"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-full min-h-[400px] flex items-center justify-center text-slate-400 font-medium">
              Your optimized resume will appear here.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
