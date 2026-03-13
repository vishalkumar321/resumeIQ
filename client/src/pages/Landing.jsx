import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate("/dashboard", { replace: true });
        }
    }, [user, navigate]);

    // Scroll listener for Navbar
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // ── Components ──────────────────────────────────────────────────────────────

    const FeatureCard = ({ title, body }) => (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <h4 className="text-base font-semibold text-[#0f172a] mb-3">{title}</h4>
            <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
        </div>
    );

    const Step = ({ number, title, body }) => (
        <div className="flex flex-col items-center text-center space-y-4 group">
            <div className="relative">
                <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-2xl font-bold text-slate-300 group-hover:bg-white group-hover:border-slate-300 transition duration-300">
                    {number}
                </div>
            </div>
            <h4 className="text-xl font-bold text-[#0f172a] pt-2">{title}</h4>
            <p className="text-slate-600 text-sm leading-relaxed max-w-[240px]">{body}</p>
        </div>
    );

    // ── Score Counter Animation ─────────────────────────────────────────────
    const [score, setScore] = useState(61);
    useEffect(() => {
        const interval = setInterval(() => {
            setScore(prev => {
                if (prev >= 92) {
                    clearInterval(interval);
                    return 92;
                }
                return prev + 1;
            });
        }, 50);
        return () => clearInterval(interval);
    }, []);

    // ── Stats Counter Logic ─────────────────────────────────────────────────
    const [statsInView, setStatsInView] = useState(false);
    const statsRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setStatsInView(true);
            }
        }, { threshold: 0.1 });

        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    const AnimatedStat = ({ endValue, label, suffix = "" }) => {
        const [value, setValue] = useState(0);
        useEffect(() => {
            if (!statsInView) return;
            let start = 0;
            const duration = 2000;
            const increment = endValue / (duration / 20);

            const timer = setInterval(() => {
                start += increment;
                if (start >= endValue) {
                    setValue(endValue);
                    clearInterval(timer);
                } else {
                    setValue(Math.floor(start));
                }
            }, 20);
            return () => clearInterval(timer);
        }, [statsInView, endValue]);

        return (
            <div className="text-center space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                    {value}{suffix}
                </div>
                <div className="text-sm font-medium text-slate-400">
                    {label}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800 selection:bg-indigo-100 selection:text-indigo-900">

            {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 px-6 py-4 ${isScrolled ? "bg-white/90 backdrop-blur-md border-b border-slate-200" : "bg-transparent"}`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link to="/" className="text-xl tracking-tighter flex items-center">
                        <span className="font-bold text-slate-900">Resume</span><span className="font-extrabold text-indigo-600">IQ</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/login" className="text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-md transition">Login</Link>
                        <Link to="/signup" className="bg-[#111827] hover:bg-[#1e293b] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150">
                            Get Started
                        </Link>
                    </div>

                    {/* Mobile Toggle */}
                    <button className="md:hidden text-2xl" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? "×" : "☰"}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 bg-white z-[110] p-10 flex flex-col items-center justify-center space-y-10 animate-in slide-in-from-top duration-500">
                        <button className="absolute top-6 right-6 text-4xl" onClick={() => setIsMobileMenuOpen(false)}>×</button>
                        <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-bold text-[#0f172a]">Home</Link>
                        <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-bold text-[#0f172a]">Login</Link>
                        <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="bg-[#111827] text-white px-8 py-4 rounded-xl text-lg font-medium">Get Started</Link>
                    </div>
                )}
            </nav>

            {/* ── HERO SECTION ──────────────────────────────────────────────────── */}
            <section className="relative min-h-screen flex items-center justify-center pt-20 px-6 overflow-hidden bg-[#f8fafc]">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full max-h-4xl bg-indigo-100/50 rounded-full blur-[120px]"></div>
                </div>

                <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
                    <div className="inline-flex items-center bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold uppercase tracking-widest text-[#0f172a] flex items-center gap-2">
                            <span className="animate-pulse">✨</span> AI Resume Optimizer
                        </span>
                    </div>

                    <h1 className="text-5xl md:text-7xl tracking-tight leading-[1.1]">
                        <span className="font-normal text-slate-700">Your resume is getting</span><br />
                        <span className="font-extrabold text-[#0f172a]">filtered out. Let's fix that.</span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 leading-relaxed">
                        Most resumes never reach a human. ATS systems reject them automatically. ResumeIQ rewrites your resume so it actually gets through.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link to="/signup" className="w-full sm:w-auto bg-[#111827] hover:bg-[#1e293b] text-white px-6 py-3 rounded-lg text-base font-semibold transition-all duration-150">
                            Check My Resume
                        </Link>
                        <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 px-6 py-3 rounded-lg font-medium text-base shadow-sm transition-all duration-150">
                            See How It Works
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 font-medium pt-2">
                        <span>Used by 10,000+ job seekers. No account needed to try.</span>
                    </div>

                    {/* Animated Score Card */}
                    <div className="relative pt-10">
                        <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 max-w-sm mx-auto transform -rotate-2 hover:rotate-0 transition duration-500 text-left space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">📄</span>
                                    <span className="text-sm font-semibold text-[#0f172a]">vishal_resume.pdf</span>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                                    <span>ATS Score</span>
                                    <span className="text-[#0f172a]">{score}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div className="h-full bg-[#111827] transition-all duration-50" style={{ width: `${score}%` }}></div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#16a34a]">
                                    <span>✓</span> 8 keywords added
                                </div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#16a34a]">
                                    <span>✓</span> 3 sections rewritten
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
            <section id="how-it-works" className="py-24 px-6 bg-white border-y border-slate-100">
                <div className="max-w-6xl mx-auto space-y-16">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">How ResumeIQ Works</h2>
                        <p className="text-slate-500 font-medium max-w-md mx-auto">Three simple steps to a job-ready resume.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                        <Step
                            number="1"
                            title="Upload Your Resume"
                            body="Drop your PDF resume. We extract and analyze every section instantly."
                        />
                        <Step
                            number="2"
                            title="AI Rewrites It"
                            body="Our AI rewrites your resume with stronger language, keywords, and quantified achievements."
                        />
                        <Step
                            number="3"
                            title="Download & Apply"
                            body="Download your optimized PDF resume and start applying with confidence."
                        />
                    </div>
                </div>
            </section>

            {/* ── FEATURES SECTION ──────────────────────────────────────────────── */}
            <section className="py-24 px-6 bg-[#f8fafc]">
                <div className="max-w-6xl mx-auto space-y-16">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">Everything You Need to Get Hired</h2>
                        <p className="text-slate-500 font-medium max-w-md mx-auto">ResumeIQ is the only tool you need in your job search.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard
                            title="ATS Score Analysis"
                            body="Get your exact ATS score with detailed breakdown of strengths and weaknesses."
                        />
                        <FeatureCard
                            title="AI Resume Rewriter"
                            body="AI rewrites every section — summary, experience, skills — with stronger language."
                        />
                        <FeatureCard
                            title="Before & After"
                            body="See exactly what changed side by side. Copy any improved section instantly."
                        />
                        <FeatureCard
                            title="PDF Download"
                            body="Download a professionally formatted optimized resume PDF ready to send."
                        />
                        <FeatureCard
                            title="Job Matching"
                            body="Get matched job links on LinkedIn, Indeed, Glassdoor and more."
                        />
                        <FeatureCard
                            title="Career Pulse"
                            body="Track your ATS score improvement over time with visual charts."
                        />
                    </div>
                </div>
            </section>

            {/* ── STATS SECTION ─────────────────────────────────────────────────── */}
            <section ref={statsRef} className="py-24 px-6 bg-slate-900 text-white overflow-hidden relative">
                <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 group">
                    <AnimatedStat endValue={10000} suffix="+" label="Resumes Analyzed" />
                    <AnimatedStat endValue={92} suffix="%" label="Average ATS Score" />
                    <AnimatedStat endValue={30} suffix="s" label="Analysis Time" />
                    <AnimatedStat endValue={3} suffix="x" label="More Interviews" />
                </div>
            </section>

            {/* ── FINAL CTA SECTION ─────────────────────────────────────────────── */}
            <section className="py-24 px-6 bg-white border-b border-slate-100">
                <div className="max-w-4xl mx-auto text-center space-y-10">
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#0f172a] leading-tight">Ready to land <br /> more interviews?</h2>
                    <p className="text-slate-500 font-medium max-w-lg mx-auto text-lg leading-relaxed">Join thousands of job seekers who optimized their resume with ResumeIQ.</p>

                    <div className="pt-4 flex justify-center">
                        <Link to="/signup" className="bg-[#111827] hover:bg-[#1e293b] text-white px-8 py-4 rounded-lg text-base font-semibold transition-all duration-150 inline-block shadow-sm">
                            Get Started
                        </Link>
                    </div>

                    <p className="text-slate-500 font-medium text-sm">
                        Already have an account? <Link to="/login" className="text-[#0f172a] font-semibold underline hover:text-indigo-600 transition">Login</Link>
                    </p>
                </div>
            </section>

            {/* ── FOOTER ────────────────────────────────────────────────────────── */}
            <footer className="bg-[#0f172a] text-white py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center md:text-left">
                        <Link to="/" className="text-2xl tracking-tighter flex items-center justify-center md:justify-start">
                            <span className="font-bold text-white">Resume</span><span className="font-extrabold text-indigo-500">IQ</span>
                        </Link>
                        <p className="text-slate-400 text-sm">
                            Built by a developer who got tired of resume rejections.
                        </p>
                    </div>

                    <div className="flex flex-col items-center md:items-end space-y-2">
                        <a href="https://github.com/vishalkumar321/resumeIQ" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition text-sm font-medium">
                            GitHub
                        </a>
                        <p className="text-xs text-slate-500">© 2024 ResumeIQ</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
