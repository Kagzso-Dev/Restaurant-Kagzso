import React from "react";
import { statusColors } from "../utils/statusColors";

const sizeClasses = {
    xs: "px-1.5 py-px text-[8px]",
    sm: "px-2 py-0.5 text-[9px]",
    md: "px-2.5 py-0.5 text-[10px]",
};

export default function StatusBadge({ status, size = "md" }) {
    const sz = sizeClasses[size] ?? sizeClasses.md;
    return (
        <span
            className={`${sz} rounded-full font-bold inline-block whitespace-nowrap transition-transform duration-200 cursor-default ${
                statusColors[status] || "bg-gray-500/15 text-gray-500 border border-gray-500/20"
            }`}
        >
            {status}
        </span>
    );
}
