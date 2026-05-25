/**
 * Prompt Builder Utility
 * Centralizes all AI prompts for ResumeIQ.
 * Ensures structured JSON output and consistent behavior.
 */

export const PromptType = {
  ANALYZE_RESUME: 'ANALYZE_RESUME',
  REWRITE_RESUME: 'REWRITE_RESUME',
  MATCH_JOB: 'MATCH_JOB',
  EXTRACT_SKILLS: 'EXTRACT_SKILLS',
};

const SYSTEM_PROMPT = `You are a high-end ATS (Applicant Tracking System) simulation and resume optimization expert. 
Your goal is to provide deep, actionable insights to help candidates pass human-like and machine-like filters.
Always respond with STRICT valid JSON only. No explanations, no markdown fences, no preamble.`;

const TEMPLATES = {
  [PromptType.ANALYZE_RESUME]: (resumeText, role) => `
    Analyze the following resume for the target role: "${role}".
    Provide a professional ATS report reflecting real-world hiring standards.
    
    Return STRICT JSON:
    {
      "score": <0-100>,                          -- Overall ATS suitability score
      "readability_score" <0-100>,              -- How clear/accessible the text is
      "keyword_density_score": <0-100>,         -- How well it uses relevant industry keywords
      "strengths": ["string"],                  -- 3-5 key professional strengths
      "weaknesses": ["string"],                 -- 3-5 critical areas for improvement
      "formatting_issues": ["string"],          -- E.g. "Missing contact info", "Inconsistent dates"
      "suggestions": ["string"],                -- Specific actionable items to improve the score
      "missing_keywords": ["string"]            -- Important keywords/skills the candidate should add
    }

    Resume:
    ${resumeText}
  `,

  [PromptType.REWRITE_RESUME]: (resumeText, targetRole) => `
    Rewrite the following resume to maximize its impact for the role: "${targetRole}".
    
    Rules:
    - Transform weak verbs into strong action verbs (e.g., 'helped' -> 'orchestrated').
    - Quantify achievements (add percentages, numbers, timeframes).
    - Maintain 100% truthfulness; do not invent credentials.
    - Standardize formatting for PDF extraction.

    Return STRICT JSON:
    {
      "ats_score_before": number,
      "ats_score_after": number,
      "summary": "string",                     -- Powerful 2-3 sentence professional summary
      "experience": [
        {
          "company": "string",
          "role": "string",
          "duration": "string",
          "bullets": ["string"]                -- Each bullet must be an achievement with metrics
        }
      ],
      "skills": ["string"],                    -- Optimized list of technical/soft skills
      "improvements_made": ["string"]          -- Explanation of what was improved
    }

    Resume:
    ${resumeText}
  `,

  [PromptType.MATCH_JOB]: (resumeText, jobDescription) => `
    Compare the candidate's resume with the following job description.
    Perform a semantic and keyword-based match analysis.

    Return STRICT JSON:
    {
      "match_percentage": <0-100>,
      "matched_skills": ["string"],            -- Skills found in both
      "missing_skills": ["string"],            -- Required skills in JD but missing in resume
      "strengths_alignment": ["string"],       -- Areas where candidate exceeds JD requirements
      "weaknesses_alignment": ["string"],      -- Areas where candidate is most vulnerable
      "improvement_plan": ["string"]           -- Specific steps to become a 100% match
    }

    Job Description:
    ${jobDescription}

    Resume:
    ${resumeText}
  `,

  [PromptType.EXTRACT_SKILLS]: (resumeText) => `
    Extract all technical skills, tools, frameworks, and core professional competencies from the resume.
    Return a flat list of individual skill names.

    Return STRICT JSON:
    {
      "skills": ["string"],
      "categories": {
        "technical": ["string"],
        "soft_skills": ["string"],
        "tools": ["string"]
      }
    }

    Resume:
    ${resumeText}
  `
};

/**
 * Builds a prompt for the AI service.
 * @param {string} type - The type of prompt to build.
 * @param {...any} args - Variable arguments depending on the prompt type.
 * @returns {string} The constructed prompt.
 */
export const buildPrompt = (type, ...args) => {
  if (!TEMPLATES[type]) throw new Error(`Invalid prompt type: ${type}`);
  return TEMPLATES[type](...args).trim();
};

export const getSystemPrompt = () => SYSTEM_PROMPT;
