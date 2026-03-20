import { useState, useEffect, useContext, useCallback, memo, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Utensils, Package, Grid, ShoppingBag, Clock, XCircle, History, ClipboardList, WifiOff } from 'lucide-react';
import TableGrid from '../../components/TableGrid';
import CancelOrderModal from '../../components/CancelOrderModal';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import StatusBadge from '../../components/StatusBadge';
import { tokenColors } from '../../utils/tokenColors';

/* ── Status colors ───────────────────────────────────────────────────────── */
const statusStyle = {
    ready: { bar: 'bg-[var(--status-ready)]', badge: 'bg-[var(--status-ready-bg)] text-[var(--status-ready)] border-[var(--status-ready-border)]' },
    preparing: { bar: 'bg-[var(--status-preparing)]', badge: 'bg-[var(--status-preparing-bg)] text-[var(--status-preparing)] border-[var(--status-preparing-border)]' },
    pending: { bar: 'bg-[var(--status-pending)]', badge: 'bg-[var(--status-pending-bg)] text-[var(--status-pending)] border-[var(--status-pending-border)]' },
    accepted: { bar: 'bg-[var(--status-accepted)]', badge: 'bg-[var(--status-accepted-bg)] text-[var(--status-accepted)] border-[var(--status-accepted-border)]' },
    cancelled: { bar: 'bg-red-500', badge: 'bg-red-500/15 text-red-500 border-red-500/25' },
};

/* ── Order Card ──────────────────────────────────────────────────────────── */
const OrderCard = memo(({ order, formatPrice, onCancel, viewType = 'normal' }) => {
    const isCompact = viewType === 'compact' || viewType === 'mini';
    const isMini = viewType === 'mini';
    const isList = viewType === 'list';
    const s = statusStyle[order.orderStatus] || statusStyle.pending;
    const tColor = tokenColors[order.orderStatus] || 'bg-[var(--theme-bg-card)] border-[var(--theme-border)] text-[var(--theme-text-main)]';
    const isReady = order.orderStatus?.toLowerCase() === 'ready';

    return (
        <div className={`
            ${tColor} ${isReady ? 'animate-pulse' : ''}
            rounded-xl border-l-[4px] sm:border-l-[6px] shadow-sm transition-all duration-200 flex flex-col group token-tap
            ${isList ? 'p-2 flex-row items-center border-l-6' : (isMini ? 'p-2 border-l-[4px]' : (isCompact ? 'p-2.5 sm:p-3 border-l-[6px]' : 'p-3 sm:p-4'))}
            ${order.orderStatus === 'pending' ? 'border-l-[var(--status-pending)]' :
(order.orderStatus === 'accepted' ? 'border-l-[var(--status-accepted)]' :
 (order.orderStatus === 'preparing' ? 'border-l-[var(--status-preparing)]' :
  (order.orderStatus === 'ready' ? 'border-l-[var(--status-ready)]' :
   'border-l-red-500')))}
            hover:shadow-md active:scale-95
        `}>
            <div className={`flex-1 flex ${isList ? 'flex-row items-center justify-between w-full' : 'flex-col'}`}>
                <div className={`flex justify-between items-start gap-1 ${isList ? 'w-48 shrink-0 mb-0' : (isMini ? 'mb-1' : 'mb-2')}`}>
                    <div className="min-w-0 text-left">
                        <h3 className={`font-black text-inherit tracking-tighter ${isMini ? 'text-[10px]' : (isCompact ? 'text-xs' : 'text-sm')}`}>{order.orderNumber}</h3>
                        <p className={`text-inherit opacity-60 uppercase font-black mt-0 ${isMini ? 'text-[7px]' : 'text-[9px]'}`}>
                            {order.orderType === 'dine-in' ? `T${order.tableId?.number || order.tableId || '?'}` : `TK${order.tokenNumber}`}
                        </p>
                    </div>
                </div>

                {!isMini && !isCompact && (
                    <p className={`text-inherit opacity-85 line-clamp-1 flex-1 text-left font-medium ${isList ? 'px-4' : 'text-[11px] mb-2'}`}>
                        {order.items?.map(i => `${i.quantity} ${i.name}`).join(', ') || 'No items'}
                    </p>
                )}

                <div className={`flex justify-between items-center ${isList ? 'w-64 gap-6 shrink-0' : (isMini ? 'mt-1 pt-1 border-t border-white/5' : 'border-t border-white/10 mt-2 pt-2')}`}>
                    <div className={`flex items-center gap-1 text-inherit opacity-50 font-bold uppercase ${isMini ? 'text-[6px]' : 'text-[8px]'}`}>
                        <Clock size={isMini ? 8 : 10} />
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`font-black text-inherit ${isMini ? 'text-[10px]' : 'text-xs'}`}>{formatPrice(order.finalAmount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

/* ── Production Token Card ───────────────────────────────────────────────── */
const TokenSquare = memo(({ order, onClick }) => {
    const isReady = order.orderStatus?.toLowerCase() === 'ready';
    const sColor = 
        order.orderStatus === 'pending' ? 'bg-orange-500/10 border-orange-500 text-orange-600' :
        order.orderStatus === 'accepted' ? 'bg-blue-600/10 border-blue-600 text-blue-600' :
        order.orderStatus === 'preparing' ? 'bg-indigo-600/10 border-indigo-600 text-indigo-600' :
        order.orderStatus === 'ready' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-600' :
        'bg-gray-500/10 border-gray-500 text-gray-500';

    return (
        <button
            onClick={onClick}
            className={`
                aspect-square rounded-3xl border-2 flex flex-col items-center justify-center p-3 transition-all active:scale-90 shadow-sm hover:shadow-md group relative overflow-hidden
                ${sColor} ${isReady ? 'animate-pulse ring-2 ring-emerald-500 ring-offset-2 bg-emerald-500/20' : ''}
            `}
        >
            <div className="absolute top-0 right-0 w-12 h-12 bg-current opacity-[0.03] -mr-4 -mt-4 rounded-full" />
            <span className="text-[10px] uppercase font-black opacity-40 leading-none mb-1 tracking-widest">
                {order.orderType === 'dine-in' ? 'Table' : 'Token'}
            </span>
            <span className="text-2xl sm:text-3xl font-black leading-none group-hover:scale-110 transition-transform">
                {order.orderType === 'dine-in' ? (order.tableId?.number || order.tableId || '?') : (order.tokenNumber || '?')}
            </span>
            <div className={`mt-3 text-[8px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-lg border border-current/30 bg-white/5`}>
                {order.orderStatus}
            </div>
        </button>
    );
});

/* ── Main Component ───────────────────────────────────────────────────────── */
const WaiterDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [tables, setTables] = useState([]);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'cancelled'
    const [statusFilter, setStatusFilter] = useState(null); // null | 'pending' | 'preparing' | 'ready'
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
            // Fetch only active orders to minimize API usage (300-400/day adds up fast!)
            // We'll fetch cancelled orders only when requested, or if the list is small.
            // For now, let's just fetch active.
            const res = await api.get('/api/orders', {
                params: { 
                    status: activeTab === 'active' ? 'active' : 'cancelled',
                    limit: 100 
                },
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setOrders(res.data.orders || []);
        } catch (err) {
            console.error("Error fetching orders", err);
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    }, [user, activeTab]);

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

    const counts = {
        pending: orders.filter(o => o.orderStatus === 'pending').length,
        accepted: orders.filter(o => o.orderStatus === 'accepted').length,
        preparing: orders.filter(o => o.orderStatus === 'preparing').length,
        ready: orders.filter(o => o.orderStatus === 'ready').length,
        cancelled: orders.filter(o => o.orderStatus === 'cancelled').length,
    };

    const filteredOrders = activeTab === 'active'
        ? orders.filter(o => {
            if (['completed', 'cancelled'].includes(o.orderStatus)) return false;
            if (statusFilter === 'pending') return o.orderStatus === 'pending';
            if (statusFilter === 'accepted') return o.orderStatus === 'accepted';
            if (statusFilter === 'preparing') return o.orderStatus === 'preparing';
            if (statusFilter === 'ready') return o.orderStatus === 'ready';
            return true;
        })
        : orders.filter(o => o.orderStatus === 'cancelled');

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
            <div className="flex flex-col lg:flex-row sm:items-center justify-between gap-4 bg-[var(--theme-bg-card2)] px-5 py-4 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20 flex-shrink-0">
                        <Utensils className="text-orange-500" size={20} />
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-bold text-[var(--theme-text-main)] tracking-tight">Waiter Console</h1>
                        <p className="text-[9px] text-[var(--theme-text-muted)] uppercase font-bold tracking-widest mt-0.5">Live Service Monitoring</p>
                    </div>
                </div>
                {/* Action Buttons */}
                <div className="flex flex-row flex-wrap justify-end gap-2">
                    {settings?.tableMapEnabled !== false && (
                        <button
                            onClick={() => setShowTables(t => !t)}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all min-h-[44px] border ${
                                showTables
                                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-600 shadow-sm'
                                    : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:border-gray-400'
                            }`}
                        >
                            <Grid size={13} />
                            <span className="truncate">Tables</span>
                        </button>
                    )}
                    {settings?.dineInEnabled !== false && (
                        <button
                            onClick={() => navigate('/dine-in')}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md shadow-orange-500/20 active:scale-95 min-h-[44px]"
                        >
                            <Utensils size={13} />
                            <span className="truncate">Dine In</span>
                        </button>
                    )}
                    {settings?.takeawayEnabled !== false && (
                        <button
                            onClick={() => navigate('/take-away')}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md shadow-blue-600/20 active:scale-95 min-h-[44px]"
                        >
                            <Package size={13} />
                            <span className="truncate">Takeaway</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Tabs & Counters ─────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 p-1.5 bg-[var(--theme-bg-dark)] rounded-2xl w-full sm:w-fit border border-[var(--theme-border)]">
                        <button
                            onClick={() => { setActiveTab('active'); setStatusFilter(null); }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-[var(--theme-bg-card)] text-blue-500 shadow-sm border border-[var(--theme-border)]' : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'}`}
                        >
                            <ShoppingBag size={13} />
                            Active ({counts.pending + counts.accepted + counts.preparing + counts.ready})
                        </button>
                        <button
                            onClick={() => { setActiveTab('cancelled'); setStatusFilter(null); }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'cancelled' ? 'bg-[var(--theme-bg-card)] text-red-500 shadow-sm border border-[var(--theme-border)]' : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'}`}
                        >
                            <History size={13} />
                            History ({counts.cancelled})
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setActiveTab('active'); setStatusFilter(null); }}
                            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm hover:shadow-md active:scale-95 border ${
                                activeTab === 'active' && statusFilter === null
                                    ? 'bg-orange-500/10 border-orange-500/35 text-orange-600'
                                    : 'bg-[var(--theme-bg-card)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-orange-500 hover:border-orange-500/30'
                            }`}
                        >
                            <ClipboardList size={14} />
                            <span>List View</span>
                        </button>

                        <button
                            onClick={() => setIsProductionMode(!isProductionMode)}
                            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm hover:shadow-md active:scale-95 border ${
                                isProductionMode
                                    ? 'bg-blue-500/15 border-blue-500/35 text-blue-600 shadow-glow-blue'
                                    : 'bg-[var(--theme-bg-card)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-blue-500 hover:border-blue-500/30'
                            }`}
                        >
                            <Grid size={14} />
                            <span>Token Mode</span>
                        </button>
                    </div>
                </div>

                {activeTab === 'active' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { key: 'pending',   count: counts.pending,   dot: 'bg-[var(--status-pending)]',    label: 'Pending',  activeText: 'text-[var(--status-pending)]',   activeBg: 'bg-[var(--status-pending-bg)] border-[var(--status-pending-border)]',   hover: 'hover:border-[var(--status-pending-border)]' },
                            { key: 'accepted',  count: counts.accepted,  dot: 'bg-[var(--status-accepted)]',   label: 'Accepted', activeText: 'text-[var(--status-accepted)]',  activeBg: 'bg-[var(--status-accepted-bg)] border-[var(--status-accepted-border)]',  hover: 'hover:border-[var(--status-accepted-border)]' },
                            { key: 'preparing', count: counts.preparing, dot: 'bg-[var(--status-preparing)]',  label: 'Cooking',  activeText: 'text-[var(--status-preparing)]', activeBg: 'bg-[var(--status-preparing-bg)] border-[var(--status-preparing-border)]', hover: 'hover:border-[var(--status-preparing-border)]' },
                            { key: 'ready',     count: counts.ready,     dot: 'bg-[var(--status-ready)]',      label: 'Ready',    activeText: 'text-[var(--status-ready)]',     activeBg: 'bg-[var(--status-ready-bg)] border-[var(--status-ready-border)]',     hover: 'hover:border-[var(--status-ready-border)]' },
                        ].map(({ key, count, dot, label, activeText, activeBg, hover }) => (
                            <button
                                key={key}
                                onClick={() => setStatusFilter(f => f === key ? null : key)}
                                className={`rounded-2xl p-4 flex flex-col items-center transition-all border active:scale-95 ${statusFilter === key ? activeBg : `bg-[var(--theme-bg-card)] border-[var(--theme-border)] ${hover}`}`}
                            >
                                <p className={`text-2xl sm:text-3xl font-black tabular-nums ${statusFilter === key ? activeText : 'text-[var(--theme-text-main)]'}`}>{count}</p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                                    <p className={`text-[10px] uppercase font-bold tracking-wider ${statusFilter === key ? activeText : 'text-[var(--theme-text-muted)]'}`}>{label}</p>
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
                            <h3 className="text-lg font-bold text-[var(--theme-text-muted)]">No cancelled orders</h3>
                            <p className="text-sm mt-1">Hooray! No wastage today.</p>
                        </>
                    )}
                </div>
            ) : (
                <div className={`grid gap-2 sm:gap-3 ${
                    isProductionMode ? 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10' :
                    (settings.dashboardView === 'one' ? 'grid-cols-1' :
                    settings.dashboardView === 'two' ? 'grid-cols-1 md:grid-cols-2' :
                    'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6')
                }`}>
                    {filteredOrders.map(order => (
                        isProductionMode ? (
                            <TokenSquare
                                key={order._id}
                                order={order}
                                onClick={() => setSelectedOrder(order)}
                            />
                        ) : (
                            <div key={order._id} onClick={() => setSelectedOrder(order)} className="cursor-pointer">
                                <OrderCard
                                    order={order}
                                    formatPrice={formatPrice}
                                    onCancel={(o) => setCancelModal({ isOpen: true, order: o, item: null })}
                                    viewType={settings.dashboardView === 'one' ? 'list' : settings.dashboardView === 'two' ? 'normal' : 'mini'}
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

