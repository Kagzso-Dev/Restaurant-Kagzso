// Dynamic token/order card colors driven by Admin settings (CSS variables)
export const tokenColors = {
    pending:   "bg-[var(--status-pending-bg)] border-[var(--status-pending-border)] text-[var(--status-pending)]",
    accepted:  "bg-[var(--status-accepted-bg)] border-[var(--status-accepted-border)] text-[var(--status-accepted)]",
    preparing: "bg-[var(--status-preparing-bg)] border-[var(--status-preparing-border)] text-[var(--status-preparing)]",
    ready:     "bg-[var(--status-ready-bg)] border-[var(--status-ready-border)] text-[var(--status-ready)]",
    completed: "bg-gray-500/8 border-gray-400/30 text-gray-500",
    cancelled: "bg-rose-500/10 border-rose-500/35 text-rose-700",
    // Capitalized variants
    Pending:   "bg-[var(--status-pending-bg)] border-[var(--status-pending-border)] text-[var(--status-pending)]",
    Accepted:  "bg-[var(--status-accepted-bg)] border-[var(--status-accepted-border)] text-[var(--status-accepted)]",
    Preparing: "bg-[var(--status-preparing-bg)] border-[var(--status-preparing-border)] text-[var(--status-preparing)]",
    Ready:     "bg-[var(--status-ready-bg)] border-[var(--status-ready-border)] text-[var(--status-ready)]",
    Completed: "bg-gray-500/8 border-gray-400/30 text-gray-500",
    Cancelled: "bg-rose-500/10 border-rose-500/35 text-rose-700",
};
