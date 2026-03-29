import { useEffect, useState } from 'react';
import {
    X, Clock, Utensils, Package, CreditCard,
    Printer, Wallet, Plus, XCircle, ChevronLeft
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
    const [showPrintConfirm, setShowPrintConfirm] = useState(false);

    useEffect(() => {
        if (variant === 'panel') {
            setIsRendered(!!isOpen);
            return;
        }
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setIsRendered(true);
        } else {
            document.body.style.overflow = '';
            const timer = setTimeout(() => setIsRendered(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen, variant]);

    if (!isRendered) return null;

    const isPaid = order?.paymentStatus === 'paid';
    const isCompleted = order?.orderStatus === 'completed';
    const isCancelled = order?.orderStatus === 'cancelled';
    const isReady = order?.orderStatus === 'ready';

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
                        
                        {/* Items badge */}
                        <span className="px-2 py-0.5 bg-[var(--theme-bg-muted)] border border-[var(--theme-border)] rounded-md text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-wider">
                            {order.items?.filter(i => i.status !== 'CANCELLED').length} Items
                        </span>

                        {/* Payment badge */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                            isPaid
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                        }`}>
                            {isPaid ? 'PAID' : 'UNPAID'}
                        </span>

                        {order.orderType === 'takeaway' && order.tokenNumber && (
                            <span className="bg-orange-500 text-white text-[12px] font-black px-2 py-0.5 rounded-md shadow-sm">
                                TOKEN #{order.tokenNumber}
                            </span>
                        )}
                    </div>
                    <p className="text-[12px] text-[var(--theme-text-muted)] uppercase font-bold tracking-widest flex items-center gap-2">
                        <Clock size={12} className="text-blue-400" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span className="opacity-30">•</span>
                        <span className="flex items-center gap-1">
                            {order.orderType === 'dine-in' ? <Utensils size={12} /> : <Package size={12} />}
                            {order.orderType}
                        </span>
                    </p>
                </div>
                 <div className="flex items-center gap-2">
                    {/* Return to Hub */}
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center bg-[var(--theme-bg-hover)] hover:bg-[var(--theme-border)] rounded-xl text-[var(--theme-text-muted)] hover:text-orange-500 transition-all active:scale-90 border border-[var(--theme-border)] shadow-sm"
                        title="Return to Hub"
                    >
                        <ChevronLeft size={18} strokeWidth={3} />
                    </button>

                    {/* Print Order Ticket */}
                    <button
                        disabled={isCancelled}
                        onClick={() => setShowPrintConfirm(true)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm border ${
                            isCancelled
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-40 border-gray-700'
                                : 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500 hover:text-white active:scale-90'
                        }`}
                        title="Print Order Ticket"
                    >
                        <Printer size={18} strokeWidth={3} />
                    </button>

                    {/* Quick Cancel (Admin/Kitchen) */}
                    {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (order.orderStatus !== 'ready' || userRole === 'admin') && (userRole === 'kitchen' || userRole === 'admin') && onCancelOrder && (
                        <button
                            onClick={() => onCancelOrder(order)}
                            className="w-9 h-9 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 rounded-xl text-rose-500 hover:text-white transition-all active:scale-90 border border-rose-500/20"
                            title="Cancel entire order"
                        >
                            <XCircle size={18} strokeWidth={3} />
                        </button>
                    )}

                    {/* Close Modal */}
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center bg-[var(--theme-bg-hover)] hover:bg-[var(--theme-border)] rounded-xl text-[var(--theme-text-muted)] hover:text-rose-500 transition-all active:scale-90 border border-[var(--theme-border)] shadow-sm"
                        title="Close"
                    >
                        <X size={18} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className={`${variant === 'panel' ? '' : 'flex-1 overflow-y-auto'} custom-scrollbar p-4 sm:p-5 space-y-3 sm:space-y-4`}>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className={`sm:col-span-12 relative overflow-hidden rounded-[2rem] p-6 sm:p-7 shadow-xl transition-all duration-300 ${
                        isPaid
                            ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 border border-emerald-500/20 text-white'
                            : 'bg-white border border-slate-200 text-slate-800'
                    }`}>
                        <div className="relative z-10 grid grid-cols-[1fr_1.25fr] gap-4 items-center">
                            {/* LEFT COLUMN: Summary Breakout */}
                            <div className="space-y-3 min-w-0">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 truncate">Financial Summary</p>
                                    <div className="flex justify-between items-center text-[11px] font-bold">
                                        <span className="opacity-60">Subtotal</span>
                                        <span className="tabular-nums">{formatPrice(order.totalAmount)}</span>
                                    </div>
                                    {order.tax > 0 ? (
                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                            <span className="opacity-40 uppercase tracking-widest">Tax (GST)</span>
                                            <span className="tabular-nums opacity-60">+{formatPrice(order.taxAmount || order.tax || 0)}</span>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center text-[11px] font-bold">
                                            <span className="opacity-60">Tax & Fees</span>
                                            <span className="tabular-nums">{formatPrice(0)}</span>
                                        </div>
                                    )}
                                    {order.discount > 0 && (
                                        <div className="flex justify-between items-center text-[11px] font-black text-emerald-500">
                                            <span>Discount</span>
                                            <span className="tabular-nums">-{formatPrice(order.discount)}</span>
                                        </div>
                                    )}
                                </div>
                                {order.paymentMethod && (
                                    <div className="pt-1.5 border-t border-current/10 flex items-center justify-between gap-1 overflow-hidden">
                                         <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Payment</p>
                                         <p className="text-[9px] font-black uppercase tracking-tight opacity-80 truncate">{order.paymentMethod}</p>
                                    </div>
                                )}
                            </div>

                            {/* VERTICAL DIVIDER */}
                            <div className="absolute left-[44%] top-4 bottom-4 w-px bg-current/10" />

                            {/* RIGHT COLUMN: Grand Total */}
                            <div className="flex flex-col items-end text-right min-w-0 pl-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 opacity-50 whitespace-nowrap">Order Total</p>
                                <p className="text-3xl sm:text-4xl font-black leading-none tracking-tighter drop-shadow-sm whitespace-nowrap">
                                    {formatPrice(order.finalAmount)}
                                </p>
                                <div className="mt-3">
                                     <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                         isPaid ? 'bg-white/20 border-white/20' : 'bg-slate-100 border-slate-200 text-slate-500'
                                     }`}>
                                         {isPaid ? 'Verified' : 'Balance Due'}
                                     </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b-2 border-[var(--theme-border)]">
                        <h3 className="text-sm font-black text-[var(--theme-text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                            <Utensils size={14} className="text-orange-500" /> Bill Items ({order.items?.length})
                        </h3>
                        {!isCancelled && !isCompleted && !isPaid && (
                            <button
                                onClick={() => navigate(`/waiter/new-order?orderId=${order._id}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-sm shadow-orange-500/30 transition-all duration-150"
                            >
                                <Plus size={13} strokeWidth={3} />
                                Add Item
                            </button>
                        )}
                    </div>
                    
                    <div className="space-y-3">
                        {order.items?.map((item, i) => {
                            const cancelled = item.status?.toUpperCase() === 'CANCELLED';
                            const addedAgo = item.createdAt ? Math.floor((Date.now() - new Date(item.createdAt)) / 60000) : null;
                            
                            return (
                                <div
                                    key={i}
                                    className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all group/item shadow-sm ${cancelled
                                        ? 'opacity-40 bg-[var(--theme-bg-dark)] grayscale border-dashed border-[var(--theme-border)]'
                                        : 'bg-[var(--theme-bg-card)] border-[var(--theme-border)] hover:border-orange-500/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center border border-[var(--theme-border)] bg-[var(--theme-bg-card)] shadow-inner shrink-0">
                                            <span className="text-sm font-black leading-none">{item.quantity}</span>
                                            <span className="text-[10px] font-black opacity-40 uppercase">Qty</span>
                                        </div>
                                        
                                        <div className="min-w-0">
                                            <p className="text-base font-black truncate">{item.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <StatusBadge status={cancelled ? 'CANCELLED' : item.status || 'PENDING'} size="xs" />
                                                <span className="text-[11px] font-bold opacity-40">@ {formatPrice(item.price)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 pl-4">
                                        <div className="text-right flex flex-col items-end">
                                            <p className="text-base font-black tabular-nums text-blue-400">
                                                {formatPrice(item.price * item.quantity)}
                                            </p>
                                            {addedAgo >= 1 && !cancelled && (
                                                <span className="text-[10px] text-blue-400/70 font-bold flex items-center gap-1 mt-0.5">
                                                    <Clock size={10} /> {formatTimeAgo(addedAgo)}
                                                </span>
                                            )}
                                        </div>
                                        {!cancelled && (
                                            <button
                                                disabled={item.status === 'ready' || item.status === 'completed' || order.orderStatus === 'ready' || order.orderStatus === 'completed'}
                                                onClick={() => onCancelItem && onCancelItem(order, item)}
                                                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm ${
                                                    (item.status === 'ready' || item.status === 'completed' || order.orderStatus === 'ready' || order.orderStatus === 'completed')
                                                        ? 'bg-gray-500/10 text-gray-400 cursor-not-allowed opacity-30 select-none'
                                                        : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white active:scale-90'
                                                }`}
                                                title="Cancel item"
                                            >
                                                <X size={16} strokeWidth={3} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );

    if (variant === 'panel') {
        return (
            <div className="flex flex-col w-full bg-[var(--theme-bg-card)]">
                {innerCard}
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 z-[200] flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className={`relative z-10 w-full sm:w-[500px] md:w-[600px] bg-[var(--theme-bg-card)] shadow-2xl flex flex-col h-full border-l border-[var(--theme-border)] transition-transform duration-300 ease-out sm:rounded-l-[2rem] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {innerCard}

            {/* ── TOP POPUP: Print Confirmation (iOS Style) ── */}
            {showPrintConfirm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-scale-in">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" onClick={() => setShowPrintConfirm(false)} />
                    <div className="relative bg-white rounded-[1.3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col w-full max-w-[270px] sm:max-w-[280px]">
                        {/* Content Block */}
                        <div className="p-6 flex flex-col items-center text-center gap-1.5 text-black">
                            <h4 className="text-[17px] font-semibold tracking-tight leading-tight">Print Receipt?</h4>
                            <p className="text-[13px] text-gray-600 leading-tight">
                                Send {order.orderNumber} to printer?
                            </p>
                        </div>
                        
                        {/* Buttons Block (iOS Style) */}
                        <div className="grid grid-cols-2 border-t border-gray-200">
                            <button 
                                onClick={() => setShowPrintConfirm(false)}
                                className="h-12 flex items-center justify-center text-[17px] text-[#007AFF] font-normal hover:bg-gray-50 active:bg-gray-100 transition-colors border-r border-gray-200"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => { printBill(order, formatPrice, settings); setShowPrintConfirm(false); }}
                                className="h-12 flex items-center justify-center text-[17px] text-[#FF3B30] font-semibold hover:bg-gray-50 active:bg-gray-100 transition-colors"
                            >
                                Print
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default OrderDetailsModal;
