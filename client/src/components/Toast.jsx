import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = "info") => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            px-6 py-4 rounded-xl shadow-lg border flex items-center gap-3 text-white font-medium text-sm
                            animate-in slide-in-from-right-10 fade-in duration-300
                            ${toast.type === "success" ? "bg-[#16a34a] border-[#15803d]" : ""}
                            ${toast.type === "error" ? "bg-[#dc2626] border-[#b91c1c]" : ""}
                            ${toast.type === "info" ? "bg-[#111827] border-slate-800" : ""}
                        `}
                    >
                        <span>
                            {toast.type === "success" && "✓"}
                            {toast.type === "error" && "✕"}
                            {toast.type === "info" && "ℹ"}
                        </span>
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};
