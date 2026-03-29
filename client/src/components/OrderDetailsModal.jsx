import { useEffect, useState } from 'react';
import {
    X, Clock, Utensils, Package,
    Printer, Plus, Check, CheckCircle, Loader2
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
    onUpdateStatus,
    userRole,
    settings = {},
    variant = 'overlay', // 'overlay' | 'panel'
}) => {
    const navigate = useNavigate();
    const [isRendered, setIsRendered] = useState(false);
    const [showPrintConfirm, setShowPrintConfirm] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative z-10 w-full max-w-sm bg-[var(--theme-bg-card)] rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="skeleton h-8 w-1/2 rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                    <div className="skeleton h-20 rounded-xl" />
                    <div className="skeleton h-20 rounded-xl" />
                </div>
            </div>
        </div>
    );


    const innerCard = (
        <div className="flex flex-col h-full">
            {/* iOS-STYLE HEADER */}
            <div className={`relative flex flex-col items-center text-center px-6 py-6 border-b border-[var(--theme-border)] flex-shrink-0 gap-1.5 ${variant === 'panel' ? 'bg-[var(--theme-bg-dark)]/10' : ''}`}>
                {variant === 'panel' && (
                    <button 
                        onClick={onClose}
                        className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--theme-text-muted)]"
                    >
                        <X size={18} />
                    </button>
                )}
                <div className="flex items-center gap-2 pr-4">
                    <h2 className="text-[18px] font-black uppercase tracking-tight text-[var(--theme-text-main)]">{(order.orderNumber || '').replace('ORD-', '#')}</h2>
                    <StatusBadge status={order.orderStatus} items={order.items || []} size="sm" />
                </div>

                
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-white/5 border border-[var(--theme-border)] rounded-lg text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-wider shadow-sm">
                        {order.items?.filter(i => i.status !== 'CANCELLED').length} Items
                    </span>

                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                        isPaid
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                    }`}>
                        {isPaid ? 'PAID' : 'UNPAID'}
                    </span>

                    {order.tokenNumber && (
                        <span className="bg-orange-500/10 text-orange-600 text-[10px] font-black px-2.5 py-1 rounded-lg border border-orange-200 uppercase tracking-wider shadow-sm">
                            TOKEN #{order.tokenNumber}
                        </span>
                    )}
                </div>

                <p className="text-[10px] text-[var(--theme-text-muted)] uppercase font-black tracking-[0.2em] flex items-center gap-2 mt-1">
                    <Clock size={12} className="text-blue-400" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <span className="opacity-30">•</span>
                    <span className="flex items-center gap-1">
                        {order.orderType === 'dine-in' ? <Utensils size={12} /> : <Package size={12} />}
                        {order.orderType}
                    </span>
                </p>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className={`${variant === 'panel' ? 'flex-1 overflow-y-auto' : 'flex-1 overflow-y-auto'} custom-scrollbar p-6 space-y-6`}>
                {/* FINANCIAL SUMMARY & SERVED STATUS */}
                <div className="flex bg-[var(--theme-bg-dark)]/30 rounded-2xl border border-[var(--theme-border)]/50 overflow-hidden shadow-inner">
                    {/* Left side: Action Button (The Tick Place) */}
                    <div className="w-[110px] sm:w-[130px] border-r border-[var(--theme-border)]/40 flex flex-col items-center justify-center p-4">
                         <button 
                            disabled={isUpdatingStatus || isPaid || isCancelled}
                            onClick={async () => {
                                if (isUpdatingStatus || isPaid || isCancelled) return;
                                if (!isReady) return; // Only allow serving if ready
                                try {
                                    setIsUpdatingStatus(true);
                                    if (onUpdateStatus) {
                                        await onUpdateStatus(order._id, 'completed');
                                        onClose();
                                    }
                                } finally {
                                    setIsUpdatingStatus(false);
                                }
                            }}
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xl border-2 active:scale-95
                                ${isCompleted 
                                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20' 
                                    : isReady
                                        ? 'bg-white dark:bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:border-emerald-400' 
                                        : 'bg-gray-100 dark:bg-white/5 border-[var(--theme-border)] text-[var(--theme-text-muted)] cursor-not-allowed opacity-40'
                                }`}
                         >
                            {isUpdatingStatus ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : isCompleted ? (
                                <CheckCircle size={32} strokeWidth={2.5} />
                            ) : (
                                <Check size={32} strokeWidth={3} className={isReady ? 'animate-pulse' : ''} />
                            )}
                         </button>
                         <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] opacity-70">Served</p>
                    </div>

                    {/* Right side: Detailed Breakdown */}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--theme-text-muted)]">Subtotal</span>
                                <span className="text-[12px] font-bold text-[var(--theme-text-main)] tabular-nums">{formatPrice(order.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--theme-text-muted)]">Tax (GST)</span>
                                <span className="text-[12px] font-bold text-[var(--theme-text-main)] tabular-nums">{formatPrice(order.tax)}</span>
                            </div>
                            {order.discount > 0 && (
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-blue-500">Discount</span>
                                    <span className="text-[12px] font-bold text-blue-500 tabular-nums">-{formatPrice(order.discount)}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-[var(--theme-border)]/50 flex justify-between items-end px-1">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 leading-none mb-0.5">Payment</span>
                                <span className="text-[28px] sm:text-[34px] font-black text-[var(--theme-text-main)] tracking-tighter leading-none tabular-nums">{formatPrice(order.finalAmount)}</span>
                            </div>
                            {isPaid && (
                                <span className="mb-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                                    PAID
                                </span>
                            )}
                        </div>
                    </div>
                </div>


                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b-2 border-[var(--theme-border)]">
                        <h3 className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                             Bill Items ({order.items?.length})
                        </h3>
                        {!isPaid && !isCancelled && !isCompleted && (
                            <button 
                                onClick={() => navigate(`/waiter/new-order?orderId=${order._id}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-600 rounded-lg hover:bg-orange-500 hover:text-white transition-all active:scale-90 border border-orange-500/20 shadow-sm group/add"
                            >
                                <Plus size={12} strokeWidth={4} />
                                <span className="text-[9px] font-black uppercase tracking-wider">Add Item</span>
                            </button>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        {order.items?.map((item, i) => {
                            const cancelled = item.status?.toUpperCase() === 'CANCELLED';
                            const addedAgo = item.createdAt ? Math.floor((Date.now() - new Date(item.createdAt)) / 60000) : null;
                            
                            return (
                                <div
                                    key={i}
                                    className={`group flex items-center justify-between p-3 rounded-2xl border transition-all ${cancelled
                                        ? 'opacity-40 bg-[var(--theme-bg-dark)] border-dashed border-[var(--theme-border)]'
                                        : 'bg-white dark:bg-[var(--theme-bg-hover)] border-[var(--theme-border)] hover:border-orange-500/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-white/5 border border-[var(--theme-border)] shrink-0">
                                            <span className="text-xs font-black">{item.quantity}</span>
                                        </div>
                                        
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-black truncate">{item.name}</p>
                                            <p className="text-[10px] font-bold opacity-40 uppercase tracking-wider">{formatPrice(item.price)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 ml-2">
                                        <div className="text-right">
                                            <p className="text-[13px] font-black tabular-nums text-[var(--theme-text-main)]">
                                                {formatPrice(item.price * item.quantity)}
                                            </p>
                                        </div>
                                        {(() => {
                                            const itemStatus = item.status?.toUpperCase();
                                            // Waiter: only PENDING items can be cancelled
                                            if (userRole === 'waiter' && itemStatus !== 'PENDING') return null;
                                            // Kitchen/Admin: PENDING, ACCEPTED, PREPARING only — never READY
                                            if (userRole !== 'admin' && itemStatus === 'READY') return null;
                                            // Don't show for already-cancelled or paid orders
                                            if (cancelled || isPaid || !onCancelItem) return null;
                                            return (
                                                <button
                                                    onClick={() => onCancelItem(order, item)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white"
                                                >
                                                    <X size={14} strokeWidth={3} />
                                                </button>
                                            );
                                        })()}

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );

    if (variant === 'panel') {
        return (
            <div className="flex flex-col w-full h-full bg-[var(--theme-bg-card)]">
                <div className="flex-1 overflow-y-auto">
                    {innerCard}
                </div>
                
                {/* Panel Footer Actions */}
                <div className="p-4 border-t border-[var(--theme-border)] bg-[var(--theme-bg-dark)]/30 space-y-2">
                    <button
                        disabled={isCancelled}
                        onClick={() => setShowPrintConfirm(true)}
                        className={`w-full h-12 flex items-center justify-center gap-2 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all shadow-lg ${
                            isCancelled
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95 shadow-orange-500/20'
                        }`}
                    >
                        <Printer size={16} strokeWidth={3} />
                        Print Bill
                    </button>


                </div>

                {/* Print Confirmation Popup */}
                {showPrintConfirm && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPrintConfirm(false)} />
                        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full max-w-[280px] animate-in zoom-in-95 duration-200">
                            <div className="p-8 flex flex-col items-center text-center gap-2 text-black">
                                <Printer size={32} className="text-orange-500 mb-2" />
                                <h4 className="text-lg font-black uppercase tracking-tight">Print Receipt?</h4>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Order {(order.orderNumber || '').replace('ORD-', '#')}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 border-t border-gray-100">
                                <button onClick={() => setShowPrintConfirm(false)} className="h-14 text-[12px] text-gray-400 font-black uppercase tracking-widest border-r border-gray-100 hover:bg-gray-50">No</button>
                                <button onClick={() => { printBill(order, formatPrice, settings); setShowPrintConfirm(false); }} className="h-14 text-[12px] text-orange-600 font-black uppercase tracking-widest hover:bg-orange-50">Print</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[6px]" onClick={onClose} />
            <div className={`relative z-10 w-[94%] xs:w-[90%] sm:max-w-[420px] md:max-w-[440px] bg-white dark:bg-[var(--theme-bg-card)] rounded-[2rem] shadow-[0_25px_70px_rgba(0,0,0,0.4)] flex flex-col max-h-[90vh] border border-[var(--theme-border)] transition-all duration-300 ease-out ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-10 scale-95'}`}>
                <div className="flex flex-col h-full overflow-hidden rounded-[2rem]">
                    {innerCard}
                    
                    {/* FOOTER ACTIONS (iOS STYLE) */}
                    <div className="grid grid-cols-2 border-t border-[var(--theme-border)] bg-gray-50/50 dark:bg-white/5 flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="h-16 flex items-center justify-center text-[13px] text-[var(--theme-text-muted)] font-black uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-white/10 active:bg-gray-200 transition-colors border-r border-[var(--theme-border)]"
                        >
                            Close
                        </button>

                        <button
                            disabled={isCancelled}
                            onClick={() => setShowPrintConfirm(true)}
                            className={`h-16 flex items-center justify-center text-[13px] font-black uppercase tracking-widest transition-all ${
                                isCancelled
                                    ? 'text-gray-300 cursor-not-allowed opacity-50'
                                    : 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 active:scale-95'
                            }`}
                        >
                            Print Ticket
                        </button>
                    </div>


                </div>

                {/* NESTED TOP POPUP: Print Confirmation (iOS Style) */}
                {showPrintConfirm && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-scale-in">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" onClick={() => setShowPrintConfirm(false)} />
                        <div className="relative bg-white rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col w-full max-w-[260px] animate-bounce-in">
                            <div className="p-6 flex flex-col items-center text-center gap-1.5 text-black">
                                <h4 className="text-[17px] font-black uppercase tracking-tight leading-tight">Print Ticket?</h4>
                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest leading-tight">
                                    {(order.orderNumber || '').replace('ORD-', '#')}
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-2 border-t border-gray-100">
                                <button 
                                    onClick={() => setShowPrintConfirm(false)}
                                    className="h-14 flex items-center justify-center text-[13px] text-gray-400 font-black uppercase tracking-widest hover:bg-gray-50 active:bg-gray-100 transition-colors border-r border-gray-100"
                                >
                                    No
                                </button>
                                <button 
                                    onClick={() => { printBill(order, formatPrice, settings); setShowPrintConfirm(false); }}
                                    className="h-14 flex items-center justify-center text-[13px] text-orange-600 font-black uppercase tracking-widest hover:bg-orange-50 active:bg-orange-100 transition-colors"
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
