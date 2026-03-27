import { useState, useEffect, useContext, useCallback, memo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import { Utensils, Package, Grid, List, ShoppingBag, Clock, History, WifiOff } from 'lucide-react';
import TableGrid from '../../components/TableGrid';
import CancelOrderModal from '../../components/CancelOrderModal';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import StatusBadge from '../../components/StatusBadge';

/* ── Elapsed time hook ───────────────────────────────────────────────────── */
const useElapsed = (createdAt) => {
    const [elapsed, setElapsed] = useState('');
    useEffect(() => {
        const calc = () => {
            const diff = Math.floor((Date.now() - new Date(createdAt)) / 1000);
            if (diff < 60) { setElapsed(`${diff}s`); return; }
            const m = Math.floor(diff / 60);
            if (m < 60) { setElapsed(`${m}m ${diff % 60}s`); return; }
            const h = Math.floor(m / 60);
            if (h < 24) { setElapsed(`${h}h ${m % 60}m`); return; }
            const days = Math.floor(h / 24);
            if (days < 30) { setElapsed(`${days}d ${h % 24}h`); return; }
            const months = Math.floor(days / 30);
            if (months < 12) { setElapsed(`${months}mo ${days % 30}d`); return; }
            setElapsed(`${Math.floor(months / 12)}y ${months % 12}mo`);
        };
        calc();
        const id = setInterval(calc, 1000);
        return () => clearInterval(id);
    }, [createdAt]);
    return elapsed;
};

/* ── KOT-style Box Card (Waiter) ─────────────────────────────────────────── */
const WaiterBoxCard = memo(({ order, formatPrice }) => {
    const elapsed = useElapsed(order.createdAt);
    const urgency = (Date.now() - new Date(order.createdAt)) > 600000;
    const isReady = order.orderStatus?.toLowerCase() === 'ready';

    const bgColor =
        order.orderStatus === 'pending' ? 'bg-orange-50 border-orange-200' :
            order.orderStatus === 'accepted' ? 'bg-blue-50 border-blue-200' :
                order.orderStatus === 'preparing' ? 'bg-indigo-50 border-indigo-200' :
                    order.orderStatus === 'ready' ? 'bg-emerald-50 border-emerald-200' :
                        'bg-white border-gray-200';

    const borderAccent =
        order.orderStatus === 'pending' ? 'border-l-orange-500' :
            order.orderStatus === 'accepted' ? 'border-l-blue-500' :
                order.orderStatus === 'preparing' ? 'border-l-indigo-500' :
                    order.orderStatus === 'ready' ? 'border-l-emerald-500' :
                        'border-l-gray-400';

    const visibleItems = order.items?.filter(i => i.status?.toUpperCase() !== 'CANCELLED') || [];

    return (
        <div className={`
            relative flex flex-col rounded-xl border border-l-4 shadow-sm transition-all duration-200
            hover:shadow-md active:scale-[0.98] cursor-pointer overflow-hidden h-full
            ${bgColor} ${borderAccent} ${isReady ? 'animate-pulse' : ''}
        `}>
            {/* ── Header ── */}
            <div className="px-2 pt-2.5 pb-2 border-b border-black/[0.04]">
                <div className="flex items-center justify-between gap-1 mb-1">
                    <h3 className="text-[13px] font-black text-gray-900 tracking-tight leading-none truncate pr-1">
                        {order.orderNumber.replace('ORD-', '#')}
                    </h3>
                    <StatusBadge status={order.orderStatus} size="xs" />
                </div>

                <div className="flex flex-col gap-1 mt-1.5">
                    <div className="flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/60 border border-black/5 rounded-md text-[9px] font-black text-gray-700 shadow-sm truncate max-w-[50%]">
                            <Utensils size={8} className="text-orange-500 shrink-0" />
                            {order.orderType === 'dine-in'
                                ? `T${order.tableId?.number || order.tableId || '?'}`
                                : `TK${order.tokenNumber || '?'}`}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold shrink-0 ${urgency ? 'text-red-600 bg-red-100 px-1 py-0.5 rounded-md' : 'text-gray-400'}`}>
                            <Clock size={8} />{elapsed.replace(' ', '')}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Items ── */}
            <div className="flex-1 px-2 py-2 space-y-1 min-h-[60px] max-h-[120px] overflow-y-auto custom-scrollbar">
                {visibleItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                        <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-black bg-black/5 text-gray-600">
                            {item.quantity}
                        </div>
                        <span className="flex-1 text-[10px] font-bold text-gray-800 leading-tight line-clamp-2">{item.name}{item.variant ? ` (${item.variant.name})` : ''}</span>

                    </div>
                ))}
            </div>

            {/* ── Footer ── */}
            <div className="px-2 py-2 border-t border-black/[0.04] bg-black/[0.02] mt-auto">
                <div className="flex items-center justify-between gap-1">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter shrink-0">
                        {order.orderType === 'dine-in' ? 'DINE' : 'TAKE'}
                    </span>
                    <span className="text-[11px] font-black text-gray-900 tabular-nums">
                        {formatPrice(order.finalAmount)}
                    </span>
                </div>
            </div>
        </div>
    );
});

/* ── Order Card (List box style) ─────────────────────────────────────────── */
const OrderCard = memo(({ order, formatPrice }) => {
    const isReady = order.orderStatus?.toLowerCase() === 'ready';
    const borderColor =
        order.orderStatus === 'pending' ? 'border-l-orange-500' :
            order.orderStatus === 'accepted' ? 'border-l-blue-500' :
                order.orderStatus === 'preparing' ? 'border-l-indigo-500' :
                    order.orderStatus === 'ready' ? 'border-l-emerald-500' :
                        'border-l-red-500';
    const bgColor =
        order.orderStatus === 'pending' ? 'bg-orange-50 dark:bg-orange-500/5' :
            order.orderStatus === 'accepted' ? 'bg-blue-50 dark:bg-blue-500/5' :
                order.orderStatus === 'preparing' ? 'bg-indigo-50 dark:bg-indigo-500/5' :
                    order.orderStatus === 'ready' ? 'bg-emerald-50 dark:bg-emerald-500/5' :
                        'bg-[var(--theme-bg-card)]';

    return (
        <div className={`
            ${bgColor} ${borderColor} ${isReady ? 'animate-pulse' : ''}
            rounded-2xl border border-[var(--theme-border)] border-l-4 shadow-sm
            hover:shadow-md active:scale-[0.99] transition-all cursor-pointer p-3.5
        `}>
            {/* Row 1: order number + table/token + price + status */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-black text-[var(--theme-text-main)] tracking-tight">{order.orderNumber}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-white/60 dark:bg-white/10 border border-[var(--theme-border)] text-[10px] font-black text-[var(--theme-text-main)] whitespace-nowrap shadow-sm">
                        {order.orderType === 'dine-in'
                            ? `Table ${order.tableId?.number || order.tableId || '?'}`
                            : `Token ${order.tokenNumber || '?'}`}
                    </span>
                    <span className="text-[9px] font-bold uppercase opacity-40 tracking-wider whitespace-nowrap hidden sm:block">
                        {order.orderType === 'dine-in' ? 'Dine-In' : 'Takeaway'}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-black text-[var(--theme-text-main)]">{formatPrice(order.finalAmount)}</span>
                    <StatusBadge status={order.orderStatus} />
                </div>
            </div>
            {/* Row 2: items + time */}
            <div className="flex items-center justify-between gap-3 mt-2">
                <p className="text-[11px] text-[var(--theme-text-muted)] font-medium line-clamp-1 flex-1">
                    {order.items?.map(i => `${i.quantity}× ${i.name}${i.variant ? ` (${i.variant.name})` : ''}`).join(', ') || 'No items'}

                </p>
                <div className="flex items-center gap-1 text-[10px] text-[var(--theme-text-subtle)] font-bold shrink-0">
                    <Clock size={10} />
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
});

/* ── Production Card ─────────────────────────────────────────────────────── */
const TokenSquare = memo(({ order, onClick }) => {
    const isReady = order.orderStatus?.toLowerCase() === 'ready';
    const sColor =
        order.orderStatus === 'pending' ? 'bg-orange-500/10 border-orange-500 text-orange-600' :
            order.orderStatus === 'accepted' ? 'bg-blue-600/10 border-blue-600 text-blue-600' :
                order.orderStatus === 'preparing' ? 'bg-indigo-600/10 border-indigo-600 text-indigo-600' :
                    order.orderStatus === 'ready' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-600' :
                        'bg-gray-500/10 border-gray-500 text-gray-500';

    const itemCount = order.items?.filter(i => i.status?.toUpperCase() !== 'CANCELLED').length || 0;
    const time = order.createdAt
        ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <button
            onClick={onClick}
            className={`rounded-2xl border-2 flex flex-col items-center justify-between p-2.5 pt-3 pb-2.5 gap-1.5 transition-all active:scale-90 shadow-sm hover:shadow-md group relative overflow-hidden min-h-[110px]
                ${sColor} ${isReady ? 'animate-pulse' : ''}`}
        >
            {/* order number top-left */}
            <span className="absolute top-1.5 left-2.5 text-[8px] font-black opacity-25 tracking-tight">{order.orderNumber}</span>

            {/* type label */}
            <span className="text-[8px] uppercase font-black opacity-40 tracking-widest mt-2">
                {order.orderType === 'dine-in' ? 'Dine In' : 'Takeaway'}
            </span>

            {/* main identifier */}
            <span className="text-sm sm:text-base font-black leading-none group-hover:scale-105 transition-transform tracking-tight text-center">
                {order.orderType === 'dine-in'
                    ? `Table ${order.tableId?.number || order.tableId || '?'}`
                    : `Token ${order.tokenNumber || '?'}`}
            </span>

            {/* status badge */}
            <div className="text-[7px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md border border-current/30 bg-white/5">
                {order.orderStatus}
            </div>

            {/* footer: items + time */}
            <div className="flex items-center justify-between w-full mt-0.5 opacity-40">
                <span className="text-[7px] font-bold">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                <span className="text-[7px] font-bold">{time}</span>
            </div>
        </button>
    );
});

/* ── Main Component ───────────────────────────────────────────────────────── */
const WaiterDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [, setTables] = useState([]);
    const location = useLocation();
    const activeTab = location.pathname.includes('/history') ? 'history' : 'active';
    const [statusFilter, setStatusFilter] = useState(null); // null | 'pending' | 'preparing' | 'ready'
    const [filterType, setFilterType] = useState('all'); // 'all' | 'dine-in' | 'takeaway'
    const [showTables, setShowTables] = useState(false);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null, item: null });
    const [isProductionMode, setIsProductionMode] = useState(() => {
        const local = localStorage.getItem('isProductionMode');
        if (local !== null) return local === 'true';
        return false; // Will sync in useEffect if settings load later
    });
    const { user, socket, formatPrice, settings } = useContext(AuthContext);

    // Sync with global settings if no local preference has been set yet
    useEffect(() => {
        const local = localStorage.getItem('isProductionMode');
        if (local === null && settings?.dashboardView === 'prod') {
            setIsProductionMode(true);
        }
    }, [settings]);

    useEffect(() => {
        localStorage.setItem('isProductionMode', isProductionMode);
    }, [isProductionMode]);
    const navigate = useNavigate();

    // ── Reserve a table manually from the Table Map ───────────────────────────
    const handleReserveTable = useCallback(async (tableId) => {
        try {
            const res = await api.put(
                `/api/tables/${tableId}/reserve`,
                {},
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setTables(prev => prev.map(t => t._id === tableId ? res.data : t));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reserve table');
        }
    }, [user]);

    // ── Cancel a reservation from the Table Map ───────────────────────────────
    const handleCancelReservation = useCallback(async (tableId) => {
        try {
            const res = await api.put(
                `/api/tables/${tableId}/release`,
                {},
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setTables(prev => prev.map(t => t._id === tableId ? res.data : t));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel reservation');
        }
    }, [user]);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            setFetchError(false);
            // Fetch all recent orders — frontend decides active vs history by paymentStatus
            const res = await api.get('/api/orders', {
                params: { limit: 100 },
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setOrders(res.data.orders || []);
        } catch (err) {
            console.error("Error fetching orders", err);
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) fetchOrders();

        if (socket) {
            const onNew = (o) => setOrders(p => {
                if (p.find(x => x._id === o._id)) return p;
                return [o, ...p];
            });
            const onUpdate = (o) => {
                setOrders(p => {
                    const exists = p.find(x => x._id === o._id);
                    return exists ? p.map(x => x._id === o._id ? o : x) : [o, ...p];
                });
                if (selectedOrder?._id === o._id) setSelectedOrder(o);
            };

            socket.on('new-order', onNew);
            socket.on('order-updated', onUpdate);
            socket.on('order-completed', onUpdate);
            socket.on('orderCancelled', onUpdate);
            socket.on('itemUpdated', onUpdate);
            return () => {
                socket.off('new-order', onNew);
                socket.off('order-updated', onUpdate);
                socket.off('order-completed', onUpdate);
                socket.off('orderCancelled', onUpdate);
                socket.off('itemUpdated', onUpdate);
            };
        }
        window.addEventListener('pos-refresh', fetchOrders);
        return () => window.removeEventListener('pos-refresh', fetchOrders);
    }, [user, socket, fetchOrders, selectedOrder]);

    // Handle auto-opening an order from query params (e.g., after adding items)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const openId = params.get('openOrder');
        if (openId && orders.length > 0) {
            const target = orders.find(o => o._id === openId);
            if (target) {
                setSelectedOrder(target);
                // Clear the URL to avoid opening it every time they refresh
                navigate('/waiter', { replace: true });
            }
        }
    }, [orders, navigate]);


    const handleCancelAction = async (orderId, arg2, arg3) => {
        try {
            const isItem = arg3 !== undefined;
            const url = isItem
                ? `/api/orders/${orderId}/items/${arg2}/cancel`
                : `/api/orders/${orderId}/cancel`;
            const reason = isItem ? arg3 : arg2;

            await api.put(url, { reason }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
        } catch (err) {
            alert(err.response?.data?.message || "Action failed");
        }
    };

    // Active = not paid yet AND not cancelled; History = paid (completed)
    const activeOrders = orders.filter(o => o.paymentStatus !== 'paid' && o.orderStatus !== 'cancelled');
    const historyOrders = orders.filter(o => o.paymentStatus === 'paid')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const counts = {
        pending: activeOrders.filter(o => o.orderStatus === 'pending').length,
        accepted: activeOrders.filter(o => o.orderStatus === 'accepted').length,
        preparing: activeOrders.filter(o => o.orderStatus === 'preparing').length,
        ready: activeOrders.filter(o => o.orderStatus === 'ready').length,
        history: historyOrders.length,
    };

    const filteredOrders = (activeTab === 'active' ? activeOrders : historyOrders)
        .filter(o => settings?.takeawayEnabled !== false || o.orderType !== 'takeaway')
        .filter(o => settings?.dineInEnabled !== false || o.orderType !== 'dine-in')
        .filter(o => filterType === 'all' || o.orderType === filterType)
        .filter(o => {
            if (activeTab !== 'active') return true;
            if (!statusFilter) return true;
            return o.orderStatus === statusFilter;
        });

    return (
        <div className="space-y-5 animate-fade-in pb-10 text-left">
            {/* ── NETWORK ERROR ALERT ────────────────────────────────────── */}
            {fetchError && (
                <div id="net-error-alert" className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-bounce-subtle">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <WifiOff size={20} className="text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-600">Network Connection Error</h3>
                            <p className="text-[10px] text-red-500 font-medium">Cannot reach the POS server. Please check your WiFi or IP settings.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchOrders()}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-red-500/20"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--theme-bg-card2)] px-5 py-4 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                <div className="flex flex-1 items-center gap-3 lg:gap-6 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 flex-shrink-0">
                        <Utensils className="text-orange-500" size={22} />
                    </div>

                    <div className="flex items-center gap-3 lg:gap-5 flex-1 min-w-0 pr-4 sm:pr-6 border-r border-[var(--theme-border)]">
                        <div className="min-w-0">
                            <h1 className="text-sm sm:text-lg font-bold text-[var(--theme-text-main)] tracking-tight truncate leading-tight">
                                {user?.role === 'cashier' ? 'Token Monitoring' : 'Waiter Console'}
                            </h1>
                            <p className="text-[9px] text-[var(--theme-text-muted)] uppercase font-bold tracking-widest mt-0.5 hidden sm:block">
                                {user?.role === 'cashier' ? 'Live View' : 'Monitoring'}
                            </p>
                        </div>
                    </div>

                </div>


                {/* Action Buttons - Auto-adaptive single-line toolbar */}
                <div className="flex flex-row items-center justify-end gap-1.5 w-full lg:w-auto overflow-x-auto hide-scrollbar flex-nowrap pb-1 lg:pb-0">

                    {/* Compact Mode Switch */}
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--theme-bg-dark)] rounded-xl border border-[var(--theme-border)] shadow-sm shrink-0 h-[44px]">
                        <button
                            onClick={() => setIsProductionMode(!isProductionMode)}
                            className={`
                                relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                                transition-colors duration-300 ease-in-out focus:outline-none 
                                ${isProductionMode ? 'bg-emerald-500' : 'bg-orange-500'}
                            `}
                        >
                            <span 
                                className={`
                                    pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-md
                                    transition duration-300 ease-in-out
                                    ${isProductionMode ? 'translate-x-4' : 'translate-x-0'}
                                `} 
                            />
                        </button>
                        <span className={`text-[9px] font-black uppercase tracking-tighter transition-colors whitespace-nowrap ${isProductionMode ? 'text-emerald-500' : 'text-orange-500'}`}>
                            {isProductionMode ? 'TOKEN' : 'CARD'}
                        </span>
                    </div>

                    {/* TABLES button */}
                    {settings?.tableMapEnabled !== false && (
                        <button
                            onClick={() => setShowTables(t => !t)}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all border border-[var(--theme-border)] h-[44px] shrink-0 ${
                                showTables
                                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-600 shadow-sm'
                                    : 'bg-[var(--theme-bg-dark)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                            }`}
                        >
                            <Grid size={13} />
                            <span>Tables</span>
                        </button>
                    )}

                    {/* DINE IN button */}
                    {user?.role !== 'cashier' && settings?.dineInEnabled !== false && (
                        <button
                            onClick={() => navigate('/dine-in')}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wider transition-all shadow-md shadow-orange-500/20 active:scale-95 h-[44px] shrink-0"
                        >
                            <Utensils size={13} strokeWidth={3} />
                            <span>Dine In</span>
                        </button>
                    )}

                    {/* TAKEAWAY button */}
                    {user?.role !== 'cashier' && settings?.takeawayEnabled !== false && (
                        <button
                            onClick={() => navigate('/take-away')}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[9px] uppercase tracking-wider transition-all shadow-md shadow-blue-600/20 active:scale-95 h-[44px] shrink-0"
                        >
                            <Package size={13} strokeWidth={3} />
                            <span>Takeaway</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Tabs & Counters ─────────────────────────────────────── */}
            <div className="flex flex-col gap-4 bg-[var(--theme-bg-card)] p-4 sm:p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                {/* ALL / DINE-IN / TAKEAWAY filter — hide disabled types */}
                <div className="flex items-center gap-1.5 p-1 bg-[var(--theme-bg-dark)] rounded-2xl border border-[var(--theme-border)] w-full">
                    {['all', 'dine-in', 'takeaway']
                        .filter(t => t !== 'takeaway' || settings?.takeawayEnabled !== false)
                        .filter(t => t !== 'dine-in' || settings?.dineInEnabled !== false)
                        .map(t => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`
                                flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all text-center whitespace-nowrap
                                ${filterType === t
                                        ? 'bg-[var(--theme-bg-card)] text-orange-500 shadow-sm border border-[var(--theme-border)]'
                                        : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'}
                            `}
                            >
                                {t === 'all' ? 'ALL' : t === 'dine-in' ? 'DINE-IN' : 'TAKEAWAY'}
                            </button>
                        ))}
                </div>


                {activeTab === 'active' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                            { key: 'pending', count: counts.pending, dot: 'bg-[var(--status-pending)]', label: 'Pending', activeText: 'text-[var(--status-pending)]', activeBg: 'bg-[var(--status-pending-bg)] border-[var(--status-pending-border)]', hover: 'hover:border-[var(--status-pending-border)]' },
                            { key: 'accepted', count: counts.accepted, dot: 'bg-[var(--status-accepted)]', label: 'Accepted', activeText: 'text-[var(--status-accepted)]', activeBg: 'bg-[var(--status-accepted-bg)] border-[var(--status-accepted-border)]', hover: 'hover:border-[var(--status-accepted-border)]' },
                            { key: 'preparing', count: counts.preparing, dot: 'bg-[var(--status-preparing)]', label: 'Cooking', activeText: 'text-[var(--status-preparing)]', activeBg: 'bg-[var(--status-preparing-bg)] border-[var(--status-preparing-border)]', hover: 'hover:border-[var(--status-preparing-border)]' },
                            { key: 'ready', count: counts.ready, dot: 'bg-[var(--status-ready)]', label: 'Ready', activeText: 'text-[var(--status-ready)]', activeBg: 'bg-[var(--status-ready-bg)] border-[var(--status-ready-border)]', hover: 'hover:border-[var(--status-ready-border)]' },
                        ].map(({ key, count, dot, label, activeText, activeBg, hover }) => (
                            <button
                                key={key}
                                onClick={() => setStatusFilter(f => f === key ? null : key)}
                                className={`rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center transition-all border active:scale-95 ${statusFilter === key ? activeBg : `bg-[var(--theme-bg-card)] border-[var(--theme-border)] ${hover}`}`}
                            >
                                <p className={`text-lg sm:text-2xl font-black tabular-nums ${statusFilter === key ? activeText : 'text-[var(--theme-text-main)]'}`}>{count}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className={`w-1 h-1 rounded-full ${dot}`} />
                                    <p className={`text-[8px] sm:text-[10px] uppercase font-bold tracking-tighter sm:tracking-wider ${statusFilter === key ? activeText : 'text-[var(--theme-text-muted)]'}`}>{label}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

            </div>

            {/* ── Table Map (collapsible) ──────────────────────────── */}
            {showTables && (
                <div className="bg-[var(--theme-bg-card)] p-4 sm:p-5 rounded-2xl border border-[var(--theme-border)] animate-fade-in">
                    <h2 className="text-base font-bold text-[var(--theme-text-main)] mb-4">Table Status Overview</h2>
                    <TableGrid
                        allowedStatuses={['available']}
                        showCleanAction={true}
                        onReserve={handleReserveTable}
                        onCancelReservation={handleCancelReservation}
                    />
                </div>
            )}



            {/* ── Orders Grid ─────────────────────────────────────── */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton rounded-2xl h-48" />)}
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--theme-text-subtle)]">
                    {activeTab === 'active' ? (
                        <>
                            <ShoppingBag size={52} className="mb-3 opacity-20" />
                            <h3 className="text-lg font-bold text-[var(--theme-text-muted)]">No active orders</h3>
                            <p className="text-sm mt-1">Tap "New Order" to create one</p>
                        </>
                    ) : (
                        <>
                            <History size={52} className="mb-3 opacity-20" />
                            <h3 className="text-lg font-bold text-[var(--theme-text-muted)]">No history yet</h3>
                            <p className="text-sm mt-1">Completed & cancelled orders appear here.</p>
                        </>
                    )}
                </div>
            ) : (
                <div className={`grid gap-3 transition-all duration-300 ${
                    isProductionMode
                        ? 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10'
                        : 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                }`}>
                    {filteredOrders.map(order => (
                        isProductionMode ? (
                            <TokenSquare
                                key={order._id}
                                order={order}
                                onClick={() => setSelectedOrder(order)}
                            />
                        ) : (
                            <div key={order._id} onClick={() => setSelectedOrder(order)}>
                                <WaiterBoxCard
                                    order={order}
                                    formatPrice={formatPrice}
                                />
                            </div>
                        )
                    ))}
                </div>
            )}

            <OrderDetailsModal
                isOpen={!!selectedOrder}
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                formatPrice={formatPrice}
                userRole={user.role}
                onCancelItem={(o, i) => setCancelModal({ isOpen: true, order: o, item: i })}
                settings={settings}
            />

            <CancelOrderModal
                isOpen={cancelModal.isOpen}
                order={cancelModal.order}
                item={cancelModal.item}
                title={cancelModal.item ? "Cancel Item" : "Cancel Order"}
                onClose={() => setCancelModal({ isOpen: false, order: null, item: null })}
                onConfirm={handleCancelAction}
            />
        </div>
    );
};

export default WaiterDashboard;

