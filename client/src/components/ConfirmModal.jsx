import React, { useState } from "react";

/**
 * Standardized Confirmation Modal
 * @param {boolean} isOpen - Controls visibility
 * @param {function} onClose - Closes the modal
 * @param {function} onConfirm - Action to take on confirm
 * @param {string} title - Modal title
 * @param {string} message - Modal body text
 * @param {string} confirmText - Label for confirm button
 * @param {string} confirmValue - Text user must type to confirm (optional)
 * @param {string} variant - 'danger' (red) or 'primary' (indigo)
 * @param {boolean} loading - Loading state for action
 */
const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Are you sure?",
    message = "This action cannot be undone.",
    confirmText = "Confirm",
    confirmValue = "",
    variant = "danger",
    loading = false
}) => {
    const [inputValue, setInputValue] = useState("");

    if (!isOpen) return null;

    const isConfirmed = confirmValue ? inputValue === confirmValue : true;
    const isDanger = variant === "danger";

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white w-full max-w-md rounded-2xl p-10 shadow-lg animate-in zoom-in-95 duration-300 border border-slate-200">
                <div className={`w-16 h-16 ${isDanger ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600"} rounded-full flex items-center justify-center mb-6 mx-auto`}>
                    {isDanger ? (
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    ) : (
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>

                <div className="text-center space-y-2 mb-8">
                    <h3 className="text-xl font-bold text-[#0f172a]">{title}</h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                        {message}
                    </p>

                    {confirmValue && (
                        <p className="text-xs font-semibold text-red-500 mt-4">
                            Type <span className="underline italic">{confirmValue}</span> to confirm
                        </p>
                    )}
                </div>

                {confirmValue && (
                    <input
                        type="text"
                        placeholder={confirmValue}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className={`w-full bg-slate-50 border border-slate-200 rounded-lg px-6 py-3 text-center text-sm font-semibold mb-6 focus:outline-none focus:ring-2 transition ${isDanger ? "focus:ring-red-100" : "focus:ring-slate-200"}`}
                    />
                )}

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={!isConfirmed || loading}
                        className={`w-full ${isDanger ? "bg-[#dc2626] hover:bg-red-700 shadow-sm" : "bg-[#111827] hover:bg-[#1e293b] shadow-sm"} text-white font-medium py-3 rounded-lg transition disabled:opacity-50`}
                    >
                        {loading ? "Processing..." : confirmText}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-600 font-medium py-3 rounded-lg hover:bg-slate-100 transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
