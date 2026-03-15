import { memo } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';

const FoodItem = memo(({
    item,
    viewMode,
    formatPrice,
    onAdd,
    onEdit,
    onDelete,
    onToggleAvailability,
    showActions = true,
    isAdmin = false
}) => {
    const isVeg = item.isVeg;

    if (viewMode === 'list') {
        return (
            <div
                onClick={() => { if (!isAdmin && showActions) onAdd(item); }}
                className="group bg-[var(--theme-bg-card)] rounded-xl overflow-hidden border border-[var(--theme-border)] hover:border-orange-400/60 hover:shadow-md transition-all p-3 flex items-center gap-3 animate-fade-in cursor-pointer"
            >
                {/* Image */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[var(--theme-bg-dark)] flex-shrink-0">
                    {item.image
                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">🍔</div>
                    }
                    <div className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-[var(--theme-text-main)] truncate leading-tight">{item.name}</h3>
                    <p
                        className="text-[9px] font-bold uppercase tracking-widest mt-1 px-1.5 py-0.5 rounded-full inline-block border"
                        style={{
                            backgroundColor: `${item.category?.color || '#3b82f6'}15`,
                            color: item.category?.color || '#3b82f6',
                            borderColor: `${item.category?.color || '#3b82f6'}30`
                        }}
                    >
                        {item.category?.name || 'Uncategorized'}
                    </p>
                    {item.description && (
                        <p className="text-[10px] text-[var(--theme-text-subtle)] truncate mt-0.5 hidden sm:block">{item.description}</p>
                    )}
                </div>

                {/* Price + Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-orange-400 font-black text-sm sm:text-base">{formatPrice(item.price)}</span>
                    {showActions && (
                        <div className="flex items-center gap-1">
                            {isAdmin ? (
                                <>
                                    {onToggleAvailability && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onToggleAvailability(item); }}
                                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors border ${item.availability
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                                            }`}
                                        >
                                            {item.availability ? 'Available' : 'Unavailable'}
                                        </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] rounded-lg transition-colors">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(item._id); }} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAdd(item); }}
                                    className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-white hover:bg-orange-600 transition-all active:scale-95 shadow-md shadow-orange-500/30"
                                >
                                    <Plus size={18} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Grid View — Petpooja-style
    return (
        <div
            onClick={() => { if (!isAdmin && showActions) onAdd(item); }}
            className="group relative bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] hover:border-orange-400/60 hover:shadow-lg transition-all flex flex-col h-full animate-fade-in cursor-pointer active:scale-[0.97]"
        >
            {/* Image */}
            <div className="relative w-full aspect-square rounded-t-2xl overflow-hidden bg-[var(--theme-bg-dark)] flex-shrink-0">
                {item.image
                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">🍔</div>
                }
                {/* Veg / Non-veg dot */}
                <div className={`absolute top-2 left-2 w-3.5 h-3.5 rounded-full border-2 border-white shadow ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {/* Unavailable overlay */}
                {item.availability === false && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold uppercase tracking-wide bg-red-500 px-2 py-0.5 rounded-full">Unavailable</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 p-2.5 pt-2 min-h-0">
                {/* Name — fixed 2-line height so all cards align */}
                <h3 className="text-xs sm:text-sm font-bold text-[var(--theme-text-main)] line-clamp-2 leading-snug min-h-[2.4em]">{item.name}</h3>

                {/* Category badge */}
                <span
                    className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md self-start border leading-none mt-1"
                    style={{
                        backgroundColor: `${item.category?.color || '#3b82f6'}18`,
                        color: item.category?.color || '#3b82f6',
                        borderColor: `${item.category?.color || '#3b82f6'}35`
                    }}
                >
                    {item.category?.name || 'Uncategorized'}
                </span>

                {/* Price row — always pinned to bottom */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--theme-border)]">
                    <span className="text-orange-400 font-black text-xs sm:text-sm">{formatPrice(item.price)}</span>

                    {/* Admin-only actions (edit / delete / toggle) */}
                    {showActions && isAdmin && (
                        <div className="flex items-center gap-1">
                            {onToggleAvailability && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleAvailability(item); }}
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded border transition-colors ${item.availability
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                                    }`}
                                >
                                    {item.availability ? 'Live' : 'Hidden'}
                                </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] rounded transition-colors">
                                <Edit size={13} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(item._id); }} className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors">
                                <Trash2 size={13} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default FoodItem;
