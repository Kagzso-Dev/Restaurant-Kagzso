import { useState, useEffect, memo } from 'react';
import { Plus, Minus, Edit, Trash2, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';

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
                className={`${btnCls} rounded-xl flex items-center justify-center bg-white hover:bg-gray-50 text-gray-900 shadow-sm active:scale-90 transition-all flex-shrink-0 border-2 border-gray-900/10`}
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
    itemCart = []
}) => {
    const [selectedSize, setSelectedSize] = useState(item.variants?.[0] || null);
    
    useEffect(() => {
        if (item.variants?.length > 0) {
            setSelectedSize(item.variants[0]);
        }
    }, [item.variants]);

    const isVeg = item.isVeg;

    /* ── LIST VIEW ──────────────────────────────────────────────────────── */
    if (viewMode === 'list') {
        return (
            <div
                onClick={() => { if (!isAdmin && showActions && cartQty === 0) onAdd(item); }}
                className={`group bg-[var(--theme-bg-card)] rounded-2xl overflow-hidden border transition-all animate-fade-in ${cartQty > 0 ? 'border-gray-400/50 shadow-md' : 'border-[var(--theme-border)] hover:border-gray-400/40 hover:shadow-md'} ${!isAdmin && cartQty === 0 ? 'cursor-pointer' : 'cursor-default'}`}
            >
                <div className="flex items-center gap-3 p-3">
                    {/* Veg indicator */}
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                    {/* Image */}
                    <div className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl overflow-hidden bg-[var(--theme-bg-dark)] flex-shrink-0 shadow-sm">
                        {item.image
                            ? <img src={item.image} alt={item.name} className="img-cover group-hover:scale-105 transition-transform duration-300" />
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
                        {item.variants?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {item.variants.map((v, i) => {
                                    const cartKey = `${item._id}_${v.name}`;
                                    const cartItem = itemCart?.find(c => c.cartKey === cartKey);
                                    const q = cartItem?.quantity || 0;
                                    return (
                                        <div key={i} className="flex-1 min-w-[120px]">
                                            {isAdmin ? (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-gray-500/10 text-gray-500 border border-gray-500/25 whitespace-nowrap opacity-60">
                                                    <span>{v.name}</span>
                                                    <span>{formatPrice(v.price)}</span>
                                                </div>
                                            ) : q > 0 ? (
                                                <div className="flex items-center gap-2 bg-gray-500/10 border border-gray-500/30 rounded-xl px-2 py-1 flex-1 animate-scale-up">
                                                    <button onClick={(e) => { e.stopPropagation(); onRemove(cartKey); }} className="w-6 h-6 flex items-center justify-center bg-rose-500/15 text-rose-500 rounded-lg active:scale-95 transition-all"><Minus size={12} /></button>
                                                    <span className="text-[11px] font-black text-gray-600 tabular-nums">{q}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); onAdd(item, v); }} className="w-6 h-6 flex items-center justify-center bg-emerald-500 text-white rounded-lg shadow-sm active:scale-95 transition-all"><Plus size={12} /></button>
                                                    <span className="ml-auto text-[9px] font-black uppercase text-gray-400 opacity-60 tracking-tighter">{v.name}</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onAdd(item, v); }}
                                                    className="w-full h-8 flex items-center justify-between gap-1 text-[10px] font-bold px-3 py-2 rounded-xl bg-white text-gray-900 border-2 border-gray-900/10 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                                                >
                                                    <span className="uppercase tracking-tight opacity-50">{v.name}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-black text-gray-900">{formatPrice(v.price)}</span>
                                                        <Plus size={10} strokeWidth={3} className="text-gray-900" />
                                                    </div>
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Price + Actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-gray-500 font-black text-sm tabular-nums whitespace-nowrap mt-2 block">
                            {item.variants?.length === 0 ? formatPrice(item.price) : ''}
                        </span>
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
                                !item.variants?.length && <QtyControl qty={cartQty} onAdd={() => onAdd(item)} onRemove={() => onRemove(item._id)} />
                            )
                        )}
                    </div>
                </div>
            </div>
        );
    }

    /* ── COMPACT VIEW ───────────────────────────────────────────────────── */
    /* ── GRID VIEW ──────────────────────────────────────────────────────── */
    return (
        <div
            className={`group relative bg-[var(--theme-bg-card)] rounded-3xl border transition-all flex flex-col items-center animate-fade-in overflow-hidden ${cartQty > 0 ? 'border-gray-400/50 shadow-lg' : 'border-[var(--theme-border)] hover:border-gray-400/50 hover:shadow-xl'}`}
        >
            {/* Image section */}
            <div className="relative w-full aspect-[1.3] overflow-hidden bg-[var(--theme-bg-dark)] flex-shrink-0">
                {item.image
                    ? <img src={item.image} alt={item.name} className="img-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">🍔</div>
                }
                
                {/* Veg/Non-Veg Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/90 backdrop-blur shadow-sm border border-black/5">
                    <div className={`w-2 h-2 rounded-sm ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="text-[7px] font-black uppercase tracking-widest text-gray-500">{isVeg ? 'VEG' : 'NON'}</span>
                </div>

                {/* Subcategory Label */}
                <div className="absolute bottom-3 left-3">
                    <span className="text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-gray-200 text-gray-800 shadow-sm border border-black/5">
                        {item.category?.name || 'Item'}
                    </span>
                </div>
                
                {item.availability === false && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest bg-red-600 px-3 py-1.5 rounded-xl">Sold Out</span>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex flex-col flex-1 p-3 w-full text-center">
                <div className="mb-1">
                    <h3 className="text-sm font-black text-[var(--theme-text-main)] uppercase tracking-[0.02em] leading-tight">{item.name}</h3>
                </div>

                {/* ACTIONS - Horizontal Pill Theme */}
                <div className="mt-auto space-y-2.5">
                    {showActions && !isAdmin ? (
                        <>
                            {item.variants?.length > 0 ? (
                                <div className="flex flex-col gap-2.5">
                                    {/* Horizontal Variant Pills - Scrollable Rail */}
                                    <div className="relative group/rail flex items-center px-1">
                                        {/* Left Side Hint */}
                                        <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-40 group-hover/rail:opacity-100 transition-opacity">
                                            <ChevronLeft size={16} className="text-gray-900 animate-chevron-bounce-3d" strokeWidth={3} />
                                        </div>

                                        <div className="flex-1 flex items-center gap-1.5 bg-gray-50/80 dark:bg-white/5 p-1 rounded-xl border border-[var(--theme-border)] overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth min-h-[40px]">
                                            {item.variants.map((v, i) => {
                                                const isSelected = selectedSize?.name === v.name;
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedSize(v); }}
                                                        className={`flex-shrink-0 w-20 flex flex-col items-center justify-center py-1 px-1.5 rounded-lg transition-all duration-300 snap-center border-2 ${
                                                            isSelected 
                                                                ? 'bg-rose-500 text-white border-rose-600 shadow-md scale-[1.02]' 
                                                                : 'bg-white text-gray-400 border-gray-100 opacity-80 hover:border-rose-100'
                                                        }`}
                                                    >
                                                        <span className={`text-[7px] font-black uppercase tracking-widest leading-none ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>{v.name}</span>
                                                        <span className={`text-[9px] font-black mt-0.5 ${isSelected ? 'text-white' : 'text-gray-500'}`}>₹{v.price}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
 
                                        {/* Right Side Hint */}
                                        <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-40 group-hover/rail:opacity-100 transition-opacity">
                                            <ChevronRight size={16} className="text-gray-900 animate-chevron-bounce-3d [animation-delay:0.3s]" strokeWidth={3} />
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAdd(item, selectedSize); }}
                                        className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-black uppercase tracking-[0.15em] rounded-2xl shadow-[0_4px_15px_rgba(244,63,94,0.2)] active:scale-[0.97] transition-all flex items-center justify-center gap-2 border border-rose-400/20"
                                    >
                                        Add Item
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-xl md:text-2xl font-black text-[var(--theme-text-main)] leading-none tabular-nums tracking-tight">₹{item.price}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAdd(item); }}
                                        className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] rounded-2xl shadow-[0_4px_15px_rgba(244,63,94,0.3)] active:scale-[0.96] transition-all border border-rose-400/20"
                                    >
                                        Add Item
                                    </button>
                                </div>
                            )}

                            {/* Cart quantity overlay - Premium high-density design */}
                            {cartQty > 0 && (
                                <div className="flex items-center justify-center gap-1.5 pt-1 animate-in zoom-in-95 duration-200">
                                    <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-2xl p-1 border border-black/5 shadow-inner">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onRemove(selectedSize ? `${item._id}_${selectedSize.name}` : item._id); }} 
                                            className="w-8 h-8 flex items-center justify-center bg-rose-500 text-white rounded-xl shadow-lg active:scale-75 transition-all"
                                        >
                                            <Minus size={14} strokeWidth={4} />
                                        </button>
                                        <span className="w-8 text-center text-xs font-black text-gray-900 dark:text-white tabular-nums">{cartQty}</span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onAdd(item, selectedSize); }} 
                                            className="w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-xl shadow-lg active:scale-75 transition-all"
                                        >
                                            <Plus size={14} strokeWidth={4} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}

                    {showActions && isAdmin && (
                        <div className="flex items-center justify-center gap-2 pt-3 border-t border-[var(--theme-border)] mt-2">
                            <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2.5 text-[var(--theme-text-muted)] hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all">
                                <Edit size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(item._id); }} className="p-2.5 text-[var(--theme-text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default FoodItem;
