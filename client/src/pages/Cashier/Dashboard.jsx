import { useState, useEffect, useContext, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
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
const OrderItem = memo(({ order, selected, onClick, formatPrice, viewType = 'normal', hideAmount = false }) => {
    const isGrid = viewType === 'compact';
    const isList = viewType === 'list';
    
    // Determine status metadata for vibrant grid tokens
    const statusMeta = {
        pending:   { bg: 'bg-rose-50 border-rose-200',   text: 'text-rose-600',   dot: 'bg-rose-500',   label: 'bg-rose-100 text-rose-700' },
        accepted:  { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600',  dot: 'bg-amber-500',  label: 'bg-amber-100 text-amber-700' },
        preparing: { bg: 'bg-indigo-50 border-indigo-200',text: 'text-indigo-600', dot: 'bg-indigo-500', label: 'bg-indigo-100 text-indigo-700' },
        ready:     { bg: 'bg-emerald-50 border-emerald-300',text: 'text-emerald-700',dot: 'bg-emerald-500',label: 'bg-emerald-100 text-emerald-800' },
        completed: { bg: 'bg-gray-100 border-gray-300',   text: 'text-gray-800',   dot: 'bg-gray-600',   label: 'bg-gray-200 text-gray-800' }
    }[order.orderStatus?.toLowerCase()] || { bg: 'bg-gray-50 border-gray-100', text: 'text-gray-400', dot: 'bg-gray-300', label: 'bg-gray-100 text-gray-500' };

    if (isGrid) {
        const identifier = order.orderType === 'dine-in'
            ? (order.tableId?.number || order.tableId || '?')
            : order.tokenNumber;
        const isPulse = ['pending', 'ready'].includes(order.orderStatus?.toLowerCase());
        const shortStatus = ({ pending:'PEND', accepted:'ACC', preparing:'PREP', ready:'READY', completed:'DONE', cancelled:'CNCL' })[order.orderStatus?.toLowerCase()] || order.orderStatus?.slice(0,4).toUpperCase();

        return (
            <button
                onClick={onClick}
                className={`
                    w-full p-2 rounded-xl border-2 flex flex-col justify-between min-h-[95px] sm:min-h-[90px] transition-all duration-300 group overflow-hidden
                    ${statusMeta.bg} ${selected ? 'ring-4 ring-orange-500 scale-[1.03] shadow-2xl z-10' : 'hover:-translate-y-0.5 shadow-md hover:shadow-xl'}
                `}
            >
                {/* Top: status + type */}
                <div className="flex items-center justify-between w-full mb-1">
                    <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusMeta.dot} ${isPulse ? 'animate-pulse' : ''}`} />
                        <span className={`text-[7px] font-black uppercase ${statusMeta.text}`}>{shortStatus}</span>
                    </div>
                    <span className={`text-[7px] font-black uppercase ${statusMeta.text}`}>
                        {order.orderType === 'dine-in' ? 'TABLE' : 'TOKEN'}
                    </span>
                </div>

                {/* Center: big number */}
                <div className="flex items-center justify-center py-2">
                    <p className={`text-3xl font-black tracking-tighter leading-none ${statusMeta.text} group-hover:scale-105 transition-transform duration-200`}>
                        {identifier}
                    </p>
                </div>

                {/* Bottom: price — hidden in history mode */}
                {!hideAmount && (
                    <div className="w-full border-t border-black/[0.08] pt-1 flex items-center justify-center">
                        <p className={`text-[9px] font-black ${statusMeta.text} whitespace-nowrap`}>
                            {formatPrice(order.finalAmount)}
                        </p>
                    </div>
                )}
            </button>
        );
    }

    const tColor = tokenColors[order.orderStatus] || 'bg-[var(--theme-bg-card)] border-[var(--theme-border)] text-[var(--theme-text-main)]';
    return (
        <button
            onClick={onClick}
            className={`
                w-full text-left transition-all duration-200 group token-tap rounded-2xl
                ${tColor}
                ${isList ? 'p-3 border-l-[6px]' : 'p-3.5 border-l-[8px]'}
                ${order.orderStatus === 'pending' ? 'border-l-[var(--status-pending)]' :
                  order.orderStatus === 'accepted' ? 'border-l-[var(--status-accepted)]' :
                  order.orderStatus === 'preparing' ? 'border-l-[var(--status-preparing)]' :
                  order.orderStatus === 'ready' ? 'border-l-[var(--status-ready)]' :
                  'border-l-transparent'}
                ${selected ? 'ring-2 ring-orange-500 shadow-xl scale-[1.01]' : 'hover:scale-[1.005] shadow-md'}
            `}
        >
            {isList ? (
                /* ── List row ── */
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="inline-flex items-center justify-center min-w-[32px] h-6 font-black text-inherit text-[9px] px-1.5 bg-black/10 rounded-lg border border-current/20 shrink-0 whitespace-nowrap">
                            {order.orderType === 'dine-in' ? `T${order.tableId?.number || order.tableId || '?'}` : `TK${order.tokenNumber}`}
                        </span>
                        <p className="text-[10px] font-black text-inherit truncate leading-none">{order.orderNumber}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <p className="text-[11px] font-black text-inherit whitespace-nowrap">{formatPrice(order.finalAmount)}</p>
                        <StatusBadge status={order.orderStatus} size="sm" />
                    </div>
                </div>
            ) : (
                /* ── Normal card ── */
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-inherit tracking-tight truncate pr-2">{order.orderNumber}</h3>
                        <StatusBadge status={order.orderStatus} />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="inline-flex items-center justify-center h-7 font-black text-inherit text-[11px] px-2.5 bg-black/10 rounded-lg border border-current/20">
                            {order.orderType === 'dine-in' ? `T${order.tableId?.number || order.tableId || '?'}` : `TK${order.tokenNumber}`}
                        </span>
                        <p className="font-black text-inherit text-base">{formatPrice(order.finalAmount)}</p>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <div className="flex items-center gap-1 text-[9px] text-inherit opacity-50 font-bold uppercase">
                            <Clock size={10} />
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {order.paymentStatus === 'payment_pending' && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20 font-black uppercase">PAYING</span>
                        )}
                    </div>
                </div>
            )}
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
    const [showPrintConfirm, setShowPrintConfirm] = useState(false);
    const [filterType, setFilterType] = useState('all'); // 'all' | 'dine-in' | 'takeaway'
    const [isCardView, setIsCardView] = useState(() => localStorage.getItem('cashierCardView') !== 'false');
    const [lgCols, setLgCols] = useState(() => {
        const stored = parseInt(localStorage.getItem('cashierLgCols'));
        if (stored === 3 || stored === 4) return stored;
        const sidebar = document.querySelector('aside');
        return (sidebar && sidebar.offsetWidth > 120) ? 3 : 4;
    });
    const { user, socket, formatPrice, settings } = useContext(AuthContext);
    const location = useLocation();
    const isHistoryMode = location.pathname.includes('/history');

    // Auto-adjust desktop columns when sidebar expands/collapses
    useEffect(() => {
        const handler = (e) => {
            const collapsed = e.detail?.collapsed;
            const next = collapsed ? 4 : 3;
            setLgCols(next);
            localStorage.setItem('cashierLgCols', next);
        };
        window.addEventListener('sidebar-toggle', handler);
        return () => window.removeEventListener('sidebar-toggle', handler);
    }, []);

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
        <div className="animate-fade-in">

            {/* ── POS Layout ────────────────────────────────────── */}
            <div className="relative">

                    {/* ── TopBar Portal ────────────────────────────────────────── */}
                    {document.getElementById('topbar-portal') && createPortal(
                        <div className="flex items-center gap-2 w-full animate-fade-in px-2 md:px-4">
                            {/* Filters */}
                            <div className="flex bg-[var(--theme-bg-dark)] p-0.5 rounded-xl md:rounded-2xl border border-[var(--theme-border)] shadow-inner h-9 md:h-11 shrink-0">
                                {['all', 'dine-in', 'takeaway'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setFilterType(t)}
                                        className={`flex-1 px-2 md:px-4 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wide md:tracking-widest transition-all duration-300 flex items-center justify-center whitespace-nowrap ${
                                            filterType === t
                                                ? 'bg-orange-500 text-white shadow-[0_2px_4px_rgba(249,115,22,0.4)] scale-[1.02]'
                                                : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-hover)]'
                                        }`}
                                    >
                                        <span className="hidden sm:inline">{t === 'all' ? 'ALL' : t === 'dine-in' ? 'DINE-IN' : 'TAKEAWAY'}</span>
                                        <span className="inline sm:hidden">{t === 'all' ? 'All' : t === 'dine-in' ? 'Dine' : 'Take'}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Right Controls */}
                            <div className="ml-auto flex items-center gap-2 md:gap-4 shrink-0">
                                {/* Pending count — text only on md+ */}
                                <div className="hidden md:flex flex-col items-end pr-4 border-r border-[var(--theme-border)]">
                                    <span className="text-[11px] font-black text-orange-400 tracking-tight leading-none uppercase">
                                        {orders.filter(o => filterType === 'all' || o.orderType === filterType).length} Pending
                                    </span>
                                    <span className="text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mt-0.5">
                                        Point View
                                    </span>
                                </div>
                                {/* Mobile: badge only */}
                                <span className="md:hidden inline-flex items-center justify-center px-2 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black">
                                    {orders.filter(o => filterType === 'all' || o.orderType === filterType).length}
                                </span>

                                {/* View Toggle */}
                                <button
                                    onClick={() => { const next = !isCardView; setIsCardView(next); localStorage.setItem('cashierCardView', next); }}
                                    className={`
                                        relative flex items-center h-9 md:h-10 w-9 md:w-32 rounded-full transition-all duration-500 shadow-lg overflow-hidden border-2
                                        ${isCardView
                                            ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5'
                                            : 'bg-orange-500/5 border-orange-500/20 shadow-orange-500/5'}
                                    `}
                                >
                                    {/* Mobile: icon only */}
                                    <div className="md:hidden absolute inset-0 flex items-center justify-center">
                                        {isCardView ? <Grid size={16} strokeWidth={2.5} className="text-emerald-500" /> : <List size={16} strokeWidth={2.5} className="text-orange-500" />}
                                    </div>

                                    {/* Desktop: Sliding Icon Circle */}
                                    <div className={`
                                        hidden md:flex absolute top-1 w-8 h-8 rounded-full items-center justify-center shadow-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-10
                                        ${isCardView 
                                            ? 'left-[calc(100%-36px)] bg-emerald-500 rotate-[360deg] shadow-emerald-500/40' 
                                            : 'left-1 bg-orange-500 rotate-0 shadow-orange-500/40'}
                                    `}>
                                        {isCardView ? <Grid size={15} strokeWidth={2.5} className="text-white" /> : <List size={15} strokeWidth={2.5} className="text-white" />}
                                    </div>

                                    {/* Desktop: Background Labels */}
                                    <div className="hidden md:flex absolute inset-0 items-center justify-between px-3.5 select-none">
                                        <span className={`text-[10px] font-black tracking-widest transition-all duration-500 ${!isCardView ? 'opacity-100 translate-x-8 text-orange-600' : 'opacity-0 translate-x-4'}`}>LIST</span>
                                        <span className={`text-[10px] font-black tracking-widest transition-all duration-500 ${isCardView ? 'opacity-100 -translate-x-8 text-emerald-600' : 'opacity-0 -translate-x-4'}`}>CARD</span>
                                    </div>
                                </button>

                                {/* Refresh */}
                                <button
                                    onClick={fetchOrders}
                                    className="relative w-8 h-8 md:w-10 md:h-10 border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-sm"
                                >
                                    <RefreshCw size={14} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>,
                        document.getElementById('topbar-portal')
                    )}

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 h-[calc(100dvh-70px)] md:h-[calc(100dvh-113px)]">

                    {/* ── Left: Order List ──────────────── */}
                    <div className={`
                        md:col-span-2 bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)]
                        overflow-hidden flex flex-col min-h-0
                        ${showInvoice ? 'hidden md:flex' : 'flex'}
                    `}>
                        
                        <div className={`
                            flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar
                            ${isCardView ? `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 ${lgCols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-2 content-start` : 'space-y-2.5'}
                        `}>
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
                                            viewType={isCardView ? 'compact' : 'list'}
                                            hideAmount={isHistoryMode}
                                        />
                                    ))
                            )}
                        </div>
                    </div>

                    {/* ── Right: Invoice Panel ──────────── */}
                    <div className={`
                        md:col-span-3 bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)]
                        flex flex-col overflow-hidden relative min-h-0
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
                                    <div className="p-2 sm:p-4 md:p-6 flex justify-center">
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
                                                onClick={() => setShowPrintConfirm(true)}
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

                {/* ── TOP POPUP: Print Confirmation (iOS Style) ── */}
                {showPrintConfirm && selectedOrder && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-scale-in">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" onClick={() => setShowPrintConfirm(false)} />
                        <div className="relative bg-white rounded-[1.3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col w-full max-w-[260px]">
                            {/* Content Block */}
                            <div className="p-5 flex flex-col items-center text-center gap-1.5 text-black">
                                <h4 className="text-[17px] font-semibold tracking-tight leading-tight">Print Bill?</h4>
                                <p className="text-[13px] text-gray-600 leading-tight">
                                    Generate invoice for {selectedOrder.orderNumber}?
                                </p>
                            </div>
                            
                            {/* Buttons Block (iOS Style) */}
                            <div className="grid grid-cols-2 border-t border-gray-200">
                                <button 
                                    onClick={() => setShowPrintConfirm(false)}
                                    className="h-11 flex items-center justify-center text-[17px] text-[#007AFF] font-normal hover:bg-gray-50 active:bg-gray-100 transition-colors border-r border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => { printBill(selectedOrder, formatPrice, settings); setShowPrintConfirm(false); }}
                                    className="h-11 flex items-center justify-center text-[17px] text-[#FF3B30] font-semibold hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                >
                                    Print
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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
