import { Users, Clock, Lock, Sparkles } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// STATUS_CONFIG — single source of truth for ALL table status styles / labels.
// ─────────────────────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
    available: {
        bg: 'bg-emerald-500/8',
        border: 'border-emerald-500/40',
        hoverBg: 'hover:bg-emerald-500/10',
        text: 'text-emerald-500',
        dot: 'bg-emerald-500',
        color: 'bg-emerald-500',
        ring: 'ring-emerald-500/30',
        topBar: 'bg-emerald-500',
        label: 'Available',
        icon: Sparkles,
    },
    reserved: {
        bg: 'bg-yellow-500/8',
        border: 'border-yellow-500/40',
        hoverBg: 'hover:bg-yellow-500/10',
        text: 'text-yellow-500',
        dot: 'bg-yellow-500',
        color: 'bg-yellow-500',
        ring: 'ring-yellow-500/30',
        topBar: 'bg-yellow-500',
        label: 'Reserved',
        icon: Lock,
    },
    occupied: {
        bg: 'bg-red-500/8',
        border: 'border-red-500/40',
        hoverBg: 'hover:bg-red-500/10',
        text: 'text-red-500',
        dot: 'bg-red-500',
        color: 'bg-red-500',
        ring: 'ring-red-500/30',
        topBar: 'bg-red-500',
        label: 'Occupied',
        icon: Users,
    },
    cleaning: {
        bg: 'bg-gray-500/8',
        border: 'border-gray-400/40',
        hoverBg: 'hover:bg-gray-500/10',
        text: 'text-gray-500',
        dot: 'bg-gray-400',
        color: 'bg-gray-400',
        ring: 'ring-gray-400/30',
        topBar: 'bg-gray-400',
        label: 'Cleaning',
        icon: Clock,
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// TableCard — shared visual component for Admin + Waiter table maps.
// ─────────────────────────────────────────────────────────────────────────────
const TableCard = ({ table, onClick, clickable = false, actions, variant = 'grid' }) => {
    const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
    const StatusIcon = config.icon;

    if (variant === 'list') {
        return (
            <div
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? onClick : undefined}
                onKeyDown={clickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
                className={[
                    'relative bg-[var(--theme-bg-card)] rounded-xl border p-4 transition-all duration-200 group flex items-center justify-between gap-4',
                    config.border,
                    'border-l-[8px]',
                    config.topBar.replace('bg-', 'border-'), // Reuse topBar color class for border color
                    clickable ? `cursor-pointer hover:shadow-md active:scale-[0.99] ${config.hoverBg}` : 'cursor-default',
                ].join(' ')}
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${config.border} ${config.bg} flex-shrink-0 shadow-sm`}>
                        <span className={`text-2xl font-black ${config.text}`}>
                            {table.number}
                        </span>
                    </div>
                    <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2">
                             <h3 className="font-bold text-[var(--theme-text-main)] text-base truncate">Table {table.number}</h3>
                             <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${table.status === 'reserved' ? 'animate-pulse' : ''}`} />
                        </div>
                        <div className="flex items-center gap-4 mt-0.5">
                            <span className="flex items-center gap-1.5 text-[var(--theme-text-muted)] text-[10px] font-bold uppercase tracking-widest bg-[var(--theme-bg-dark)] px-2 py-0.5 rounded border border-[var(--theme-border)]">
                                <Users size={11} className="opacity-70 text-orange-500" />
                                {table.capacity} Seats
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${config.bg} ${config.text} border ${config.border}`}>
                                {config.label}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {actions && (
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {actions}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? onClick : undefined}
            onKeyDown={clickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
            className={[
                'relative bg-[var(--theme-bg-card)] rounded-2xl border overflow-hidden',
                'flex flex-col',
                'transition-all duration-200 group',
                config.border,
                clickable
                    ? `cursor-pointer hover:shadow-lg active:scale-95 ${config.hoverBg || 'hover:opacity-90'}`
                    : 'cursor-default',
            ].join(' ')}
        >
            {/* Top status colour bar */}
            <div className={`h-1 w-full ${config.topBar} flex-shrink-0`} />

            {/* Action icons (shown on hover) */}
            {actions && (
                <div className="absolute top-3 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150 z-10">
                    {actions}
                </div>
            )}

            {/* Body */}
            <div className="flex flex-col items-center justify-center flex-1 px-3 py-4 gap-1">
                <span className="text-[9px] text-[var(--theme-text-muted)] uppercase tracking-widest font-bold">
                    Table
                </span>
                <span className={`text-4xl sm:text-5xl font-black leading-none ${config.text}`}>
                    {table.number}
                </span>
            </div>

            {/* Footer */}
            <div className="px-3 pb-3">
                <div className="flex items-center justify-between border-t border-[var(--theme-border)] pt-2.5">
                    <span className="flex items-center gap-1 text-[var(--theme-text-muted)] text-[10px] font-semibold">
                        <Users size={11} />
                        {table.capacity}
                    </span>
                    <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${table.status === 'reserved' ? 'animate-pulse' : ''}`} />
                        <span className={`text-[9px] font-bold uppercase tracking-wide ${config.text}`}>
                            {config.label}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TableCard;
