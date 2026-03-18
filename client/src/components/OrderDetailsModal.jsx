import { useEffect, useState } from 'react';
import {
    X, Clock, Utensils, Package, CreditCard,
    Printer, Wallet, CheckCircle2, ChefHat, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { printBill } from './BillPrint';
import StatusBadge from './StatusBadge';

const OrderDetailsModal = ({
    order,
    isOpen,
    onClose,
    formatPrice,
    onProcessPayment,
    onCancelItem,
    userRole,
    settings = {},
}) => {
    const navigate = useNavigate();
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setIsRendered(true);
        } else {
            document.body.style.overflow = '';
            const timer = setTimeout(() => setIsRendered(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isRendered) return null;

    const isPaid = order?.paymentStatus === 'paid';
    const isCompleted = order?.orderStatus === 'completed';
    const isCancelled = order?.orderStatus === 'cancelled';

    const isReady = order?.orderStatus === 'ready';

    const canCancelItem = (item) => {
        if (!onCancelItem || isCompleted || isCancelled || isReady) return false;
        if (item.status === 'CANCELLED' || item.status === 'Cancelled') return false;
        const s = item.status?.toUpperCase();
        if (userRole === 'waiter') return s === 'PENDING';
        if (userRole === 'kitchen') return ['PENDING', 'PREPARING'].includes(s);
        if (userRole === 'admin' || userRole === 'cashier') return true;
        return false;
    };

    /* ── Loading skeleton ─────────────────────────────────────────── */
    if (!order) return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-sm bg-[var(--theme-bg-card)] rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="skeleton h-8 w-1/2 rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                    <div className="skeleton h-20 rounded-xl" />
                    <div className="skeleton h-20 rounded-xl" />
                </div>
                <div className="skeleton h-12 rounded-xl" />
                <div className="skeleton h-12 rounded-xl" />
            </div>
        </div>
    );

    return (
        /* ── Overlay ──────────────────────────────────────────────────────── */
        <div
            className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* ── Modal Card ───────────────────────────────────────────────── */}
            <div
                className={`relative z-10 w-full ${userRole === 'waiter' ? 'sm:max-w-lg md:max-w-xl lg:max-w-2xl' : 'sm:max-w-md'} bg-[var(--theme-bg-card)] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] border border-[var(--theme-border)] transition-all duration-300 ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'}`}
            >
                {/* HEADER */}
                <div className="px-5 py-4 sm:py-5 flex items-start justify-between border-b border-[var(--theme-border)] shrink-0 gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-black text-[var(--theme-text-main)] tracking-tighter uppercase">{order.orderNumber}</h2>
                            <StatusBadge status={order.orderStatus} size="sm" />
                            {order.orderType === 'takeaway' && order.tokenNumber && (
                                <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm shadow-orange-500/20">
                                    TOKEN #{order.tokenNumber}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-[var(--theme-text-muted)] uppercase font-bold tracking-widest flex items-center gap-2">
                            <Clock size={12} className="text-blue-400" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="opacity-30">•</span>
                            <span className="flex items-center gap-1">
                                {order.orderType === 'dine-in' ? <Utensils size={12} /> : <Package size={12} />}
                                {order.orderType}
                            </span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center bg-[var(--theme-bg-hover)] hover:bg-[var(--theme-border)] rounded-xl text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] transition-all active:scale-90"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4 sm:space-y-6">

                    {/* TOP SECTION: INFO cards (Responsive Grid) */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        {/* Info Block - 7 cols on tablet+ */}
                        <div className="sm:col-span-8 bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] rounded-2xl p-5 sm:p-6 shadow-inner relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/40" />
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-[0.2em]">Live Tracking</p>
                                    <h4 className="text-[11px] font-bold text-[var(--theme-text-subtle)] mt-0.5">Real-time status monitor</h4>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-wider border border-blue-500/20">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    Active
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                                {/* Service Block */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest opacity-60">Service</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg border ${order.orderType === 'dine-in' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                                            {order.orderType === 'dine-in' ? <Utensils size={14} /> : <Package size={14} />}
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-tight ${order.orderType === 'dine-in' ? 'text-blue-400' : 'text-orange-400'}`}>
                                            {order.orderType}
                                        </span>
                                    </div>
                                </div>

                                {/* Identity Block */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest opacity-60">
                                        {order.orderType === 'dine-in' ? 'Table ID' : 'Token ID'}
                                    </span>
                                    <div>
                                        <span className="inline-flex items-center justify-center min-w-[36px] h-8 font-black text-[var(--theme-text-main)] px-3 bg-[var(--theme-bg-hover)] rounded-xl border-2 border-[var(--theme-border)] shadow-sm text-sm">
                                            {order.orderType === 'dine-in' ? (order.tableId?.number || order.tableId || '?') : (order.tokenNumber || '?')}
                                        </span>
                                    </div>
                                </div>

                                {/* Payment Block */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest opacity-60">Payment</span>
                                    <div>
                                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1 rounded-full border ${isPaid
                                            ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-rose-600/10 text-rose-500 border-rose-500/20'
                                        }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            {isPaid ? 'Settled' : 'Unpaid'}
                                        </span>
                                    </div>
                                </div>

                                {/* Status Block */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest opacity-60">Kitchen</span>
                                    <div className="flex items-center">
                                        <StatusBadge status={order.orderStatus} size="sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Block - 5 cols on tablet+ */}
                        {userRole === 'waiter' ? (
                            <div className="sm:col-span-4 relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 border border-blue-500/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl shadow-blue-500/20 group">
                                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-3xl transition-transform group-hover:scale-150" />
                                <div className="absolute top-4 right-4 opacity-10"><CreditCard size={48} strokeWidth={1} /></div>
                                
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-auto relative z-10">Total Bill</p>
                                
                                <div className="relative z-10 mt-4">
                                    <p className="text-3xl font-black text-white leading-none tracking-tighter drop-shadow-md">{formatPrice(order.finalAmount)}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">{order.items?.length} Items</span>
                                        <span className="w-1 h-1 rounded-full bg-white/30" />
                                        <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Sub: {formatPrice(order.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="sm:col-span-4 bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-inner relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--theme-border)] opacity-5 -mr-8 -mt-8 rounded-full" />
                                <p className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-[0.2em] mb-auto">Order Total</p>
                                <div className="mt-4">
                                    <p className="text-3xl font-black text-[var(--theme-text-main)] leading-none tracking-tighter">{formatPrice(order.finalAmount)}</p>
                                    <p className="text-[10px] text-[var(--theme-text-muted)] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1">
                                        Full settled amount
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ITEM LIST */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b-2 border-[var(--theme-border)]">
                            <h3 className="text-xs font-black text-[var(--theme-text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                                <Utensils size={14} className="text-orange-500" /> Bill Items ({order.items?.length})
                            </h3>
                            {!isPaid && !isCancelled && !isCompleted && userRole === 'waiter' && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate(`/new-order?orderId=${order._id}`);
                                    }}
                                    className="h-8 px-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg shadow-lg shadow-orange-600/20 transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider active:scale-95"
                                >
                                    <Plus size={14} strokeWidth={4} /> Add New
                                </button>
                            )}
                        </div>
                        
                        <div className="space-y-3">
                            {order.items?.map((item, i) => {
                                const cancelled = item.status?.toUpperCase() === 'CANCELLED';
                                const isNewItem = item.status?.toUpperCase() === 'PENDING' && (new Date(item.addedAt || item.updatedAt || Date.now()) - new Date(order.createdAt)) > 30000;
                                const addedAgo = item.addedAt ? Math.floor((Date.now() - new Date(item.addedAt)) / 60000) : null;
                                
                                return (
                                    <div
                                        key={i}
                                        className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all relative overflow-hidden group/item ${cancelled
                                            ? 'opacity-40 bg-[var(--theme-bg-dark)] grayscale border-dashed border-[var(--theme-border)]'
                                            : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] hover:border-orange-500/30 hover:bg-[var(--theme-bg-hover)]'
                                        }`}
                                    >
                                        {isNewItem && !cancelled && (
                                            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]" />
                                        )}
                                        
                                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex flex-col items-center justify-center border shadow-inner shrink-0 ${
                                                isNewItem ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : 'bg-[var(--theme-bg-deep)] border-[var(--theme-border)] text-[var(--theme-text-main)]'
                                            }`}>
                                                <span className="text-sm sm:text-base font-black leading-none">{item.quantity}</span>
                                                <span className="text-[7px] font-black opacity-40 uppercase tracking-tighter">Qty</span>
                                            </div>
                                            
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-sm font-black tracking-tight truncate ${cancelled ? 'line-through text-[var(--theme-text-muted)]' : 'text-[var(--theme-text-main)]'}`}>
                                                        {item.name}
                                                    </p>
                                                    {isNewItem && !cancelled && (
                                                        <span className="bg-orange-500/10 text-orange-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse">New</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <StatusBadge status={item.status || 'Pending'} size="xs" />
                                                    <span className="text-[10px] text-[var(--theme-text-muted)] font-bold opacity-40">@ {formatPrice(item.price)}</span>
                                                    {addedAgo !== null && addedAgo >= 1 && !cancelled && (
                                                        <span className="text-[9px] text-blue-400 font-bold italic flex items-center gap-1">
                                                            <Clock size={10} /> {addedAgo}m ago
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pl-4">
                                            <div className="text-right">
                                                <p className={`text-sm sm:text-base font-black tabular-nums ${cancelled ? 'line-through text-[var(--theme-text-muted)]' : 'text-blue-400'}`}>
                                                    {formatPrice(item.price * item.quantity)}
                                                </p>
                                            </div>
                                            {canCancelItem(item) && (
                                                <button
                                                    onClick={() => onCancelItem(order, item)}
                                                    className="w-8 h-8 flex items-center justify-center bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                                                >
                                                    <X size={14} strokeWidth={3} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* STATUS BANNER */}
                    {!isCancelled && (
                        <div className="flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl shadow-inner">
                            <div 
                                className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors shadow-sm"
                                style={{ 
                                    backgroundColor: order.orderStatus?.toLowerCase() === 'completed' ? 'rgba(16, 185, 129, 0.2)' : `var(--status-${order.orderStatus?.toLowerCase()}-bg)`,
                                    color: order.orderStatus?.toLowerCase() === 'completed' ? '#10b981' : `var(--status-${order.orderStatus?.toLowerCase()})`
                                }}
                            >
                                {isCompleted ? <CheckCircle2 size={20} strokeWidth={3} /> : <ChefHat size={20} strokeWidth={3} />}
                            </div>
                            <div>
                                <p className="text-xs font-black text-[var(--theme-text-main)]">
                                    {isCompleted ? 'Order successfully served' : 'Cooking in progress...'}
                                </p>
                                <p className="text-[10px] text-[var(--theme-text-muted)] uppercase tracking-[0.15em] font-black mt-0.5 opacity-60">
                                    Ref: {order._id.slice(-8).toUpperCase()}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className={`px-5 py-4 border-t border-[var(--theme-border)] grid gap-3 shrink-0 ${userRole === 'waiter' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {!isPaid && !isCancelled && onProcessPayment ? (
                        <button
                            onClick={() => onProcessPayment(order)}
                            className="col-span-1 py-3.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:scale-95"
                        >
                            <Wallet size={16} strokeWidth={3} /> Complete Payment
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="col-span-1 py-3.5 bg-[var(--theme-bg-hover)] hover:bg-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] font-black rounded-2xl transition-all border border-[var(--theme-border)] flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:scale-95"
                        >
                            Return to Hub
                        </button>
                    )}
                    {userRole !== 'waiter' && (
                        <button
                            disabled={!isPaid || isCancelled}
                            onClick={() => printBill(order, formatPrice, settings)}
                            className={`col-span-1 py-3.5 font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:scale-95 ${isPaid && !isCancelled
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/30'
                                : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed opacity-40'
                            }`}
                        >
                            <Printer size={16} strokeWidth={3} /> {isPaid ? 'Print KOT/Invoice' : 'Payment Required'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const InfoRow = ({ label, children }) => (
    <div className="flex items-center justify-between">
        <div className="text-[11px] font-black text-[var(--theme-text-muted)] flex items-center gap-2 uppercase tracking-wide opacity-80">
            {label}
        </div>
        <div>{children}</div>
    </div>
);

export default OrderDetailsModal;
