import PDFDocument from "pdfkit";

// Palette
const COLORS = {
    primary: "#4F46E5", // indigo-600
    dark: "#111827", // gray-900
    muted: "#6B7280", // gray-500
    green: "#16A34A",
    yellow: "#CA8A04",
    red: "#DC2626",
    orange: "#EA580C",
    sectionBg: "#F9FAFB", // gray-50
    border: "#E5E7EB", // gray-200
};

function scoreColor(score) {
    if (score >= 75) return COLORS.green;
    if (score >= 50) return COLORS.yellow;
    return COLORS.red;
}

function scoreLabel(score) {
    if (score >= 75) return "Strong";
    if (score >= 50) return "Moderate";
    return "Needs Work";
}

/**
 * Streams a formatted PDF for the given report into the writable `stream`.
 * @param {object} report  — full report row from the DB
 * @param {object} stream  — Node writable (Express res)
 */
export const generateReportPDF = (report, stream) => {
    const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    doc.pipe(stream);

    const W = doc.page.width - 100; // usable width

    // ── Header bar ───────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 70).fill(COLORS.primary);

    doc
        .fillColor("#FFFFFF")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("ResumeIQ", 50, 22);

    doc
        .fontSize(10)
        .font("Helvetica")
        .text("AI-Powered Resume Analysis Report", 50, 48);

    doc.moveDown(3);

    // ── Meta row ─────────────────────────────────────────────────────────────
    const isJD = report.analysis_type === "jd";
    const label = isJD ? "JD Match Analysis" : `Role: ${report.role}`;
    const date = new Date(report.created_at).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
    });

    doc
        .fillColor(COLORS.muted)
        .fontSize(10)
        .font("Helvetica")
        .text(`${label}   ·   Generated on ${date}`, 50, doc.y, { width: W });

    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).strokeColor(COLORS.border).stroke();
    doc.moveDown(1);

    // ── Score section ─────────────────────────────────────────────────────────
    const scoreY = doc.y;

    // ATS Score box
    const boxW = isJD ? W / 2 - 6 : W;
    doc
        .roundedRect(50, scoreY, boxW, 72, 6)
        .fillAndStroke(COLORS.sectionBg, COLORS.border);

    doc.fillColor(COLORS.muted).fontSize(8).font("Helvetica-Bold")
        .text("ATS SCORE", 62, scoreY + 10, { width: boxW - 20 });

    doc.fillColor(scoreColor(report.score)).fontSize(36).font("Helvetica-Bold")
        .text(String(report.score), 62, scoreY + 22, { width: 80 });

    doc.fillColor(COLORS.muted).fontSize(10).font("Helvetica")
        .text(`/ 100  —  ${scoreLabel(report.score)}`, 115, scoreY + 35);

    if (isJD) {
        const x2 = 50 + boxW + 12;
        doc.roundedRect(x2, scoreY, boxW, 72, 6).fillAndStroke(COLORS.sectionBg, COLORS.border);

        doc.fillColor(COLORS.muted).fontSize(8).font("Helvetica-Bold")
            .text("JD MATCH SCORE", x2 + 12, scoreY + 10, { width: boxW - 20 });

        doc.fillColor(scoreColor(report.match_score)).fontSize(36).font("Helvetica-Bold")
            .text(String(report.match_score), x2 + 12, scoreY + 22, { width: 80 });

        doc.fillColor(COLORS.muted).fontSize(10).font("Helvetica")
            .text(`/ 100  —  ${scoreLabel(report.match_score)}`, x2 + 65, scoreY + 35);
    }

    doc.y = scoreY + 82;
    doc.moveDown(1);

    // ── Missing Keywords (JD only) ────────────────────────────────────────────
    if (isJD && report.missing_keywords?.length > 0) {
        sectionHeader(doc, W, "🔍  Missing Keywords", COLORS.orange);
        doc.moveDown(0.4);

        const chips = report.missing_keywords;
        let x = 50, y = doc.y;
        const chipH = 18, chipPad = 10, gap = 6;

        chips.forEach((kw) => {
            const tw = doc.widthOfString(kw, { fontSize: 9 }) + chipPad * 2;
            if (x + tw > 50 + W) { x = 50; y += chipH + gap; }

            doc.roundedRect(x, y, tw, chipH, 3).fillAndStroke("#FFF7ED", "#FDBA74");
            doc.fillColor(COLORS.orange).fontSize(9).font("Helvetica")
                .text(kw, x + chipPad, y + 5, { width: tw - chipPad * 2 });

            x += tw + gap;
        });

        doc.y = y + chipH + doc.currentLineHeight();
        doc.moveDown(0.8);
    }

    // ── Bullet sections ───────────────────────────────────────────────────────
    bulletSection(doc, W, "💪  Strengths", report.strengths, "#F0FDF4", "#86EFAC", COLORS.green);
    bulletSection(doc, W, "⚠️  Weaknesses", report.weaknesses, "#FEFCE8", "#FDE68A", COLORS.yellow);
    bulletSection(doc, W, "✏️  Suggestions", report.suggestions, "#EFF6FF", "#BFDBFE", "#1D4ED8");

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.on("pageAdded", () => {
        doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill("#F9FAFB");
        doc.fillColor(COLORS.muted).fontSize(8).font("Helvetica")
            .text("Generated by ResumeIQ · resumeiq.app", 50, doc.page.height - 20, {
                width: doc.page.width - 100, align: "center",
            });
    });

    doc.end();
};

// ── Helpers ────────────────────────────────────────────────────────────────
function sectionHeader(doc, W, title, color = COLORS.primary) {
    doc
        .fillColor(color)
        .fontSize(13)
        .font("Helvetica-Bold")
        .text(title, 50, doc.y, { width: W });
}

function bulletSection(doc, W, title, items, bgColor, borderColor, textColor) {
    if (!items?.length) return;

    sectionHeader(doc, W, title, textColor);
    doc.moveDown(0.4);

    items.forEach((item, i) => {
        const isLast = i === items.length - 1;
        const startY = doc.y;

        doc
            .roundedRect(50, startY, W, doc.heightOfString(item, { width: W - 30 }) + 14, 5)
            .fillAndStroke(bgColor, borderColor);

        doc
            .fillColor(textColor)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text("•", 62, startY + 7);

        doc
            .fillColor(COLORS.dark)
            .fontSize(10)
            .font("Helvetica")
            .text(item, 76, startY + 7, { width: W - 30 });

        doc.y = startY + doc.heightOfString(item, { width: W - 30 }) + 18;
        if (!isLast) doc.moveDown(0.2);
    });

    doc.moveDown(0.8);
}
