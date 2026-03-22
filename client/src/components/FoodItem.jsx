import { memo } from 'react';
import { Plus, Minus, Edit, Trash2 } from 'lucide-react';

/* ── Reusable +/- stepper ─────────────────────────────────────────────── */
const QtyControl = ({ qty, onAdd, onRemove, size = 'md' }) => {
    const btnCls = size === 'sm'
        ? 'w-7 h-7 text-xs'
        : 'w-8 h-8 text-sm';
    const numCls = size === 'sm' ? 'w-6 text-xs' : 'w-8 text-sm';

    if (qty === 0) {
        return (
            <button
                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                className={`${btnCls} rounded-xl flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/30 active:scale-90 transition-all flex-shrink-0`}
            >
                <Plus size={size === 'sm' ? 14 : 16} strokeWidth={3} />
            </button>
        );
    }

    return (
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className={`${btnCls} rounded-xl flex items-center justify-center bg-rose-500/15 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 active:scale-90 transition-all`}
            >
                <Minus size={size === 'sm' ? 12 : 14} strokeWidth={3} />
            </button>
            <span className={`${numCls} text-center font-black text-[var(--theme-text-main)] tabular-nums`}>{qty}</span>
            <button
                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                className={`${btnCls} rounded-xl flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/30 active:scale-90 transition-all`}
            >
                <Plus size={size === 'sm' ? 12 : 14} strokeWidth={3} />
            </button>
        </div>
    );
};

const FoodItem = memo(({
    item,
    viewMode,
    formatPrice,
    onAdd,
    onRemove,
    onEdit,
    onDelete,
    onToggleAvailability,
    showActions = true,
    isAdmin = false,
    cartQty = 0,
}) => {
    const isVeg = item.isVeg;

    /* ── LIST VIEW ──────────────────────────────────────────────────────── */
    if (viewMode === 'list') {
        return (
            <div
                onClick={() => { if (!isAdmin && showActions && cartQty === 0) onAdd(item); }}
                className={`group bg-[var(--theme-bg-card)] rounded-2xl overflow-hidden border transition-all animate-fade-in ${cartQty > 0 ? 'border-orange-400/50 shadow-md' : 'border-[var(--theme-border)] hover:border-orange-400/40 hover:shadow-md'} ${!isAdmin && cartQty === 0 ? 'cursor-pointer' : 'cursor-default'}`}
            >
                <div className="flex items-center gap-3 p-3">
                    {/* Veg indicator */}
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                    {/* Image */}
                    <div className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl overflow-hidden bg-[var(--theme-bg-dark)] flex-shrink-0 shadow-sm">
                        {item.image
                            ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            : <div className="w-full h-full flex items-center justify-center text-3xl">🍔</div>
                        }
                        {item.availability === false && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-white text-[8px] font-bold uppercase">Off</span>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-[var(--theme-text-main)] leading-tight">{item.name}</h3>
                        <span
                            className="text-[9px] font-bold uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full inline-block border"
                            style={{
                                backgroundColor: `${item.category?.color || '#3b82f6'}15`,
                                color: item.category?.color || '#3b82f6',
                                borderColor: `${item.category?.color || '#3b82f6'}35`
                            }}
                        >
                            {item.category?.name || 'Uncategorized'}
                        </span>
                    </div>

                    {/* Price + Actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-orange-400 font-black text-sm tabular-nums">{formatPrice(item.price)}</span>
                        {showActions && (
                            isAdmin ? (
                                <div className="flex items-center gap-1">
                                    {onToggleAvailability && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onToggleAvailability(item); }}
                                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all border ${item.availability
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                                                : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30'
                                            }`}
                                        >
                                            {item.availability ? 'Available' : 'Unavailable'}
                                        </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 text-[var(--theme-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                                        <Edit size={15} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(item._id); }} className="p-2 text-[var(--theme-text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ) : (
                                <QtyControl qty={cartQty} onAdd={() => onAdd(item)} onRemove={() => onRemove(item._id)} />
                            )
                        )}
                    </div>
                </div>
            </div>
        );
    }

    /* ── COMPACT VIEW ───────────────────────────────────────────────────── */
    if (viewMode === 'compact') {
        return (
            <div
                onClick={() => { if (!isAdmin && showActions && cartQty === 0) onAdd(item); }}
                className={`group relative bg-[var(--theme-bg-card)] rounded-xl border transition-all flex items-center p-2 gap-2.5 ${cartQty > 0 ? 'border-orange-400/50' : 'border-[var(--theme-border)] hover:border-orange-400/40 hover:shadow-md'} ${!isAdmin && cartQty === 0 ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}
            >
                <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-[var(--theme-bg-dark)] flex-shrink-0">
                    {item.image
                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xl">🍔</div>
                    }
                    <div className={`absolute top-0.5 left-0.5 w-2 h-2 rounded-full border border-white ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-[var(--theme-text-main)] truncate">{item.name}</h3>
                    <span className="text-orange-400 font-extrabold text-[10px]">{formatPrice(item.price)}</span>
                </div>
                {!isAdmin && showActions && (
                    <QtyControl qty={cartQty} onAdd={() => onAdd(item)} onRemove={() => onRemove(item._id)} size="sm" />
                )}
                {isAdmin && (
                    <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-1 text-[var(--theme-text-muted)] hover:text-blue-400">
                            <Edit size={12} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(item._id); }} className="p-1 text-[var(--theme-text-muted)] hover:text-red-400">
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    /* ── GRID VIEW ──────────────────────────────────────────────────────── */
    return (
        <div
            onClick={() => { if (!isAdmin && showActions && cartQty === 0) onAdd(item); }}
            className={`group relative bg-[var(--theme-bg-card)] rounded-2xl border transition-all flex flex-col h-full animate-fade-in overflow-hidden ${cartQty > 0 ? 'border-orange-400/50 shadow-lg' : 'border-[var(--theme-border)] hover:border-orange-400/50 hover:shadow-xl'} ${!isAdmin && cartQty === 0 ? 'cursor-pointer active:scale-[0.97]' : 'cursor-default'}`}
        >
            {/* Image */}
            <div className="relative w-full aspect-[4/3] overflow-hidden bg-[var(--theme-bg-dark)] flex-shrink-0">
                {item.image
                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">🍔</div>
                }
                <div className={`absolute top-2 left-2 w-3 h-3 rounded-full border-2 border-white shadow-md ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {item.availability === false && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider bg-red-500/90 px-2.5 py-1 rounded-full shadow">Unavailable</span>
                    </div>
                )}
                <span
                    className="absolute bottom-2 left-2 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-sm"
                    style={{
                        backgroundColor: `${item.category?.color || '#3b82f6'}cc`,
                        color: '#fff',
                        borderColor: `${item.category?.color || '#3b82f6'}80`
                    }}
                >
                    {item.category?.name || 'Uncategorized'}
                </span>
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 p-2.5 gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-[var(--theme-text-main)] line-clamp-2 leading-snug min-h-[2.4em]">{item.name}</h3>

                {/* Price row */}
                <div className="mt-auto pt-2 border-t border-[var(--theme-border)] flex items-center justify-between">
                    <span className="text-orange-400 font-black text-sm tabular-nums">{formatPrice(item.price)}</span>
                    {showActions && isAdmin && (
                        <div className="flex items-center gap-0.5">
                            {onToggleAvailability && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleAvailability(item); }}
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md border transition-all ${item.availability
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/25'
                                        : 'bg-red-500/10 text-red-400 border-red-500/25 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/25'
                                    }`}
                                >
                                    {item.availability ? 'Live' : 'Off'}
                                </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-1.5 text-[var(--theme-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                                <Edit size={13} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(item._id); }} className="p-1.5 text-[var(--theme-text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                <Trash2 size={13} />
                            </button>
                        </div>
                    )}
                    {/* qty=0 → small + button inline with price */}
                    {showActions && !isAdmin && cartQty === 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAdd(item); }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/30 active:scale-90 transition-all flex-shrink-0"
                        >
                            <Plus size={16} strokeWidth={3} />
                        </button>
                    )}
                </div>

                {/* qty>0 → full stepper on its own row, centered, full width */}
                {showActions && !isAdmin && cartQty > 0 && (
                    <div className="flex items-center justify-between gap-1 w-full" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove(item._id); }}
                            className="flex-1 h-8 rounded-xl flex items-center justify-center bg-rose-500/15 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 active:scale-90 transition-all"
                        >
                            <Minus size={14} strokeWidth={3} />
                        </button>
                        <span className="w-8 text-center font-black text-[var(--theme-text-main)] tabular-nums text-sm">{cartQty}</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onAdd(item); }}
                            className="flex-1 h-8 rounded-xl flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/30 active:scale-90 transition-all"
                        >
                            <Plus size={14} strokeWidth={3} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default FoodItem;
