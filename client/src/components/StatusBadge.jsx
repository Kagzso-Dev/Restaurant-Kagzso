import React from "react";
import { statusColors } from "../utils/statusColors";

const sizeClasses = {
    xs: "px-1.5 py-px text-[8px]",
    sm: "px-2 py-0.5 text-[9px]",
    md: "px-2.5 py-0.5 text-[10px]",
};

export default function StatusBadge({ status, items = [], size = "md" }) {
    const sz = sizeClasses[size] ?? sizeClasses.md;
    
    // Detect partially ready status
    let displayStatus = status;
    let colorClass = statusColors[status] || "bg-gray-500/15 text-gray-500 border border-gray-500/20";

    const hasReady = items.some(i => i.status?.toUpperCase() === 'READY');
    const hasPending = items.some(i => ['PENDING', 'ACCEPTED', 'PREPARING'].includes(i.status?.toUpperCase()));
    
    if (hasReady && hasPending && (status?.toLowerCase() === 'pending' || status?.toLowerCase() === 'preparing' || status?.toLowerCase() === 'accepted' || status?.toLowerCase() === 'ready')) {
        displayStatus = "Partially Ready";
        colorClass = "bg-amber-100/80 text-emerald-700 border border-emerald-300 shadow-sm";
    }

    return (
        <span
            className={`${sz} rounded-full font-black inline-block whitespace-nowrap transition-transform duration-200 cursor-default ${colorClass}`}
        >
            {displayStatus}
        </span>
    );
}

