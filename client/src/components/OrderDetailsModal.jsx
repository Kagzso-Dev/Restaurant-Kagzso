import { useEffect, useState } from 'react';
import {
    X, Clock, Utensils, Package, CreditCard,
    Printer, Wallet, CheckCircle2, ChefHat, Plus, XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { printBill } from './BillPrint';
import StatusBadge from './StatusBadge';

const formatTimeAgo = (minutes) => {
    if (minutes === null || minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        const remainingMins = minutes % 60;
        return `${hours}h${remainingMins > 0 ? ` ${remainingMins}m` : ''} ago`;
    }
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (days < 30) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
};

const OrderDetailsModal = ({
    order,
    isOpen,
    onClose,
    formatPrice,
    onProcessPayment,
    onCancelItem,
    onCancelOrder,
    userRole,
    settings = {},
    variant = 'overlay', // 'overlay' | 'panel'
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

        const s = item.status?.toUpperCase();

        // Items already cancelled — no button
        if (s === 'CANCELLED') return false;

        // Items already done in kitchen — permanently locked, never cancellable
        // even if new items were added and order status changed
        if (['READY', 'COMPLETED', 'PREPARING'].includes(s) && userRole === 'waiter') return false;
        if (['READY', 'COMPLETED'].includes(s)) return false;

        if (userRole === 'waiter') return s === 'PENDING';
        if (userRole === 'kitchen') return s === 'PENDING';
        if (userRole === 'admin' || userRole === 'cashier') return s === 'PENDING';
        return false;
    };

    /* ── Loading skeleton ─────────────────────────────────────────── */
    if (!order) return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
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

    const innerCard = (
        <>
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
                    <div className="flex items-center gap-2">
                        {/* Overall Order Cancel Button - Hidden if Ready (unless admin), or finished */}
                        {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (order.orderStatus !== 'ready' || userRole === 'admin') && (userRole === 'kitchen' || userRole === 'admin') && onCancelOrder && (
                            <button
                                onClick={() => onCancelOrder(order)}
                                className="w-9 h-9 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 rounded-xl text-rose-500 hover:text-white transition-all active:scale-90"
                                title="Cancel entire order"
                            >
                                <XCircle size={18} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-9 h-9 flex items-center justify-center bg-[var(--theme-bg-hover)] hover:bg-[var(--theme-border)] rounded-xl text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] transition-all active:scale-90"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-3 sm:space-y-4">

                    {/* TOP SECTION: INFO cards (Responsive Grid) */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        {/* Info Block - 7 cols from sm+ */}
                        <div className="sm:col-span-7 bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] rounded-2xl p-5 sm:p-6 shadow-inner relative overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between gap-2 py-1 px-1">

                                {/* Service */}
                                <div className="flex flex-col items-center gap-1 min-w-[60px]">
                                    <span className="text-[8px] font-black text-[var(--theme-text-muted)] uppercase tracking-wider opacity-60">Service</span>
                                    <div className={`p-1.5 rounded-lg border ${order.orderType === 'dine-in' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                                        {order.orderType === 'dine-in' ? <Utensils size={14} /> : <Package size={14} />}
                                    </div>
                                </div>

                                {/* Identity */}
                                <div className="flex flex-col items-center gap-1 min-w-[60px]">
                                    <span className="text-[8px] font-black text-[var(--theme-text-muted)] uppercase tracking-wider opacity-60">
                                        {order.orderType === 'dine-in' ? 'Table' : 'Token'}
                                    </span>
                                    <span className="font-black text-[var(--theme-text-main)] text-sm">{order.orderType === 'dine-in' ? (order.tableId?.number || order.tableId || '?') : (order.tokenNumber || '?')}</span>
                                </div>

                                {/* Payment */}
                                <div className="flex flex-col items-center gap-1 min-w-[60px]">
                                    <span className="text-[8px] font-black text-[var(--theme-text-muted)] uppercase tracking-wider opacity-60">Payment</span>
                                    <div className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                                    <span className={`text-[8px] font-black uppercase ${isPaid ? 'text-emerald-400' : 'text-rose-500'}`}>{isPaid ? 'Paid' : 'Unpaid'}</span>
                                </div>

                                {/* Status */}
                                <div className="flex flex-col items-center gap-1 min-w-[60px]">
                                    <span className="text-[8px] font-black text-[var(--theme-text-muted)] uppercase tracking-wider opacity-60">Kitchen</span>
                                    <StatusBadge status={order.orderStatus} size="sm" />
                                </div>
                            </div>


                        </div>

                        {/* Financial Block - 5 cols from sm+ */}
                        <div className={`sm:col-span-5 relative overflow-hidden rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-xl ${
                            isPaid
                                ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 border border-emerald-500/20 shadow-emerald-500/20 text-white'
                                : 'bg-slate-100 border border-slate-200 shadow-slate-200/50 text-slate-800'
                        }`}>
                            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
                            <div className="absolute bottom-0 left-0 w-20 h-20 bg-black/10 rounded-full blur-2xl" />
                            <div className="absolute top-3 right-3 opacity-10"><CreditCard size={44} strokeWidth={1} /></div>

                            {/* Header */}
                            <div className="relative z-10 flex items-center justify-between">
                                <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${isPaid ? 'text-white/60' : 'text-slate-500'}`}>Order Total</p>
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                    isPaid
                                        ? 'bg-white/20 border-white/30 text-white'
                                        : 'bg-slate-200 border-slate-300 text-slate-600'
                                }`}>
                                    {isPaid ? '✓ Paid' : 'Unpaid'}
                                </span>
                            </div>

                            {/* Final Amount */}
                            <div className="relative z-10">
                                <p className={`text-3xl sm:text-4xl font-black leading-none tracking-tighter drop-shadow-md break-all ${isPaid ? 'text-white' : 'text-slate-900'}`}>
                                    {formatPrice(order.finalAmount)}
                                </p>
                            </div>

                            {/* Breakdown */}
                            <div className={`relative z-10 pt-3 space-y-1.5 border-t ${isPaid ? 'border-white/15' : 'border-slate-200'}`}>
                                <div className={`flex justify-between text-[9px] font-bold uppercase tracking-widest ${isPaid ? 'text-white/60' : 'text-slate-500'}`}>
                                    <span>Subtotal</span>
                                    <span className={isPaid ? '' : 'text-slate-700'}>{formatPrice(order.totalAmount)}</span>
                                </div>
                                {order.tax > 0 && (
                                    <div className={`flex justify-between text-[9px] font-bold uppercase tracking-widest ${isPaid ? 'text-white/60' : 'text-slate-500'}`}>
                                        <span>Tax</span>
                                        <span className={isPaid ? '' : 'text-slate-700'}>+ {formatPrice(order.tax)}</span>
                                    </div>
                                )}
                                {order.discount > 0 && (
                                    <div className="flex justify-between text-[9px] font-bold text-emerald-300 uppercase tracking-widest">
                                        <span>Discount</span>
                                        <span>- {formatPrice(order.discount)}</span>
                                    </div>
                                )}
                                <div className={`flex justify-between text-[9px] font-black uppercase tracking-widest pt-1 border-t ${isPaid ? 'border-white/10 text-white/40' : 'border-slate-200 text-slate-400'}`}>
                                    <span>{order.items?.filter(i => i.status !== 'CANCELLED').length || order.items?.length} items</span>
                                    {order.paymentMethod && <span>{order.paymentMethod}</span>}
                                </div>
                            </div>
                        </div>
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
                                        if (!order?._id) {
                                            alert("Order ID not found. Please refresh and try again.");
                                            return;
                                        }
                                        onClose();
                                        navigate(`/waiter/new-order?orderId=${order._id}`);
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
                                const isNewItem = item.status?.toUpperCase() === 'PENDING' && (new Date(item.createdAt || Date.now()) - new Date(order.createdAt)) > 30000;
                                const addedAgo = item.createdAt ? Math.floor((Date.now() - new Date(item.createdAt)) / 60000) : null;
                                
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
                                                    <StatusBadge
                                                        status={
                                                            cancelled ? 'CANCELLED' :
                                                            order.orderStatus === 'ready' ? 'READY' :
                                                            // Item-level status is authoritative for locked states otherwise
                                                            ['READY', 'COMPLETED', 'PREPARING'].includes(item.status?.toUpperCase())
                                                                ? item.status.toUpperCase()
                                                                : (item.status || 'PENDING').toUpperCase()
                                                        }
                                                        size="xs"
                                                    />
                                                    <span className="text-[10px] text-[var(--theme-text-muted)] font-bold opacity-40">@ {formatPrice(item.price)}</span>
                                                    {addedAgo !== null && addedAgo >= 1 && !cancelled && (
                                                        <span className="text-[9px] text-blue-400 font-bold italic flex items-center gap-1">
                                                            <Clock size={10} /> {formatTimeAgo(addedAgo)}
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
                </div>
                {/* FOOTER ACTIONS */}
                <div className={`px-5 py-4 border-t border-[var(--theme-border)] grid gap-3 shrink-0 ${userRole === 'waiter' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {!isPaid && !isCancelled && onProcessPayment ? (
                        <button
                            onClick={() => onProcessPayment(order)}
                            className="col-span-1 py-3.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider active:scale-95"
                        >
                            <Wallet size={18} strokeWidth={3} className="shrink-0" />
                            <span className="leading-tight text-center">Complete Payment</span>
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="col-span-1 py-3.5 bg-[var(--theme-bg-hover)] hover:bg-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] font-black rounded-2xl transition-all border border-[var(--theme-border)] flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider active:scale-95"
                        >
                            <span className="leading-tight text-center">Return to Hub</span>
                        </button>
                    )}
                    {userRole !== 'waiter' && (
                        <button
                            disabled={!isPaid || isCancelled}
                            onClick={() => printBill(order, formatPrice, settings)}
                            className={`col-span-1 py-3.5 font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider active:scale-95 ${isPaid && !isCancelled
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/30'
                                : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed opacity-40'
                            }`}
                        >
                            <Printer size={18} strokeWidth={3} className="shrink-0" />
                            <span className="leading-tight text-center">
                                {isPaid ? 'Print KOT/Invoice' : 'Payment Required'}
                            </span>
                        </button>
                    )}
                </div>
        </>
    );

    if (variant === 'panel') {
        return (
            <div className="flex flex-col h-full w-full bg-[var(--theme-bg-card)]">
                {innerCard}
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 z-[200] flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className={`relative z-10 w-full sm:w-[500px] md:w-[600px] lg:w-[650px] bg-[var(--theme-bg-card)] shadow-[-20px_0_50px_rgba(0,0,0,0.2)] flex flex-col h-full border-l border-[var(--theme-border)] transition-transform duration-300 ease-out sm:rounded-l-[2rem] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {innerCard}
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
