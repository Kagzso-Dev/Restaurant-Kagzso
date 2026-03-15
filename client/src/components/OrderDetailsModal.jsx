import { useEffect, useState } from 'react';
import {
    X, Clock, Utensils, CreditCard, Banknote, QrCode,
    Printer, Wallet, ShoppingBag, CheckCircle2, ChefHat, AlertTriangle
} from 'lucide-react';
import { printBill } from './BillPrint';
import StatusBadge from './StatusBadge';
import { tokenColors } from '../utils/tokenColors';

const OrderDetailsModal = ({
    order,
    isOpen,
    onClose,
    formatPrice,
    onProcessPayment,
    onCancelItem,
    userRole,
}) => {
    const [isRendered, setIsRendered] = useState(false);

    // Lock background scroll while modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setIsRendered(true);
        } else {
            document.body.style.overflow = '';
            // Delay unmounting for animation
            const timer = setTimeout(() => setIsRendered(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isRendered) return null;

    const isPaid = order?.paymentStatus === 'paid';
    const isCompleted = order?.orderStatus === 'completed';
    const isCancelled = order?.orderStatus === 'cancelled';
    const activeItems = order?.items?.filter(
        (i) => i.status !== 'CANCELLED' && i.status !== 'Cancelled'
    ) || [];

    const canCancelItem = (item) => {
        if (!onCancelItem || isCompleted || isCancelled) return false;
        if (item.status === 'CANCELLED' || item.status === 'Cancelled') return false;
        const s = item.status?.toUpperCase();
        if (userRole === 'waiter') return s === 'PENDING';
        if (userRole === 'kitchen') return ['PENDING', 'PREPARING'].includes(s);
        if (userRole === 'admin' || userRole === 'cashier') return true;
        return false;
    };

    const PaymentIcon = ({ method }) => {
        switch (method?.toLowerCase()) {
            case 'cash': return <Banknote size={13} />;
            case 'upi':
            case 'qr': return <QrCode size={13} />;
            case 'credit_card':
            case 'card': return <CreditCard size={13} />;
            default: return <Wallet size={13} />;
        }
    };

    if (!order) return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl bg-[#0f172a] rounded-t-[2.5rem] p-8 animate-drawer-up">
                <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
                <div className="space-y-6">
                    <div className="skeleton h-12 w-3/4 rounded-2xl" />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="skeleton h-32 rounded-3xl" />
                        <div className="skeleton h-32 rounded-3xl" />
                    </div>
                    <div className="space-y-3">
                        <div className="skeleton h-16 rounded-2xl" />
                        <div className="skeleton h-16 rounded-2xl" />
                        <div className="skeleton h-16 rounded-2xl" />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        /* ── Overlay ─────────────────────────────────────────────────────────── */
        <div className={`fixed inset-0 z-[200] flex items-end justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* ── Slide Modal ─────────────────────────────────────────────────── */}
            <div className={`
                relative z-10 w-full max-w-2xl bg-white border-t border-slate-200 rounded-t-[2.5rem] 
                shadow-[0_-20px_50px_rgba(0,0,0,0.15)] flex flex-col max-h-[92vh]
                ${isOpen ? 'animate-drawer-up' : 'translate-y-full'} transition-transform duration-300 ease-out
            `}>
                {/* Pull Handle */}
                <div className="pt-3 pb-2 shrink-0 flex justify-center cursor-ns-resize" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors" />
                </div>

                {/* HEADER */}
                <div className="px-6 pb-4 flex items-center justify-between border-b border-slate-100 shrink-0">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">{order.orderNumber}</h2>
                            <StatusBadge status={order.orderStatus} />
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest flex items-center gap-1.5">
                            <Clock size={11} /> {new Date(order.createdAt).toLocaleTimeString()} &middot; {order.orderType}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    
                    {/* INFO & FINANCIALS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Order Details */}
                        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 space-y-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Status</p>
                            <InfoRow label={<><Utensils size={14} className="text-blue-500" /> Dining</>}>
                                <span className="text-xs font-bold text-slate-700 uppercase">{order.orderType}</span>
                            </InfoRow>
                            {order.orderType === 'dine-in' && (
                                <InfoRow label="Table">
                                    <span className="text-xs font-bold text-orange-500">T-{order.tableId?.number || order.tableId}</span>
                                </InfoRow>
                            )}
                            <InfoRow label={<><CreditCard size={14} className={isPaid ? 'text-emerald-500' : 'text-red-500'} /> Bill</>}>
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                    {isPaid ? 'Settled' : 'Unpaid'}
                                </span>
                            </InfoRow>
                        </div>

                        {/* Bill Summary */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Final Amount</p>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-slate-800 leading-none">{formatPrice(order.finalAmount)}</p>
                                    <p className="text-[10px] text-slate-400 mt-1 font-bold">Subtotal: {formatPrice(order.totalAmount)}</p>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isPaid ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                    <CheckCircle2 size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ITEM LIST */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ordered Items ({order.items?.length})</h3>
                            {isCancelled && <span className="badge-cancelled">Order Cancelled</span>}
                        </div>
                        <div className="space-y-2.5">
                            {order.items?.map((item, i) => {
                                const cancelled = item.status?.toUpperCase() === 'CANCELLED';
                                return (
                                    <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${cancelled ? 'opacity-30 bg-slate-50 border-slate-100' : 'bg-white border-slate-100'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                                                {item.quantity}×
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${cancelled ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                     <StatusBadge status={item.status || 'Pending'} />
                                                     <span className="text-[10px] text-slate-400 font-bold">{formatPrice(item.price)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className={`text-sm font-bold ${cancelled ? 'line-through text-slate-200' : 'text-slate-800'}`}>{formatPrice(item.price * item.quantity)}</p>
                                            {canCancelItem(item) && (
                                                <button onClick={() => onCancelItem(order, item)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                                    <X size={14} />
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
                          <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                              <div className={`p-2 rounded-lg ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {isCompleted ? <CheckCircle2 size={16} /> : <ChefHat size={16} />}
                              </div>
                              <div>
                                  <p className="text-[11px] font-bold text-slate-700">
                                      {isCompleted ? 'Order has been successfully served' : 'Items are currently being processed in kitchen'}
                                  </p>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">
                                      Ref No: {order._id.slice(-8).toUpperCase()}
                                  </p>
                              </div>
                          </div>
                     )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-6 pt-2 pb-8 grid grid-cols-2 gap-3 shrink-0">
                    {!isPaid && !isCancelled && onProcessPayment ? (
                        <button 
                            onClick={() => onProcessPayment(order)}
                            className="col-span-1 py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:scale-95"
                        >
                            <Wallet size={16} /> Payment
                        </button>
                    ) : (
                        <button 
                            onClick={onClose}
                            className="col-span-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all border border-slate-200 flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:scale-95"
                        >
                            Close View
                        </button>
                    )}

                    <button
                        disabled={!isPaid || isCancelled}
                        onClick={() => printBill(order, formatPrice)}
                        className={`
                            col-span-1 py-4 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest active:scale-95
                            ${isPaid && !isCancelled ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'}
                        `}
                    >
                        <Printer size={16} /> {isPaid ? 'Print Bill' : 'Print Locked'}
                    </button>
                    {!isPaid && !isCancelled && onProcessPayment && (
                         <button onClick={onClose} className="col-span-2 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                            Dismiss Panel
                         </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const InfoRow = ({ label, children }) => (
    <div className="flex items-center justify-between group">
        <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-tight">
            {label}
        </div>
        <div>{children}</div>
    </div>
);

export default OrderDetailsModal;

