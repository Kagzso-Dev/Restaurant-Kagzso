import React from "react";
import { statusColors } from "../utils/statusColors";

export default function StatusBadge({ status }) {
    return (
        <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block whitespace-nowrap transition-transform duration-200 cursor-default ${statusColors[status] || "bg-gray-500/15 text-gray-500 border border-gray-500/20"
                }`}
        >
            {status}
        </span>
    );
}
