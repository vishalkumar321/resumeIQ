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

// ── Name helpers ────────────────────────────────────────────────────────────
function extractNameFromText(text) {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines.slice(0, 5)) {
    const words = line.split(/\s+/);
    // Name criteria: 2-4 words, no numbers, no special chars, not email/URL
    if (
      words.length >= 2 &&
      words.length <= 4 &&
      line.length < 50 &&
      !line.includes('@') &&
      !line.includes('http') &&
      !line.includes('/') &&
      !line.match(/\d/) &&
      line === line.replace(/[^a-zA-Z\s\-\.]/g, '')
    ) {
      return words
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }
  return null;
}

function cleanCandidateName(name) {
  if (!name) return null;

  // Remove placeholder names
  const placeholders = [
    'candidate name', 'your name', 'full name',
    'candidate', 'name here', 'insert name', '[your name]'
  ];
  if (placeholders.some(p => name.toLowerCase().trim() === p || name.toLowerCase().includes(p))) {
    return null;
  }

  // Fix CamelCase names: "VishalKumar" → "Vishal Kumar"
  const withSpaces = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')       // camelCase → camel Case
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // ABCDef → ABC Def
    .trim();

  // Capitalize each word properly (handles ALL CAPS and all lowercase too)
  const cleaned = withSpaces
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Reject if still looks like a single-word placeholder or too short
  if (cleaned.length < 3) return null;

  return cleaned;
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
  const result = parseAIResponse(text);

  // Ensure score is a valid number
  result.score = Math.round(Math.min(100, Math.max(0, Number(result.score) || 0)));

  return result;
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
  const result = parseAIResponse(text);

  // Ensure scores are valid numbers
  result.score = Math.round(Math.min(100, Math.max(0, Number(result.score) || 0)));
  result.match_score = Math.round(Math.min(100, Math.max(0, Number(result.match_score) || 0)));

  return result;
};

// ── MODE 3: AI Resume Rewriting (ResumeIQ v2) ────────────────────────────────
export const rewriteResume = async (resumeText, targetRole) => {
  const prompt = `
Rewrite the following resume to maximize ATS score for the role: "${targetRole}".

Strict Requirements:
- Rewrite summary with strong professional language.
- Rewrite every experience bullet to quantify achievements (add numbers, %, impact).
- Strengthen weak verbs (e.g., built → engineered, worked on → led, helped → delivered).
- Add ATS-relevant keywords naturally.
- Never invent fake experience or companies.
- Keep information truthful.
- Keep professional formatting.
- CRITICAL INSTRUCTION FOR candidate_name:
  The resume text below starts with the person's real name.
  Look at the very first line of the resume text.
  That is almost always the candidate's full name.
  Extract it exactly as written with proper spaces.
  Do NOT write "Candidate Name", "Your Name", "Full Name", or any placeholder.
  Do NOT make up a name. Do NOT write CamelCase (e.g. "VishalKumar" is WRONG, write "Vishal Kumar").
  Just read the first line of the resume and use that as candidate_name.
  Example: if resume starts with "Vishal Kumar" → candidate_name is "Vishal Kumar"

FORMATTING RULES FOR MAXIMUM ATS SCORE:
1. candidate_name: Extract real name from first line of resume.
   Write it as "First Last" with proper spaces. Never write CamelCase.
2. summary: Write 2-3 sentences. Start with job title. Include years of experience.
   Include 3-4 core technical skills naturally.
   Example: "Full Stack Developer with 3+ years of experience building scalable web applications using React, Node.js, and PostgreSQL."
3. experience bullets: Each bullet must:
   - Start with a strong action verb (Led, Built, Engineered, Delivered, Reduced, Increased, Optimized, Designed, Implemented, Architected)
   - Include a metric or number where possible (%, users, ms, $, x faster)
   - Be one clear sentence.
   - Never start with "Responsible for" or "Helped with".
4. skills: List individual skills as separate array items.
   Format: ["React", "Node.js", "TypeScript"] NOT ["React, Node.js, TypeScript"].
5. keywords_added: Must be actual ATS keywords for the target role. Include both technical and soft skill keywords.
6. All text must be clean English. No symbols except standard punctuation. No asterisks, no markdown, no bullet characters in text.

Return ONLY valid JSON in this exact structure:
{
  "ats_score_before": number,
  "ats_score_after": number,
  "candidate_name": "<first line of the resume — the person's real name>",
  "contact_email": "<email address found anywhere in resume, empty string if not found>",
  "contact_phone": "<phone number found anywhere in resume, empty string if not found>",
  "contact_location": "<city or location found in resume, empty string if not found>",
  "contact_linkedin": "<linkedin URL or profile found in resume, empty string if not found>",
  "target_role": "string",
  "summary": "string",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "duration": "string",
      "bullets": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "year": "string"
    }
  ],
  "skills": ["string"],
  "keywords_added": ["string"],
  "improvements": ["string"]
}

Original Resume Content:
${resumeText}
`.trim();

  console.log("[GROQ] Sending optimize request...");
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: "You are an expert ATS resume optimizer. Always respond with STRICT valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    console.log("[GROQ] Response received, length:", text.length);

    try {
      const result = parseAIResponse(text);

      // Clean and validate candidate_name through our pipeline
      const cleaned = cleanCandidateName(result.candidate_name);
      if (cleaned) {
        result.candidate_name = cleaned;
      } else {
        // Fallback: extract from raw resume text
        const extracted = extractNameFromText(resumeText);
        result.candidate_name = extracted || 'Resume';
      }

      console.log('[GROQ] candidate_name after cleanup:', result.candidate_name);

      return result;
    } catch (parseErr) {
      console.error("[GROQ] JSON Parse Failed. Text sample:", text.slice(0, 200));
      throw parseErr;
    }
  } catch (err) {
    console.error("[GROQ] API Error:", err.message);
    throw err;
  }
};

// ── MODE 4: Tailor Resume for a Specific Job ─────────────────────────────────
export const rewriteResumeForJob = async (resumeText, jobDescription, targetRole) => {
  const nameExtracted = extractNameFromText(resumeText) || 'Resume';
  const prompt = `
You are an expert ATS resume optimizer. Tailor the resume specifically for the job description provided.

Job Description:
${jobDescription.slice(0, 2000)}

Target Role: "${targetRole || 'the role described above'}"

Instructions:
- Extract real candidate name from FIRST LINE of resume. Never write placeholders.
- Fix CamelCase names ("VishalKumar" → "Vishal Kumar").
- Use exact keywords and terminology from the job description.
- Quantify all achievements with numbers/percentages/metrics.
- Strengthen verbs: built→engineered, worked→led, helped→delivered.
- Each skill must be a separate string in the array.
- Add a "company_name" field: extract the hiring company's name from the job description (or empty string).
- Add a "job_match_score" (0-100): how well the tailored resume matches the job.
- Add a "keywords_matched": keywords already in the original resume that appear in the job description.

Return ONLY valid JSON:
{
  "ats_score_before": number,
  "ats_score_after": number,
  "job_match_score": number,
  "candidate_name": "<real name from first line>",
  "contact_email": "<from resume or empty string>",
  "contact_phone": "<from resume or empty string>",
  "contact_location": "<from resume or empty string>",
  "contact_linkedin": "<from resume or empty string>",
  "company_name": "<company from job description or empty string>",
  "target_role": "${targetRole || 'Target Role'}",
  "summary": "<2-3 sentences tailored to the job>",
  "experience": [{"company": string, "role": string, "duration": string, "bullets": ["<verb + achievement + metric>"]}],
  "education": [{"institution": string, "degree": string, "year": string}],
  "skills": ["skill1", "skill2"],
  "keywords_added": ["keyword1"],
  "keywords_matched": ["keyword1"],
  "improvements": ["improvement1"]
}

Original Resume:
${resumeText}
`.trim();

  console.log("[GROQ] Sending job-tailor request...");
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 4000,
      messages: [
        { role: "system", content: "You are an expert ATS resume optimizer. Always respond with STRICT valid JSON only." },
        { role: "user", content: prompt },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? "";
    const result = parseAIResponse(text);
    // Clean name
    const cleaned = cleanCandidateName(result.candidate_name);
    result.candidate_name = cleaned || nameExtracted;
    // Ensure scores are numbers
    result.ats_score_before = Math.round(Math.min(100, Math.max(0, Number(result.ats_score_before) || 0)));
    result.ats_score_after = Math.round(Math.min(100, Math.max(0, Number(result.ats_score_after) || 0)));
    result.job_match_score = Math.round(Math.min(100, Math.max(0, Number(result.job_match_score) || 0)));
    console.log('[GROQ] job-tailor candidate_name:', result.candidate_name);
    return result;
  } catch (err) {
    console.error("[GROQ] job-tailor API Error:", err.message);
    throw err;
  }
};
