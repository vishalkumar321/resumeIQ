import { createRequire } from "module";
const require = createRequire(import.meta.url);

const pdf = require("pdf-parse");

export const extractTextFromPDF = async (buffer) => {
  try {
    const data = await pdf(buffer);

    if (!data.text || data.text.trim().length < 80) {
      throw new Error("SCANNED_PDF");
    }

    return data.text;
  } catch (err) {
    if (err.message === "SCANNED_PDF") {
      throw new Error(
        "This resume appears to be a scanned/image PDF. Please export it from Word or Google Docs."
      );
    }

    console.error("PDF PARSE ERROR:", err);
    throw new Error("Unable to read the resume file");
  }
};