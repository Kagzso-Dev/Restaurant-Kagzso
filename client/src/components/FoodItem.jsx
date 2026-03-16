import { memo } from 'react';
import { Plus, Check, Edit, Trash2 } from 'lucide-react';

const FoodItem = memo(({
    item,
    viewMode,
    formatPrice,
    onAdd,
    onEdit,
    onDelete,
    onToggleAvailability,
    showActions = true,
    isAdmin = false,
    cartQty = 0,
}) => {
    const isVeg = item.isVeg;

    if (viewMode === 'list') {
        return (
            <div
                onClick={() => { if (!isAdmin && showActions) onAdd(item); }}
                className="group bg-[var(--theme-bg-card)] rounded-2xl overflow-hidden border border-[var(--theme-border)] hover:border-orange-400/50 hover:shadow-lg transition-all animate-fade-in cursor-pointer"
            >
                <div className="flex items-center gap-4 p-3 sm:p-4">
                    {/* Veg/Non-veg side bar */}
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                    {/* Image */}
                    <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden bg-[var(--theme-bg-dark)] flex-shrink-0 shadow-sm">
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
                        <h3 className="text-sm sm:text-[15px] font-bold text-[var(--theme-text-main)] leading-tight">{item.name}</h3>
                        <span
                            className="text-[9px] font-bold uppercase tracking-wider mt-1.5 px-2 py-0.5 rounded-full inline-block border"
                            style={{
                                backgroundColor: `${item.category?.color || '#3b82f6'}15`,
                                color: item.category?.color || '#3b82f6',
                                borderColor: `${item.category?.color || '#3b82f6'}35`
                            }}
                        >
                            {item.category?.name || 'Uncategorized'}
                        </span>
                        {item.description && (
                            <p className="text-[11px] text-[var(--theme-text-subtle)] truncate mt-1 max-w-[200px] sm:max-w-xs">{item.description}</p>
                        )}
                    </div>

                    {/* Price + Actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-orange-400 font-black text-sm sm:text-base tabular-nums">{formatPrice(item.price)}</span>
                        {showActions && (
                            <div className="flex items-center gap-1">
                                {isAdmin ? (
                                    <>
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
                                    </>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAdd(item); }}
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 shadow-md font-bold text-sm ${cartQty > 0 ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-orange-500 shadow-orange-500/30 hover:bg-orange-600'}`}
                                    >
                                        {cartQty > 0 ? cartQty : <Plus size={18} />}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Grid View
    return (
        <div
            onClick={() => { if (!isAdmin && showActions) onAdd(item); }}
            className="group relative bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] hover:border-orange-400/50 hover:shadow-xl transition-all flex flex-col h-full animate-fade-in cursor-pointer active:scale-[0.97] overflow-hidden"
        >
            {/* Image */}
            <div className="relative w-full aspect-[4/3] overflow-hidden bg-[var(--theme-bg-dark)] flex-shrink-0">
                {item.image
                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">🍔</div>
                }
                {/* Veg / Non-veg indicator */}
                <div className={`absolute top-2 left-2 w-3 h-3 rounded-full border-2 border-white shadow-md ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {/* Unavailable overlay */}
                {item.availability === false && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider bg-red-500/90 px-2.5 py-1 rounded-full shadow">Unavailable</span>
                    </div>
                )}
                {/* Category badge on image */}
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
            <div className="flex flex-col flex-1 p-3 min-h-0 gap-2">
                {/* Name */}
                <h3 className="text-xs sm:text-sm font-bold text-[var(--theme-text-main)] line-clamp-2 leading-snug min-h-[2.4em]">{item.name}</h3>

                {/* Price row — always pinned to bottom */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--theme-border)]">
                    <span className="text-orange-400 font-black text-sm tabular-nums">{formatPrice(item.price)}</span>

                    {/* Admin-only actions */}
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
                    {/* Waiter add button */}
                    {showActions && !isAdmin && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAdd(item); }}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 shadow-md font-bold text-sm ${cartQty > 0 ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-orange-500 shadow-orange-500/30 hover:bg-orange-600'}`}
                        >
                            {cartQty > 0 ? cartQty : <Plus size={16} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});

export default FoodItem;
