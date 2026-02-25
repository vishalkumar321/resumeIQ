import api from "./api";

/**
 * Downloads the PDF for a given report ID.
 * Uses the Axios instance (so the JWT is attached automatically),
 * converts the binary response to a Blob, and triggers a browser download.
 *
 * @param {string} reportId — UUID of the report
 * @param {string} filename — suggested filename (default: resumeiq-report.pdf)
 */
export const downloadPDF = async (reportId, filename = "resumeiq-report.pdf") => {
    const response = await api.get(`/report/${reportId}/pdf`, {
        responseType: "blob",   // tell Axios to treat the response bytes as a Blob
    });

    const url = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
    );

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // Release the object URL to free memory
    URL.revokeObjectURL(url);
};
