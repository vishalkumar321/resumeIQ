import puppeteer from "puppeteer";

/**
 * Generates a clean, professional PDF from the optimized resume JSON.
 * @param {Object} data - The optimized_resume JSON object.
 * @returns {Promise<Buffer>} - The PDF buffer.
 */
export const generateOptimizedPDF = async (data) => {
    const { name, summary, experience, skills, projects } = data;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} - Optimized Resume</title>
    <style>
        :root {
            --primary: #4f46e5;
            --text-dark: #1f2937;
            --text-light: #6b7280;
            --border: #e5e7eb;
        }
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.5;
            color: var(--text-dark);
            margin: 0;
            padding: 40px;
            background: white;
        }
        .header {
            border-bottom: 2px solid var(--primary);
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .name {
            font-size: 32px;
            font-weight: 800;
            color: var(--text-dark);
            margin: 0;
            letter-spacing: -0.025em;
        }
        .section-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-top: 30px;
            margin-bottom: 10px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 5px;
        }
        .summary {
            font-size: 14px;
            color: var(--text-dark);
            text-align: justify;
        }
        .experience-item {
            margin-bottom: 25px;
        }
        .experience-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 5px;
        }
        .role {
            font-size: 16px;
            font-weight: 700;
        }
        .company {
            font-size: 14px;
            font-weight: 600;
            color: var(--primary);
        }
        .duration {
            font-size: 12px;
            color: var(--text-light);
            font-family: monospace;
        }
        .bullets {
            margin: 8px 0 0 0;
            padding-left: 18px;
            list-style-type: square;
        }
        .bullets li {
            font-size: 13px;
            margin-bottom: 4px;
            color: #374151;
        }
        .skills-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .skill-tag {
            background: #f3f4f6;
            border: 1px solid var(--border);
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .project-item {
            margin-bottom: 15px;
        }
        .project-name {
            font-size: 14px;
            font-weight: 700;
        }
        .project-desc {
            font-size: 13px;
            color: var(--text-light);
            margin-top: 2px;
        }
        .tech-tags {
            font-size: 11px;
            color: var(--primary);
            font-weight: 600;
            margin-top: 4px;
        }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="name">${name}</h1>
    </div>

    <div class="section-title">Professional Summary</div>
    <div class="summary">${summary}</div>

    <div class="section-title">Experience</div>
    ${experience.map(exp => `
        <div class="experience-item">
            <div class="experience-header">
                <div>
                    <span class="role">${exp.role}</span>
                    <span style="margin: 0 5px; color: #d1d5db;">|</span>
                    <span class="company">${exp.company}</span>
                </div>
                ${exp.duration ? `<span class="duration">${exp.duration}</span>` : ''}
            </div>
            <div class="bullets" style="font-size: 13px; color: #374151; white-space: pre-line;">
                ${exp.impact}
            </div>
        </div>
    `).join('')}

    <div class="section-title">Skills & Technologies</div>
    <div class="skills-container">
        ${skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
    </div>

    <div class="section-title">Key Projects</div>
    ${projects.map(proj => `
        <div class="project-item">
            <div class="project-name">${proj.name}</div>
            <div class="project-desc">${proj.description}</div>
            <div class="tech-tags">${proj.technologies ? proj.technologies.join(' • ') : ''}</div>
        </div>
    `).join('')}

    <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 10px;">
        Optimized by ResumeIQ AI
    </div>
</body>
</html>
  `;

    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "20mm",
            right: "20mm",
        },
    });

    await browser.close();
    return pdfBuffer;
};
