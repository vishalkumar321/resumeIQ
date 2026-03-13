import React from "react";

/**
 * Reusable Skeleton loading components
 */

export const SkeletonBlock = ({ className = "" }) => (
    <div className={`bg-gray-100 animate-pulse rounded-xl ${className}`} />
);

export const SkeletonText = ({ lines = 1, className = "" }) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <div
                key={i}
                className="h-3 bg-gray-100 animate-pulse rounded-full"
                style={{ width: i === lines - 1 && lines > 1 ? "60%" : "100%" }}
            />
        ))}
    </div>
);

export const SkeletonCard = ({ rows = 1 }) => (
    <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl" />
            <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-50 rounded-full w-1/3" />
                <div className="h-3 bg-gray-50 rounded-full w-1/4" />
            </div>
        </div>
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 rounded-xl" />
            ))}
        </div>
    </div>
);

const Skeleton = {
    Block: SkeletonBlock,
    Text: SkeletonText,
    Card: SkeletonCard
};

export default Skeleton;
