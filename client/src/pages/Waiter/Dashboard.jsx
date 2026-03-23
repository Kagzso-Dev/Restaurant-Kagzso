import { useState, useEffect, useContext, useCallback, memo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import { Utensils, Package, Grid, List, ShoppingBag, Clock, History, WifiOff } from 'lucide-react';
import TableGrid from '../../components/TableGrid';
import CancelOrderModal from '../../components/CancelOrderModal';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import StatusBadge from '../../components/StatusBadge';
import { tokenColors } from '../../utils/tokenColors';


/* ── Order Card ──────────────────────────────────────────────────────────── */
const OrderCard = memo(({ order, formatPrice, viewType = 'normal' }) => {
    const isCompact = viewType === 'compact' || viewType === 'mini';
    const isMini = viewType === 'mini';
    const isList = viewType === 'list';
    const tColor = tokenColors[order.orderStatus] || 'bg-[var(--theme-bg-card)] border-[var(--theme-border)] text-[var(--theme-text-main)]';
    const isReady = order.orderStatus?.toLowerCase() === 'ready';

    return (
        <div className={`
            ${tColor} ${isReady ? 'animate-pulse' : ''}
            rounded-xl border-l-[6px] sm:border-l-[8px] shadow-sm transition-all duration-200 flex transition-all
            ${isList ? 'p-3 items-center border-l-8' : (isMini ? 'p-2 border-l-[4px]' : (isCompact ? 'p-2.5 sm:p-3 border-l-[6px]' : 'p-3 sm:p-4'))}
            ${order.orderStatus === 'pending' ? 'border-l-[var(--status-pending)]' :
(order.orderStatus === 'accepted' ? 'border-l-[var(--status-accepted)]' :
 (order.orderStatus === 'preparing' ? 'border-l-[var(--status-preparing)]' :
  (order.orderStatus === 'ready' ? 'border-l-[var(--status-ready)]' :
   'border-l-red-500')))}
            hover:shadow-md active:scale-95 group token-tap
        `}>
            <div className={`flex flex-1 ${isList ? 'flex-row items-center justify-between gap-4 w-full' : 'flex-col'}`}>
                <div className={`flex items-center gap-3 ${isList ? 'flex-1' : 'justify-between items-start mb-2'}`}>
                    <div className="flex flex-col text-left">
                        <h3 className={`font-black text-inherit tracking-tighter ${isMini ? 'text-[10px]' : (isList ? 'text-sm' : 'text-xs')}`}>{order.orderNumber}</h3>
                         <div className={`mt-1 flex items-center gap-1.5`}>
                            <span className={`inline-flex items-center justify-center min-w-[32px] h-7 font-black text-inherit px-2.5 bg-[var(--theme-bg-hover)] rounded-lg border border-current/20 shadow-sm ${isMini || isList ? 'text-[9px]' : 'text-xs'}`}>
                                {order.orderType === 'dine-in'
                                    ? `Table ${order.tableId?.number || order.tableId || '?'}`
                                    : `Token ${order.tokenNumber || '?'}`}
                            </span>
                            {!isList && (
                                <span className={`text-[8px] font-black uppercase opacity-60 tracking-wider`}>
                                    {order.orderType}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {!isMini && !isCompact && !isList && (
                    <p className={`text-inherit opacity-85 line-clamp-1 flex-1 text-left font-medium ${isList ? 'px-4' : 'text-[11px] mb-2'}`}>
                        {order.items?.map(i => `${i.quantity} ${i.name}`).join(', ') || 'No items'}
                    </p>
                )}

                <div className={`flex items-center gap-4 ${isList ? 'shrink-0' : (isMini ? 'mt-1 pt-1 border-t border-white/5' : 'border-t border-white/10 mt-2 pt-2')}`}>
                    <div className={`flex items-center gap-1 text-inherit opacity-50 font-bold uppercase ${isMini ? 'text-[6px]' : 'text-[8px]'}`}>
                        <Clock size={isMini ? 8 : 10} />
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`font-black text-inherit ${isMini ? 'text-[10px]' : 'text-xs text-right'}`}>{formatPrice(order.finalAmount)}</span>
                        {isList && <StatusBadge status={order.orderStatus} />}
                    </div>
                </div>
            </div>
        </div>
    );
});

/* ── Production Card ─────────────────────────────────────────────────────── */
const TokenSquare = memo(({ order, onClick }) => {
    const isReady = order.orderStatus?.toLowerCase() === 'ready';
    const sColor =
        order.orderStatus === 'pending'   ? 'bg-orange-500/10 border-orange-500 text-orange-600' :
        order.orderStatus === 'accepted'  ? 'bg-blue-600/10 border-blue-600 text-blue-600' :
        order.orderStatus === 'preparing' ? 'bg-indigo-600/10 border-indigo-600 text-indigo-600' :
        order.orderStatus === 'ready'     ? 'bg-emerald-600/10 border-emerald-500 text-emerald-600' :
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
    const [tables, setTables] = useState([]);
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
    const activeOrders  = orders.filter(o => o.paymentStatus !== 'paid' && o.orderStatus !== 'cancelled');
    const historyOrders = orders.filter(o => o.paymentStatus === 'paid')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const counts = {
        pending:  activeOrders.filter(o => o.orderStatus === 'pending').length,
        accepted: activeOrders.filter(o => o.orderStatus === 'accepted').length,
        preparing:activeOrders.filter(o => o.orderStatus === 'preparing').length,
        ready:    activeOrders.filter(o => o.orderStatus === 'ready').length,
        history:  historyOrders.length,
    };

    const filteredOrders = (activeTab === 'active' ? activeOrders : historyOrders)
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
            <div className="flex flex-col lg:flex-row sm:items-center justify-between gap-4 bg-[var(--theme-bg-card2)] px-5 py-4 rounded-2xl border border-[var(--theme-border)] shadow-sm">
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


                {/* Action Buttons */}
                <div className="flex flex-row flex-wrap justify-end gap-2 w-full lg:w-auto">

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
                    {user?.role !== 'cashier' && settings?.dineInEnabled !== false && (
                        <button
                            onClick={() => navigate('/dine-in')}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md shadow-orange-500/20 active:scale-95 min-h-[44px]"
                        >
                            <Utensils size={13} />
                            <span className="truncate">Dine In</span>
                        </button>
                    )}
                    {user?.role !== 'cashier' && settings?.takeawayEnabled !== false && (
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
            <div className="flex flex-col gap-4 bg-[var(--theme-bg-card)] p-4 sm:p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                {/* ALL / DINE-IN / TAKEAWAY filter + toggle */}
                <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-1.5 p-1 bg-[var(--theme-bg-dark)] rounded-2xl border border-[var(--theme-border)] w-fit">
                        {['all', 'dine-in', 'takeaway'].map(t => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`
                                    px-2 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all whitespace-nowrap
                                    ${filterType === t
                                        ? 'bg-[var(--theme-bg-card)] text-orange-500 shadow-sm border border-[var(--theme-border)]'
                                        : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'}
                                `}
                            >
                                {t === 'all' ? 'ALL' : t === 'dine-in' ? 'DINE-IN' : 'TAKEAWAY'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsProductionMode(!isProductionMode)}
                        className={`relative flex items-center gap-2 pl-1.5 pr-4 h-10 rounded-full border transition-all duration-300 shadow-sm active:scale-95 shrink-0 ${
                            isProductionMode ? 'bg-blue-500/10 border-blue-500/25' : 'bg-orange-500/10 border-orange-500/25'
                        }`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
                            isProductionMode ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'
                        }`}>
                            {isProductionMode ? <Grid size={12} strokeWidth={2.5} /> : <List size={12} strokeWidth={2.5} />}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                            isProductionMode ? 'text-blue-600' : 'text-orange-500'
                        }`}>
                            {isProductionMode ? 'Card' : 'List'}
                        </span>
                    </button>
                </div>


                {activeTab === 'active' && (
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { key: 'pending',   count: counts.pending,   dot: 'bg-[var(--status-pending)]',    label: 'Pending',  activeText: 'text-[var(--status-pending)]',   activeBg: 'bg-[var(--status-pending-bg)] border-[var(--status-pending-border)]',   hover: 'hover:border-[var(--status-pending-border)]' },
                            { key: 'accepted',  count: counts.accepted,  dot: 'bg-[var(--status-accepted)]',   label: 'Accepted', activeText: 'text-[var(--status-accepted)]',  activeBg: 'bg-[var(--status-accepted-bg)] border-[var(--status-accepted-border)]',  hover: 'hover:border-[var(--status-accepted-border)]' },
                            { key: 'preparing', count: counts.preparing, dot: 'bg-[var(--status-preparing)]',  label: 'Cooking',  activeText: 'text-[var(--status-preparing)]', activeBg: 'bg-[var(--status-preparing-bg)] border-[var(--status-preparing-border)]', hover: 'hover:border-[var(--status-preparing-border)]' },
                            { key: 'ready',     count: counts.ready,     dot: 'bg-[var(--status-ready)]',      label: 'Ready',    activeText: 'text-[var(--status-ready)]',     activeBg: 'bg-[var(--status-ready-bg)] border-[var(--status-ready-border)]',     hover: 'hover:border-[var(--status-ready-border)]' },
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
                <div className={`grid gap-1 ${
                    isProductionMode
                        ? 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10'
                        : 'grid-cols-1'
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
                                    viewType="list"
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

