import { useEffect, useState } from 'react';
import {
    X, Clock, Utensils, CreditCard,
    Printer, Wallet, CheckCircle2, ChefHat
} from 'lucide-react';
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

    const canCancelItem = (item) => {
        if (!onCancelItem || isCompleted || isCancelled) return false;
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
            <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-4">
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
            className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* ── Centered Square Box ───────────────────────────────────────── */}
            <div
                className={`relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col max-h-[88vh] transition-all duration-200 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
            >
                {/* HEADER */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">{order.orderNumber}</h2>
                            <StatusBadge status={order.orderStatus} />
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest flex items-center gap-1">
                            <Clock size={10} /> {new Date(order.createdAt).toLocaleTimeString()} · {order.orderType}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

                    {/* INFO & FINANCIALS */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Order Details */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2.5">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Live Status</p>
                            <InfoRow label={<><Utensils size={12} className="text-blue-500" /> Dining</>}>
                                <span className="text-[10px] font-bold text-slate-700 uppercase">{order.orderType}</span>
                            </InfoRow>
                            {order.orderType === 'dine-in' && (
                                <InfoRow label="Table">
                                    <span className="text-[10px] font-bold text-orange-500">T-{order.tableId?.number || order.tableId}</span>
                                </InfoRow>
                            )}
                            <InfoRow label={<><CreditCard size={12} className={isPaid ? 'text-emerald-500' : 'text-red-500'} /> Bill</>}>
                                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                    {isPaid ? 'Settled' : 'Unpaid'}
                                </span>
                            </InfoRow>
                        </div>

                        {/* Bill Summary */}
                        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Final Amount</p>
                            <div>
                                <p className="text-xl font-bold text-slate-800 leading-none">{formatPrice(order.finalAmount)}</p>
                                <p className="text-[9px] text-slate-400 mt-1 font-bold">Sub: {formatPrice(order.totalAmount)}</p>
                            </div>
                            <div className={`mt-2 w-7 h-7 rounded-lg flex items-center justify-center border ${isPaid ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                <CheckCircle2 size={14} />
                            </div>
                        </div>
                    </div>

                    {/* ITEM LIST */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Ordered Items ({order.items?.length})
                            </h3>
                            {isCancelled && <span className="badge-cancelled">Cancelled</span>}
                        </div>
                        <div className="space-y-2">
                            {order.items?.map((item, i) => {
                                const cancelled = item.status?.toUpperCase() === 'CANCELLED';
                                return (
                                    <div
                                        key={i}
                                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${cancelled ? 'opacity-30 bg-slate-50 border-slate-100' : 'bg-white border-slate-100'}`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-700">
                                                {item.quantity}×
                                            </div>
                                            <div>
                                                <p className={`text-xs font-bold ${cancelled ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <StatusBadge status={item.status || 'Pending'} />
                                                    <span className="text-[9px] text-slate-400 font-bold">{formatPrice(item.price)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-xs font-bold ${cancelled ? 'line-through text-slate-200' : 'text-slate-800'}`}>{formatPrice(item.price * item.quantity)}</p>
                                            {canCancelItem(item) && (
                                                <button
                                                    onClick={() => onCancelItem(order, item)}
                                                    className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    <X size={12} />
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
                        <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <div className={`p-1.5 rounded-lg ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                {isCompleted ? <CheckCircle2 size={14} /> : <ChefHat size={14} />}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-700">
                                    {isCompleted ? 'Order successfully served' : 'Being processed in kitchen'}
                                </p>
                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">
                                    Ref: {order._id.slice(-8).toUpperCase()}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="px-4 py-3 border-t border-slate-100 grid grid-cols-2 gap-2 shrink-0">
                    {!isPaid && !isCancelled && onProcessPayment ? (
                        <button
                            onClick={() => onProcessPayment(order)}
                            className="col-span-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest active:scale-95"
                        >
                            <Wallet size={14} /> Payment
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="col-span-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest active:scale-95"
                        >
                            Close
                        </button>
                    )}
                    <button
                        disabled={!isPaid || isCancelled}
                        onClick={() => printBill(order, formatPrice, settings)}
                        className={`col-span-1 py-2.5 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest active:scale-95 ${isPaid && !isCancelled ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'}`}
                    >
                        <Printer size={14} /> {isPaid ? 'Print' : 'Locked'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const InfoRow = ({ label, children }) => (
    <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-tight">
            {label}
        </div>
        <div>{children}</div>
    </div>
);

export default OrderDetailsModal;
