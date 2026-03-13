import puppeteer from "puppeteer";

export const generateOptimizedPDF = async (optimizedJSON) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });


    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: "Georgia", serif; color: #334155; margin: 0; padding: 40px; background: #fff; }
          
          .header { margin-bottom: 24px; }
          .name { font-size: 24px; font-weight: bold; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 4px; }
          .target-role { font-size: 14px; color: #6366f1; font-weight: 500; }
          
          .section { margin-bottom: 20px; }
          .section-title { 
            font-size: 11px; 
            font-weight: bold; 
            letter-spacing: 1.5px; 
            text-transform: uppercase; 
            color: #94a3b8; 
            border-bottom: 1px solid #e2e8f0; 
            padding-bottom: 4px; 
            margin-bottom: 12px; 
          }
          
          .summary { font-size: 13px; line-height: 1.6; color: #334155; }
          
          .job { margin-bottom: 16px; }
          .job-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
          .job-title { font-size: 14px; font-weight: bold; color: #0f172a; }
          .job-duration { font-size: 12px; color: #94a3b8; }
          .job-company { font-size: 13px; color: #6366f1; font-weight: 500; margin-bottom: 8px; }
          
          .bullets { margin: 0; padding-left: 16px; }
          .bullets li { font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 6px; }
          
          .skills-container { display: flex; flex-wrap: wrap; gap: 6px; }
          .skill-badge { 
            font-size: 12px; 
            color: #475569; 
            padding: 2px 6px; 
            border: 1px solid #e2e8f0; 
            border-radius: 4px; 
          }
          
          .keywords-header { margin-top: 24px; }
          .keyword-badge { 
            font-size: 12px; 
            color: #15803d; 
            background: #f0fdf4;
            padding: 2px 6px; 
            border: 1px solid #bbf7d0; 
            border-radius: 4px; 
          }
          .contact-row {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 18px;
            font-size: 10px;
            color: #64748b;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 14px;
          }
          .contact-row span {
            display: inline-flex;
            align-items: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="name">${(optimizedJSON.candidate_name &&
        optimizedJSON.candidate_name !== 'Candidate Name' &&
        optimizedJSON.candidate_name !== 'Candidate' &&
        optimizedJSON.candidate_name !== 'Your Name' &&
        !optimizedJSON.candidate_name.toLowerCase().includes('candidate') &&
        !optimizedJSON.candidate_name.toLowerCase().includes('your name'))
        ? optimizedJSON.candidate_name
        : 'Resume'}</div>
          <div class="target-role">${optimizedJSON.target_role || optimizedJSON.role || 'Target Role'}</div>
          <div class="contact-row">
            ${optimizedJSON.contact_email ? `<span>${optimizedJSON.contact_email}</span>` : ''}
            ${optimizedJSON.contact_phone ? `<span>${optimizedJSON.contact_phone}</span>` : ''}
            ${optimizedJSON.contact_location ? `<span>${optimizedJSON.contact_location}</span>` : ''}
            ${optimizedJSON.contact_linkedin ? `<span>${optimizedJSON.contact_linkedin}</span>` : ''}
          </div>
        </div>

        ${optimizedJSON.summary ? `
        <div class="section">
          <div class="section-title">Professional Summary</div>
          <div class="summary">${optimizedJSON.summary}</div>
        </div>
        ` : ''}

        ${optimizedJSON.experience && optimizedJSON.experience.length > 0 ? `
        <div class="section">
          <div class="section-title">Experience</div>
          ${optimizedJSON.experience.map(job => `
            <div class="job">
              <div class="job-header">
                <span class="job-title">${job.role || job.title || ''}</span>
                <span class="job-duration">${job.duration || ''}</span>
              </div>
              <div class="job-company">${job.company || ''}</div>
              <ul class="bullets">
                ${(job.bullets || []).map(b => `<li>${b}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${optimizedJSON.skills && optimizedJSON.skills.length > 0 ? `
        <div class="section">
          <div class="section-title">Skills</div>
          <div class="skills-container">
            ${optimizedJSON.skills.map(s => `<span class="skill-badge">${s}</span>`).join('')}
          </div>
        </div>
        ` : ''}
        
        ${optimizedJSON.missing_keywords && optimizedJSON.missing_keywords.length > 0 ? `
        <div class="section">
          <div class="section-title">Keywords Added</div>
          <div class="skills-container">
            ${optimizedJSON.missing_keywords.map(k => `<span class="keyword-badge">${k}</span>`).join('')}
          </div>
        </div>
        ` : ''}

      </body>
      </html>
    `;

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000
    });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", bottom: "0px", left: "0px", right: "0px" },
    });

    console.log("[PDF] Generated buffer size:", pdfBuffer.length);
    return pdfBuffer;
  } finally {
    await browser.close();
  }
};

