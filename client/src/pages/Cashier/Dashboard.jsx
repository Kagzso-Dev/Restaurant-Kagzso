import { useState, useEffect, useContext, useCallback, memo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import api from '../../api';
import logoImg from '../../assets/logo.png';
import PaymentModal from '../../components/PaymentModal';
import StatusBadge from '../../components/StatusBadge';
import { tokenColors } from '../../utils/tokenColors';
import { printBill } from '../../components/BillPrint';
import {
    Printer, Banknote, CheckCircle,
    ShoppingBag, RefreshCw, ArrowLeft,
    Clock, AlertTriangle, Grid, List
} from 'lucide-react';

/* ── Order List Item ──────────────────────────────────────────────────────── */
const OrderItem = memo(({ order, selected, onClick, formatPrice, viewType = 'normal' }) => {
    const isCompact = viewType === 'compact';
    const isList = viewType === 'list';
    const tColor = tokenColors[order.orderStatus] || 'bg-[var(--theme-bg-card)] border-[var(--theme-border)] text-[var(--theme-text-main)]';
    return (
        <button
            onClick={onClick}
            className={`
                w-full text-left transition-all duration-200 group token-tap rounded-2xl
                ${tColor}
                ${isList ? 'p-3.5 border-l-8' : (isCompact ? 'p-3 border-l-[6px]' : 'p-5 border-l-[10px]')}
                ${order.orderStatus === 'pending' ? 'border-l-[var(--status-pending)]' :
                  order.orderStatus === 'accepted' ? 'border-l-[var(--status-accepted)]' :
                  order.orderStatus === 'preparing' ? 'border-l-[var(--status-preparing)]' :
                  order.orderStatus === 'ready' ? 'border-l-[var(--status-ready)]' :
                  'border-l-transparent'}
                ${selected ? 'ring-2 ring-orange-500 shadow-2xl scale-[1.02]' : 'hover:scale-[1.01] shadow-lg'}
            `}
        >
            <div className={`flex flex-1 ${isList ? 'flex-row items-center justify-between gap-4' : 'flex-col'}`}>
                <div className={`flex items-center gap-3 ${isList ? 'flex-1' : 'justify-between mb-2'}`}>
                    <div className="flex flex-col">
                        <h3 className={`font-extrabold text-inherit tracking-tight truncate pr-2 ${isCompact ? 'text-[10px]' : (isList ? 'text-sm' : 'text-base')}`}>
                            {order.orderNumber}
                        </h3>
                        {isList && (
                            <div className="flex items-center gap-1.5 text-[9px] text-inherit opacity-60 font-bold mt-0.5">
                                <Clock size={10} />
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                    </div>
                </div>

                <div className={`flex items-center gap-4 ${isList ? 'shrink-0' : 'justify-between mt-1 items-end'}`}>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center justify-center min-w-[32px] h-7 font-black text-inherit px-2.5 bg-black/10 rounded-lg border border-current/20 shadow-sm ${isCompact || isList ? 'text-[9px]' : 'text-[11px]'}`}>
                                {order.orderType === 'dine-in' ? `T${order.tableId?.number || order.tableId || '?'}` : `TK${order.tokenNumber}`}
                            </span>
                            {!isList && (
                                <span className={`text-[8px] font-black uppercase opacity-60 tracking-wider`}>
                                    {order.orderType}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <p className={`font-black text-inherit text-right whitespace-nowrap ${isCompact ? 'text-xs' : (isList ? 'text-sm' : 'text-base')}`}>
                            {formatPrice(order.finalAmount)}
                        </p>
                        <div className={`${isList ? 'block' : 'hidden'}`}>
                            <StatusBadge status={order.orderStatus} />
                        </div>
                    </div>
                </div>

                {!isCompact && !isList && (
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-[9px] text-inherit opacity-60 font-bold uppercase">
                            <Clock size={12} />
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex gap-1.5">
                            <StatusBadge status={order.orderStatus} />
                            {order.paymentStatus === 'payment_pending' && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20 font-black tracking-tighter uppercase">
                                    PAYING
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </button>
    );
});

/* ── Receipt ──────────────────────────────────────────────────────────────── */
const Receipt = ({ order, formatPrice, settings }) => (
    <div id="printable-receipt" className="w-full max-w-sm mx-auto bg-white text-black px-6 py-6 relative shadow-2xl">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <span className="text-[100px] font-black uppercase rotate-45">
                KA
            </span>
        </div>

        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4 relative z-10">
            <h1 className="text-2xl font-extrabold tracking-tight">{settings?.restaurantName || 'KAGZSO'}</h1>
            <p className="text-xs font-black text-black uppercase tracking-widest mt-0.5">Tax Invoice</p>
            <p className="text-[10px] text-gray-400 mt-1">{settings?.address || 'Restaurant Address'}</p>
            {settings?.gstNumber && <p className="text-[10px] text-gray-400">GSTIN: {settings.gstNumber}</p>}
        </div>

        {/* Meta */}
        <div className="flex justify-between text-[11px] mb-4 relative z-10">
            <div>
                <p><strong>Date:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                <p><strong>Time:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString()}</p>
            </div>
            <div className="text-right">
                <p><strong>Invoice:</strong> #INV-{order.orderNumber?.split('-')[1]}</p>
                <p><strong>Order:</strong> {order.orderNumber}</p>
            </div>
        </div>

        {/* Items table */}
        <table className="w-full text-[11px] mb-4 relative z-10">
            <thead>
                <tr className="border-b border-gray-900">
                    <th className="py-1.5 text-left font-bold">Item</th>
                    <th className="py-1.5 text-center font-bold w-8">Qty</th>
                    <th className="py-1.5 text-right font-bold">Price</th>
                </tr>
            </thead>
            <tbody>
                {order.items?.filter(item => item.status?.toUpperCase() !== 'CANCELLED').map((item, i) => (
                    <tr key={i} className="border-b border-dashed border-gray-200">
                        <td className="py-2">
                            {item.name}
                            {item.variant?.name && <span className="text-xs opacity-70"> ({item.variant.name})</span>}
                        </td>
                        <td className="py-2 text-center">{item.quantity}</td>
                        <td className="py-2 text-right">{formatPrice(item.price * item.quantity)}</td>
                    </tr>
                ))}
            </tbody>
        </table>

        {/* Totals */}
        <div className="border-t-2 border-gray-900 pt-2 space-y-1 text-right relative z-10 mb-5">
            <div className="flex justify-between text-[11px]">
                <span>Subtotal:</span><span>{formatPrice(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
                <span>Tax:</span><span>{formatPrice(order.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-black border-t border-dashed border-gray-300 pt-2 mt-1">
                <span>Total:</span><span>{formatPrice(order.finalAmount)}</span>
            </div>
        </div>

        {/* Payment method (shown after payment) */}
        {order.paymentMethod && (
            <div className="text-center text-[10px] text-gray-500 border-t border-dashed border-gray-300 pt-2 pb-2 relative z-10 mb-2">
                <p className="uppercase font-bold">
                    Paid via {order.paymentMethod === 'credit_card' ? 'Credit Card' : order.paymentMethod.toUpperCase()}
                </p>
            </div>
        )}

        {/* Footer */}
        <div className="text-center text-[9px] text-gray-400 border-t border-gray-200 pt-3 relative z-10">
            <p className="font-bold uppercase mb-1">Thank you for choosing KAGZSO</p>
            <p>Powered by Kagzso Management System</p>
        </div>
    </div>
);

/* ── Main POS Component ──────────────────────────────────────────────────── */
const CashierDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showInvoice, setShowInvoice] = useState(false); // mobile panel toggle
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [filterType, setFilterType] = useState('all'); // 'all' | 'dine-in' | 'takeaway'
    const [isCardView, setIsCardView] = useState(() => localStorage.getItem('cashierCardView') !== 'false');
    const { user, socket, formatPrice, settings } = useContext(AuthContext);
    const location = useLocation();
    const isHistoryMode = location.pathname.includes('/history');

    /* ── Fetch Orders ────────────────────────────────────────────────── */
    const fetchOrders = useCallback(async () => {
        try {
            const res = await api.get('/api/orders', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const allOrders = res.data.orders || [];
            if (isHistoryMode) {
                // Show completed/cancelled for History
                setOrders(allOrders.filter(o => o.paymentStatus === 'paid' || o.orderStatus === 'cancelled'));
            } else {
                // Show unpaid/non-cancelled for POS
                setOrders(allOrders.filter(o => o.paymentStatus !== 'paid' && o.orderStatus !== 'cancelled'));
            }
        } catch (err) {
            console.error('Error fetching orders', err);
        } finally {
            setLoading(false);
        }
    }, [user, isHistoryMode]);

    // ── Sync selected order when list updates ────────────
    useEffect(() => {
        if (selectedOrder) {
            const updated = orders.find(o => o._id === selectedOrder._id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedOrder)) {
                setSelectedOrder(updated);
            } else if (!updated && orders.length > 0) {
              // If it disappeared (became paid), we handles that usually in update handlers,
              // but if list refetched and it's gone, just clear selection.
              // Note: we don't clear if list is still loading.
            }
        }
    }, [orders]);

    useEffect(() => {
        if (!user) return;
        fetchOrders();

        if (socket) {
            // Real-time updates: no polling needed
            const onNewOrder = (order) => {
                const alreadyExists = prev => prev.find(o => o._id === order._id);
                if (isHistoryMode) {
                    if ((order.paymentStatus === 'paid' || order.orderStatus === 'cancelled')) {
                         setOrders(prev => alreadyExists(prev) ? prev : [order, ...prev]);
                    }
                } else if (order.paymentStatus !== 'paid' && order.orderStatus !== 'cancelled') {
                    setOrders(prev => alreadyExists(prev) ? prev : [order, ...prev]);
                }
            };

            const onOrderUpdate = (order) => {
                setOrders(prev => {
                    const exists = prev.find(o => o._id === order._id);
                    if (isHistoryMode) {
                        // In history, if it's now paid/cancelled, ensure it's in list. If it was there but now open? (Rare but for consistency)
                        if (order.paymentStatus === 'paid' || order.orderStatus === 'cancelled') {
                            return exists ? prev.map(o => o._id === order._id ? order : o) : [order, ...prev];
                        } else {
                            return prev.filter(o => o._id !== order._id);
                        }
                    } else {
                        // In POS, if it's now paid or cancelled, remove it.
                        if (order.paymentStatus === 'paid' || order.orderStatus === 'cancelled') {
                            return prev.filter(o => o._id !== order._id);
                        }
                        // Update existing order
                        if (exists) return prev.map(o => o._id === order._id ? order : o);
                        // Add if not present and unpaid
                        return [order, ...prev];
                    }
                });
                // Keep selected order in sync
                setSelectedOrder(sel => sel?._id === order._id ? order : sel);
            };

            socket.on('new-order', onNewOrder);
            socket.on('order-updated', onOrderUpdate);
            socket.on('order-completed', onOrderUpdate);
            socket.on('orderCancelled', onOrderUpdate);

            return () => {
                socket.off('new-order', onNewOrder);
                socket.off('order-updated', onOrderUpdate);
                socket.off('order-completed', onOrderUpdate);
                socket.off('orderCancelled', onOrderUpdate);
            };
        }
        window.addEventListener('pos-refresh', fetchOrders);
        return () => window.removeEventListener('pos-refresh', fetchOrders);
    }, [user, socket, fetchOrders]);

    /* ── Select Order ────────────────────────────────────────────────── */
    const handleSelect = (order) => {
        setSelectedOrder(order);
        setPaymentSuccess(false);
        setShowInvoice(true); // on mobile, switch to invoice panel
    };

    /* ── Open Payment Modal ────────────────────────────────────────── */
    const handleOpenPayment = () => {
        if (!selectedOrder || selectedOrder.paymentStatus === 'paid') return;
        // Block payment unless kitchen has marked order as ready
        if (selectedOrder.orderStatus !== 'ready') return;
        setShowPaymentModal(true);
    };

    /* ── Payment Success Handler ──────────────────────────────────── */
    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        setPaymentSuccess(true);
        setOrders(prev => prev.filter(o => o._id !== selectedOrder._id));

        // Show success state briefly, then reset
        setTimeout(() => {
            setSelectedOrder(null);
            setPaymentSuccess(false);
            setShowInvoice(false);
        }, 2000);
    };

    /* ── Close Payment Modal ──────────────────────────────────────── */
    const handleClosePayment = () => {
        setShowPaymentModal(false);
    };

    const isKitchenReady = selectedOrder?.orderStatus === 'ready';
    const isPayDisabled = !selectedOrder || paymentSuccess || selectedOrder?.paymentStatus === 'paid' || !isKitchenReady;

    /* ── Layout ─────────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col gap-5 animate-fade-in">

            {/* Print styles injected via CSS global, not inline */}

            {/* ── Header ──────────────────────────────────────────── */}


            {/* ── POS Layout ────────────────────────────────────── */}
            <div className="relative">

                {/* Mobile: Orders List Panel */}
                <div className={`
                    ${showInvoice ? 'hidden md:block' : 'block'}
                    md:float-none
                `}>
                    {/* Mobile back button */}
                    {showInvoice && (
                        <button
                            onClick={() => setShowInvoice(false)}
                            className="md:hidden flex items-center gap-2 text-sm text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] mb-3 min-h-[44px]"
                        >
                            <ArrowLeft size={16} /> Back to orders
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-5 md:h-[calc(100dvh-180px)]">

                    {/* ── Left: Order List ──────────────── */}
                    <div className={`
                        md:col-span-2 bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)]
                        overflow-hidden flex flex-col
                        ${showInvoice ? 'hidden md:flex' : 'flex'}
                    `}>
                        <div className="px-4 py-3 border-b border-[var(--theme-border)] flex items-center justify-between flex-shrink-0">
                            <div>
                                <h2 className="text-base font-bold text-[var(--theme-text-main)]">
                                    {isHistoryMode ? 'Order History' : 'Pending Orders'}
                                </h2>
                                <p className="text-xs text-[var(--theme-text-subtle)]">
                                    {isHistoryMode ? `${orders.length} past transactions` : `${orders.length} awaiting payment`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { const v = !isCardView; setIsCardView(v); localStorage.setItem('cashierCardView', v); }}
                                    className={`relative flex items-center gap-1.5 pl-1.5 pr-3 h-9 rounded-full border transition-all duration-300 shadow-sm active:scale-95 ${isCardView ? 'bg-blue-500/10 border-blue-500/25' : 'bg-orange-500/10 border-orange-500/25'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${isCardView ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'}`}>
                                        {isCardView ? <Grid size={11} strokeWidth={2.5} /> : <List size={11} strokeWidth={2.5} />}
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isCardView ? 'text-blue-600' : 'text-orange-500'}`}>
                                        {isCardView ? 'Card' : 'List'}
                                    </span>
                                </button>
                                <button
                                    onClick={fetchOrders}
                                    className="p-2.5 bg-[var(--theme-bg-hover)] hover:bg-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-orange-500 rounded-xl transition-all active:scale-95 border border-[var(--theme-border)] shadow-sm"
                                    title="Refresh Orders"
                                >
                                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                </button>
                                <span className="bg-orange-500/20 text-orange-400 text-xs px-2.5 py-1 rounded-full font-bold border border-orange-500/20">
                                    {orders.filter(o => filterType === 'all' || o.orderType === filterType).length}
                                </span>
                            </div>
                        </div>

                        {/* ALL / DINE IN / TAKEAWAY filter */}
                        <div className="px-3 pt-3 flex-shrink-0">
                            <div className="flex items-center gap-1 p-1 bg-[var(--theme-bg-dark)] rounded-xl border border-[var(--theme-border)] w-full">
                                {['all', 'dine-in', 'takeaway'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setFilterType(t)}
                                        className={`flex-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide whitespace-nowrap transition-all ${
                                            filterType === t
                                                ? 'bg-[var(--theme-bg-card)] text-orange-500 shadow-sm border border-[var(--theme-border)]'
                                                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                                        }`}
                                    >
                                        {t === 'all' ? 'ALL' : t === 'dine-in' ? 'DINE-IN' : 'TAKEAWAY'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar">
                            {loading ? (
                                Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)
                            ) : orders.filter(o => filterType === 'all' || o.orderType === filterType).length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-[var(--theme-text-subtle)]">
                                    <ShoppingBag size={40} className="mb-2 opacity-30" />
                                    <p className="text-sm font-medium">No orders</p>
                                </div>
                            ) : (
                                orders
                                    .filter(o => filterType === 'all' || o.orderType === filterType)
                                    .map(order => (
                                        <OrderItem
                                            key={order._id}
                                            order={order}
                                            selected={selectedOrder?._id === order._id}
                                            onClick={() => handleSelect(order)}
                                            formatPrice={formatPrice}
                                            viewType={isCardView ? 'normal' : 'list'}
                                        />
                                    ))
                            )}
                        </div>
                    </div>

                    {/* ── Right: Invoice Panel ──────────── */}
                    <div className={`
                        md:col-span-3 bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)]
                        flex flex-col overflow-hidden relative
                        ${showInvoice ? 'flex' : 'hidden md:flex'}
                    `}>
                        {/* Mobile back */}
                        {showInvoice && (
                            <button
                                onClick={() => { setShowInvoice(false); }}
                                className="md:hidden flex items-center gap-2 p-3 text-sm text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] border-b border-[var(--theme-border)] flex-shrink-0"
                            >
                                <ArrowLeft size={16} /> Back to order list
                            </button>
                        )}

                        {selectedOrder ? (
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Receipt Scroll Area */}
                                <div className="flex-1 overflow-y-auto bg-[var(--theme-bg-deep)] relative custom-scrollbar">
                                    {/* Payment Success Overlay */}
                                    {paymentSuccess && (
                                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[var(--theme-bg-dark)]/95 backdrop-blur-sm animate-scale-in">
                                            <div className="bg-emerald-500 rounded-full p-5 mb-4 shadow-glow-green animate-bounce">
                                                <CheckCircle size={44} className="text-white" />
                                            </div>
                                            <h3 className="text-2xl font-black text-[var(--theme-text-main)] mb-1">Payment Successful!</h3>
                                            <p className="text-emerald-400 text-sm font-medium">Token closed • Order completed</p>
                                        </div>
                                    )}
                                    <div className="p-4 md:p-8 flex justify-center">
                                        <Receipt order={selectedOrder} formatPrice={formatPrice} settings={settings} />
                                    </div>
                                </div>

                                {/* Actions Bar */}
                                <div className="flex-shrink-0 p-4 md:p-5 bg-[var(--theme-bg-card)] border-t border-[var(--theme-border)]">
                                    {/* Kitchen waiting banner */}
                                    {!isKitchenReady && !paymentSuccess && selectedOrder.paymentStatus !== 'paid' && (
                                        <div 
                                            className="mb-4 flex items-center gap-3 p-3.5 rounded-xl border animate-fade-in transition-colors"
                                            style={{ 
                                                backgroundColor: `var(--status-${selectedOrder.orderStatus?.toLowerCase()}-bg)`,
                                                borderColor: `var(--status-${selectedOrder.orderStatus?.toLowerCase()}-border)`
                                            }}
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-black/5 flex items-center justify-center flex-shrink-0">
                                                <Clock size={18} className="animate-pulse" style={{ color: `var(--status-${selectedOrder.orderStatus?.toLowerCase()})` }} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold" style={{ color: `var(--status-${selectedOrder.orderStatus?.toLowerCase()})` }}>
                                                    Waiting for kitchen to complete order.
                                                </p>
                                                <p className="text-[10px] mt-0.5 uppercase font-semibold tracking-wider opacity-60" style={{ color: `var(--status-${selectedOrder.orderStatus?.toLowerCase()})` }}>
                                                    Status: {selectedOrder.orderStatus?.toUpperCase() || 'UNKNOWN'} • Payment locked
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between gap-4 flex-wrap">
                                        <div>
                                            <p className="text-xs text-[var(--theme-text-subtle)] font-medium">Amount Due</p>
                                            <p className="text-2xl md:text-3xl font-black text-[var(--theme-text-main)]">
                                                {formatPrice(selectedOrder.finalAmount)}
                                            </p>
                                        </div>
                                        <div className="flex gap-3 flex-wrap">
                                            <button
                                                onClick={() => printBill(selectedOrder, formatPrice, settings)}
                                                className="flex items-center gap-2 px-4 md:px-5 py-3 bg-[var(--theme-bg-hover)] hover:bg-[var(--theme-border)] text-[var(--theme-text-main)] rounded-xl font-semibold text-sm transition-colors min-h-[44px] border border-[var(--theme-border)]"
                                            >
                                                <Printer size={17} />
                                                Print
                                            </button>
                                            <button
                                                onClick={handleOpenPayment}
                                                disabled={isPayDisabled}
                                                className={`
                                                    flex items-center gap-2 px-5 md:px-7 py-3 rounded-xl font-black text-sm
                                                    shadow-lg transition-all duration-200 min-h-[44px]
                                                    ${isPayDisabled
                                                        ? 'bg-[var(--theme-bg-hover)] text-[var(--theme-text-subtle)] cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-glow-green active:scale-95'
                                                    }
                                                `}
                                            >
                                                {paymentSuccess ? (
                                                    <><CheckCircle size={17} /> Paid ✓</>
                                                ) : !isKitchenReady ? (
                                                    <><AlertTriangle size={17} /> Awaiting Kitchen</>
                                                ) : (
                                                    <><Banknote size={17} /> Pay Now</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Empty state */
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-20 h-20 bg-[var(--theme-bg-deep)] rounded-full flex items-center justify-center border-2 border-[var(--theme-border)] mb-5 shadow-xl overflow-hidden p-3">
                                    <img src={logoImg} alt="KAGSZO" className="w-full h-full object-contain" />
                                </div>
                                <h3 className="text-xl font-bold text-[var(--theme-text-main)] mb-2">No Order Selected</h3>
                                <p className="text-[var(--theme-text-subtle)] text-sm max-w-xs">
                                    Select a pending order from the list to view the invoice and process payment.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Payment Modal ────────────────────────────────── */}
            {showPaymentModal && selectedOrder && (
                <PaymentModal
                    order={selectedOrder}
                    formatPrice={formatPrice}
                    onClose={handleClosePayment}
                    onSuccess={handlePaymentSuccess}
                    api={api}
                    settings={settings}
                />
            )}
        </div>
    );
};

export default CashierDashboard;
