import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "llama-3.3-70b-versatile"; // best free model on Groq

// ── Shared helpers ─────────────────────────────────────────────────────────
function parseAIResponse(text) {
  // Strip markdown code fences if the model wraps JSON in ```json ... ```
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned no valid JSON");
  return JSON.parse(match[0]);
}

async function chat(prompt) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.2,  // low temperature = more deterministic JSON output
    messages: [
      {
        role: "system",
        content: "You are an expert ATS resume analyzer. Always respond with STRICT valid JSON only — no markdown, no explanation, no code fences.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

// ── MODE 1: Role-based analysis ─────────────────────────────────────────────
export const analyzeResume = async (resumeText, role) => {
  const prompt = `
Analyze the following resume for the role: "${role}"

Return STRICT JSON only:

{
  "score": <integer 0-100, overall ATS fit score>,
  "strengths": [<3-5 specific strengths as strings>],
  "weaknesses": [<3-5 specific weaknesses as strings>],
  "suggestions": [<5 actionable improvement suggestions as strings>]
}

Resume:
${resumeText}
`.trim();

  const text = await chat(prompt);
  return parseAIResponse(text);
};

// ── MODE 2: Job Description match analysis ──────────────────────────────────
export const analyzeResumeByJD = async (resumeText, jobDescription) => {
  const prompt = `
Compare the following resume against the provided job description.

Step 1 — Extract all required technical skills, tools, and qualifications from the Job Description.
Step 2 — Identify which of those appear in the resume and which are missing.
Step 3 — Compute a match_score (0-100) based on how well the resume covers the JD requirements.
Step 4 — Compute an overall ATS score (0-100) for general resume quality.

Return STRICT JSON only:

{
  "score": <integer 0-100, overall ATS quality score>,
  "match_score": <integer 0-100, JD keyword/requirements match score>,
  "strengths": [<3-5 strengths that align with the JD>],
  "weaknesses": [<3-5 gaps compared to the JD>],
  "suggestions": [<5 actionable improvements to better match the JD>],
  "missing_keywords": [<list of important JD keywords/skills missing from resume>]
}

Job Description:
${jobDescription}

Resume:
${resumeText}
`.trim();

  const text = await chat(prompt);
  return parseAIResponse(text);
};