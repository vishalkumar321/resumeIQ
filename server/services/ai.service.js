import Groq from "groq-sdk";
import dotenv from "dotenv";
import { buildPrompt, getSystemPrompt, PromptType } from "../utils/promptBuilder.js";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

// ── Shared helpers ─────────────────────────────────────────────────────────

/**
 * Parses AI response text into JSON, stripping markdown fences if present.
 */
function parseAIResponse(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned no valid JSON");
  return JSON.parse(match[0]);
}

/**
 * Robustly executes a chat completion with structured prompts.
 */
async function chat(prompt, temperature = 0.2) {
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature,
      messages: [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: prompt },
      ],
    });
    return completion.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.error("[GROQ] API Error:", error.message);
    throw new Error("AI service unavailable. Please try again later.");
  }
}

// ── Name extraction helpers (Legacy kept for stability) ───────────────────────

function extractNameFromText(text) {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && line.length < 50 &&
        !line.includes('@') && !line.includes('http') && !line.includes('/') &&
        !line.match(/\d/) && line === line.replace(/[^a-zA-Z\s\-\.]/g, '')) {
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }
  return null;
}

function cleanCandidateName(name) {
  if (!name) return null;
  const placeholders = ['candidate name', 'your name', 'full name', 'candidate', 'name here', 'insert name', '[your name]'];
  if (placeholders.some(p => name.toLowerCase().trim() === p || name.toLowerCase().includes(p))) return null;
  const withSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').trim();
  const cleaned = withSpaces.split(' ').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  return cleaned.length < 3 ? null : cleaned;
}

// ── Service Functions ────────────────────────────────────────────────────────

export const analyzeResume = async (resumeText, role) => {
  const prompt = buildPrompt(PromptType.ANALYZE_RESUME, resumeText, role);
  const response = await chat(prompt);
  const result = parseAIResponse(response);
  
  // Post-processing and strict normalization for ATS scoring
  return {
    ...result,
    score: Math.round(Math.min(100, Math.max(0, Number(result.score) || 0))),
    readability_score: Math.round(Math.min(100, Math.max(0, Number(result.readability_score) || 0))),
    keyword_density_score: Math.round(Math.min(100, Math.max(0, Number(result.keyword_density_score) || 0))),
    missing_keywords: Array.isArray(result.missing_keywords) ? result.missing_keywords : [],
    formatting_issues: Array.isArray(result.formatting_issues) ? result.formatting_issues : [],
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    strengths: Array.isArray(result.strengths) ? result.strengths : [],
    weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : []
  };
};

/**
 * Rewrites a resume for maximum impact and ATS optimized.
 */
export const rewriteResume = async (resumeText, targetRole) => {
  const prompt = buildPrompt(PromptType.REWRITE_RESUME, resumeText, targetRole);
  const response = await chat(prompt, 0.4); // higher temp for creative rewriting
  const result = parseAIResponse(response);
  
  // Extract real name if possible
  const nameFromText = extractNameFromText(resumeText);
  result.candidate_name = cleanCandidateName(result.candidate_name) || nameFromText || 'Resume';
  
  // The user expects explicit fields for the modular API
  const optimized_bullet_points = Array.isArray(result.experience) 
    ? result.experience.flatMap(job => job.bullets || []) 
    : [];

  return {
    ...result, // Backward compatible flat properties used by PDF Generator
    improved_resume: {
      summary: result.summary,
      experience: result.experience,
      skills: result.skills
    },
    optimized_bullet_points
  };
};

/**
 * Matches a resume against a specific job description.
 */
export const matchJob = async (resumeText, jobDescription) => {
  const prompt = buildPrompt(PromptType.MATCH_JOB, resumeText, jobDescription);
  const response = await chat(prompt);
  const result = parseAIResponse(response);
  
  result.match_percentage = Math.round(Math.min(100, Math.max(0, Number(result.match_percentage) || 0)));
  
  return result;
};

/**
 * Extracts skills from raw resume text.
 */
export const extractSkills = async (resumeText) => {
  const prompt = buildPrompt(PromptType.EXTRACT_SKILLS, resumeText);
  const response = await chat(prompt);
  return parseAIResponse(response);
};

/**
 * Performs a deep ATS analysis of a resume against a specific JD.
 */
export const analyzeResumeByJD = async (resumeText, jobDescription) => {
  const result = await matchJob(resumeText, jobDescription);
  return {
    ...result,
    score: result.match_percentage || 0,
    match_score: result.match_percentage || 0,
    strengths: result.strengths_alignment || [],
    weaknesses: result.weaknesses_alignment || [],
    suggestions: result.improvement_plan || [],
    missing_keywords: result.missing_skills || []
  };
};

/**
 * Tailors a resume for a specific job description
 */
export const rewriteResumeForJob = async (resumeText, jobDescription, targetRole) => {
  return rewriteResume(`JOB DESCRIPTION:\n${jobDescription}\n\nRESUME:\n${resumeText}`, targetRole);
};
