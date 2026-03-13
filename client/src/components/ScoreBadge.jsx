import React from "react";

/**
 * Standardized score badge for ATS scores
 * @param {number} score - The ATS score (0-100)
 * @param {string} size - 'sm', 'md', 'lg'
 * @param {boolean} showLabel - Whether to show "ATS Score" label
 */
const ScoreBadge = ({ score, size = "md", showLabel = false, className = "" }) => {
    if (score === null || score === undefined) {
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-50 text-slate-400 border border-slate-200 ${className}`}>
                —
            </span>
        );
    }

    const getColors = (s) => {
        if (s >= 80) return "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]";
        if (s >= 60) return "bg-[#fef3c7] text-[#d97706] border-[#fde68a]";
        return "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]";
    };

    const sizeClasses = {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
    };

    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            {showLabel && <span className="text-xs font-semibold text-slate-500">ATS Score:</span>}
            <span className={`inline-flex items-center justify-center rounded-md font-bold shadow-sm transition-colors ${sizeClasses[size]} ${getColors(score)}`}>
                {score}
            </span>
        </div>
    );
};

export default ScoreBadge;
