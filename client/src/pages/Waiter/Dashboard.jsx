import { useState, useEffect, useContext, useCallback, memo, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Utensils, Package, Grid, ShoppingBag, Clock, XCircle, History, ClipboardList } from 'lucide-react';
import TableGrid from '../../components/TableGrid';
import CancelOrderModal from '../../components/CancelOrderModal';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import StatusBadge from '../../components/StatusBadge';
import { tokenColors } from '../../utils/tokenColors';

/* ── Status colors ───────────────────────────────────────────────────────── */
const statusStyle = {
    ready: { bar: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    preparing: { bar: 'bg-amber-500', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    pending: { bar: 'bg-blue-500', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
    accepted: { bar: 'bg-indigo-500', badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25' },
    cancelled: { bar: 'bg-red-500', badge: 'bg-red-500/15 text-red-500 border-red-500/25' },
};

/* ── Order Card ──────────────────────────────────────────────────────────── */
const OrderCard = memo(({ order, formatPrice, onCancel }) => {
    const s = statusStyle[order.orderStatus] || statusStyle.pending;
    const tColor = tokenColors[order.orderStatus] || 'bg-[var(--theme-bg-card)] border-[var(--theme-border)] text-[var(--theme-text-main)]';
    const isReady = order.orderStatus?.toLowerCase() === 'ready';

    return (
        <div className={`
            ${tColor} ${isReady ? 'animate-pulse' : ''}
            p-3 sm:p-5 rounded-2xl border-l-[6px] sm:border-l-[10px] shadow-lg transition-all duration-200 flex flex-col group token-tap
            hover:shadow-2xl active:scale-95
        `}>
            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2.5 gap-2">
                    <div className="min-w-0 text-left">
                        <h3 className="font-extrabold text-inherit text-sm sm:text-base tracking-tight">{order.orderNumber}</h3>
                        <p className="text-[9px] sm:text-[10px] text-inherit opacity-70 uppercase tracking-[0.1em] font-black mt-0.5">
                            {order.orderType === 'dine-in' ? `Table ${order.tableId?.number || order.tableId || '?'}` : `Token ${order.tokenNumber}`}
                        </p>
                    </div>
                    <StatusBadge status={order.orderStatus} />
                </div>

                <p className="text-sm text-inherit opacity-85 line-clamp-2 flex-1 text-left font-medium">
                    {order.items?.map(i => `${i.quantity}× ${i.name}`).join(', ') || 'No items'}
                </p>

                {order.orderStatus === 'cancelled' && (
                    <div className="mt-2 text-[10px] text-red-400 font-bold italic text-left bg-red-500/10 px-2 py-1 rounded">
                        {order.cancelledBy}: {order.cancelReason}
                    </div>
                )}

                <div className="flex justify-between items-center border-t border-white/10 mt-4 pt-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-inherit opacity-60 font-bold uppercase">
                        <Clock size={12} />
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-4">
                        {order.orderStatus === 'pending' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCancel(order); }}
                                className="p-2 text-red-500 hover:bg-red-500/15 rounded-xl transition-all"
                                title="Cancel Order"
                            >
                                <XCircle size={18} />
                            </button>
                        )}
                        <span className="font-black text-inherit text-base">{formatPrice(order.finalAmount)}</span>
                    </div>
                </div>
            </div>
        </div>
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
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null, item: null });
    const { user, socket, formatPrice, settings } = useContext(AuthContext);
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
            const res = await api.get('/api/orders', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setOrders(res.data.orders || []);
        } catch (err) {
            console.error(err);
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
    }, [user, socket, fetchOrders, selectedOrder]);


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
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => setShowTables(t => !t)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all min-h-[38px] border ${
                            showTables
                                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-600 shadow-sm'
                                : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:border-gray-400'
                        }`}
                    >
                        <Grid size={13} />
                        <span>Tables</span>
                    </button>
                    <button
                        onClick={() => navigate('/dine-in')}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md shadow-orange-500/20 active:scale-95 min-h-[38px]"
                    >
                        <Utensils size={13} />
                        <span>Dine In</span>
                    </button>
                    <button
                        onClick={() => navigate('/take-away')}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md shadow-blue-600/20 active:scale-95 min-h-[38px]"
                    >
                        <Package size={13} />
                        <span>Takeaway</span>
                    </button>
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

                    <button
                        onClick={() => { setActiveTab('active'); setStatusFilter(null); }}
                        className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm hover:shadow-md active:scale-95 border ${
                            activeTab === 'active' && statusFilter === null
                                ? 'bg-orange-500/10 border-orange-500/35 text-orange-600'
                                : 'bg-[var(--theme-bg-card)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-orange-500 hover:border-orange-500/30'
                        }`}
                    >
                        <ClipboardList size={14} />
                        <span>View All Tokens</span>
                    </button>
                </div>

                {activeTab === 'active' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { key: 'pending',   count: counts.pending,   dot: 'bg-blue-500',    label: 'Pending',  activeText: 'text-blue-600',   activeBg: 'bg-blue-500/10 border-blue-500/35',   hover: 'hover:border-blue-400/50' },
                            { key: 'accepted',  count: counts.accepted,  dot: 'bg-orange-500',  label: 'Accepted', activeText: 'text-orange-600', activeBg: 'bg-orange-500/10 border-orange-500/35', hover: 'hover:border-orange-400/50' },
                            { key: 'preparing', count: counts.preparing, dot: 'bg-amber-500',   label: 'Cooking',  activeText: 'text-amber-600',  activeBg: 'bg-amber-500/10 border-amber-500/35',  hover: 'hover:border-amber-400/50' },
                            { key: 'ready',     count: counts.ready,     dot: 'bg-emerald-500', label: 'Ready',    activeText: 'text-emerald-600', activeBg: 'bg-emerald-500/10 border-emerald-500/35', hover: 'hover:border-emerald-400/50' },
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
                        onSelectTable={() => navigate('/waiter/new-order')}
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredOrders.map(order => (
                        <div key={order._id} onClick={() => setSelectedOrder(order)} className="cursor-pointer">
                            <OrderCard
                                order={order}
                                formatPrice={formatPrice}
                                onCancel={(o) => setCancelModal({ isOpen: true, order: o, item: null })}
                            />
                        </div>
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

