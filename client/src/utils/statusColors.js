// Dynamic status colors driven by Admin settings (CSS variables)
export const statusColors = {
    pending: "bg-[var(--status-pending-bg)] text-[var(--status-pending)] border border-[var(--status-pending-border)]",
    accepted: "bg-[var(--status-accepted-bg)] text-[var(--status-accepted)] border border-[var(--status-accepted-border)]",
    preparing: "bg-[var(--status-preparing-bg)] text-[var(--status-preparing)] border border-[var(--status-preparing-border)]",
    ready: "bg-[var(--status-ready-bg)] text-[var(--status-ready)] border border-[var(--status-ready-border)]",
    completed: "bg-gray-500/15 text-gray-500 border border-gray-500/20",
    cancelled: "bg-rose-500/15 text-rose-600 border border-rose-500/25",
    // Capitalized variants
    Pending: "bg-[var(--status-pending-bg)] text-[var(--status-pending)] border border-[var(--status-pending-border)]",
    Accepted: "bg-[var(--status-accepted-bg)] text-[var(--status-accepted)] border border-[var(--status-accepted-border)]",
    Preparing: "bg-[var(--status-preparing-bg)] text-[var(--status-preparing)] border border-[var(--status-preparing-border)]",
    Ready: "bg-[var(--status-ready-bg)] text-[var(--status-ready)] border border-[var(--status-ready-border)]",
    Completed: "bg-gray-500/15 text-gray-500 border border-gray-500/20",
    Cancelled: "bg-rose-500/15 text-rose-600 border border-rose-500/25",
};
