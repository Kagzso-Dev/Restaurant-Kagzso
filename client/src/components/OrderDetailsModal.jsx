import { useEffect, useState } from 'react';
import {
    X, Clock, Utensils, CreditCard,
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
                className={`relative z-10 w-full ${userRole === 'waiter' ? 'sm:max-w-lg md:max-w-xl' : 'sm:max-w-md'} bg-[var(--theme-bg-card)] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] border border-[var(--theme-border)] transition-all duration-300 ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'}`}
            >
                {/* HEADER */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--theme-border)] shrink-0">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-[var(--theme-text-main)] tracking-tight">{order.orderNumber}</h2>
                            <StatusBadge status={order.orderStatus} />
                        </div>
                        <p className="text-[10px] text-[var(--theme-text-muted)] uppercase font-bold tracking-widest flex items-center gap-1">
                            <Clock size={10} /> {new Date(order.createdAt).toLocaleTimeString()} · {order.orderType}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center bg-[var(--theme-bg-hover)] hover:bg-[var(--theme-border)] rounded-full text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

                    {/* INFO & FINANCIALS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Order Details */}
                        <div className="bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] rounded-2xl p-4 space-y-3 shadow-inner">
                            <p className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-[0.2em]">Live Status</p>
                            <InfoRow label={<><Utensils size={14} className="text-blue-400" /> Dining</>}>
                                <span className="text-[11px] font-black text-[var(--theme-text-main)] uppercase tracking-tight">{order.orderType}</span>
                            </InfoRow>
                            {order.orderType === 'dine-in' && (
                                <InfoRow label="Table">
                                    <span className="text-[11px] font-black text-orange-500">T-{order.tableId?.number || order.tableId}</span>
                                </InfoRow>
                            )}
                            <InfoRow label={<><CreditCard size={14} className={isPaid ? 'text-emerald-400' : 'text-rose-400'} /> Bill</>}>
                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${isPaid
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                }`}>
                                    {isPaid ? 'Settled' : 'Unpaid'}
                                </span>
                            </InfoRow>
                        </div>

                        {/* Bill Summary */}
                        {userRole === 'waiter' ? (
                            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-lg shadow-blue-500/20">
                                <div className="absolute top-0 right-0 p-1 opacity-20"><CreditCard size={64} strokeWidth={1} /></div>
                                <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-2 relative z-10">Grand Total</p>
                                <div className="relative z-10">
                                    <p className="text-2xl font-black text-white leading-none tracking-tighter">{formatPrice(order.finalAmount)}</p>
                                    <p className="text-[10px] text-white/60 mt-1 font-bold">Sub: {formatPrice(order.totalAmount)}</p>
                                </div>
                                <div className={`mt-3 w-8 h-8 rounded-xl flex items-center justify-center border relative z-10 ${isPaid
                                    ? 'bg-white/20 border-white/30 text-white'
                                    : 'bg-black/20 border-white/10 text-white/40'
                                }`}>
                                    <CheckCircle2 size={18} strokeWidth={3} />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] rounded-2xl p-4 flex flex-col justify-between shadow-inner">
                                <p className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-[0.2em] mb-2">Order Summary</p>
                                <div>
                                    <p className="text-2xl font-black text-[var(--theme-text-main)] leading-none">{formatPrice(order.finalAmount)}</p>
                                    <p className="text-[10px] text-[var(--theme-text-muted)] mt-1 font-bold">Total Bill Amount</p>
                                </div>
                                <div className={`mt-3 w-8 h-8 rounded-xl flex items-center justify-center border ${isPaid
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-[var(--theme-bg-hover)] border-[var(--theme-border)] text-[var(--theme-text-muted)] opacity-30'
                                }`}>
                                    <CheckCircle2 size={18} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ITEM LIST */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-[var(--theme-border)]">
                            <h3 className="text-xs font-black text-[var(--theme-text-muted)] uppercase tracking-widest">
                                Ordered Items ({order.items?.length})
                            </h3>
                            <div className="flex items-center gap-2">
                                {!isPaid && !isCancelled && userRole === 'waiter' && (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            navigate(`/new-order?orderId=${order._id}`);
                                        }}
                                        className="h-9 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider active:scale-95 border-none"
                                    >
                                        <Plus size={16} strokeWidth={4} /> Add Item
                                    </button>
                                )}
                                {isCancelled && <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-wider border border-rose-500/20">Cancelled</span>}
                            </div>
                        </div>
                        <div className="space-y-3">
                            {order.items?.map((item, i) => {
                                const cancelled = item.status?.toUpperCase() === 'CANCELLED';
                                return (
                                    <div
                                        key={i}
                                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all group ${cancelled
                                            ? 'opacity-30 bg-rose-500/5 border-rose-500/10'
                                            : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] hover:border-blue-400/50 hover:bg-[var(--theme-bg-hover)] hover:shadow-xl hover:shadow-blue-500/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--theme-bg-hover)] to-[var(--theme-border)] flex flex-col items-center justify-center border border-[var(--theme-border)] shadow-inner">
                                                <span className="text-[14px] font-black text-[var(--theme-text-main)]">{item.quantity}</span>
                                                <span className="text-[7px] font-bold text-[var(--theme-text-muted)] -mt-1 uppercase">QTY</span>
                                            </div>
                                            <div>
                                                <p className={`text-sm font-black tracking-tight ${cancelled ? 'line-through text-[var(--theme-text-muted)]' : 'text-[var(--theme-text-main)]'}`}>{item.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <StatusBadge status={item.status || 'Pending'} size="xs" />
                                                    <span className="text-[10px] text-[var(--theme-text-muted)] font-bold opacity-60">@ {formatPrice(item.price)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className={`text-sm font-black tabular-nums ${cancelled ? 'line-through text-[var(--theme-text-muted)]' : 'text-blue-400 group-hover:scale-105 transition-transform'}`}>
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
