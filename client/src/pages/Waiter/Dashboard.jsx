import { useState, useEffect, useContext, useCallback, memo, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Utensils, Package, Grid, ShoppingBag, Clock, XCircle, History } from 'lucide-react';
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
            p-5 rounded-2xl border-l-[10px] shadow-lg transition-all duration-200 flex flex-col group token-tap 
            hover:shadow-2xl hover:border-l-[12px] active:scale-95
        `}>
            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2.5 gap-2">
                    <div className="min-w-0 text-left">
                        <h3 className="font-extrabold text-inherit text-base tracking-tight">{order.orderNumber}</h3>
                        <p className="text-[10px] text-inherit opacity-70 uppercase tracking-[0.15em] font-black mt-1">
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
    const [showTables, setShowTables] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null, item: null });
    const { user, socket, formatPrice } = useContext(AuthContext);
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
        preparing: orders.filter(o => o.orderStatus === 'preparing' || o.orderStatus === 'accepted').length,
        ready: orders.filter(o => o.orderStatus === 'ready').length,
        cancelled: orders.filter(o => o.orderStatus === 'cancelled').length,
    };

    const filteredOrders = activeTab === 'active'
        ? orders.filter(o => !['completed', 'cancelled'].includes(o.orderStatus))
        : orders.filter(o => o.orderStatus === 'cancelled');

    return (
        <div className="space-y-5 animate-fade-in pb-10 text-left">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row sm:items-center justify-between gap-6 bg-white rounded-3xl p-6 lg:p-7 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100 flex-shrink-0">
                        <Utensils className="text-orange-500" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Waiter Console</h1>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Live Service Monitoring</p>
                    </div>
                </div>
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setShowTables(t => !t)}
                        className={`
                            flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all min-h-[44px] border
                            ${showTables
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                            }
                        `}
                    >
                        <Grid size={16} />
                        <span>Table Map</span>
                    </button>
                    <button
                        onClick={() => navigate('/dine-in')}
                        className="flex items-center gap-2.5 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all shadow-md active:scale-95 min-h-[44px]"
                    >
                        <Utensils size={17} />
                        <span>Dine In</span>
                    </button>
                    <button
                        onClick={() => navigate('/take-away')}
                        className="flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all shadow-md active:scale-95 min-h-[44px]"
                    >
                        <Package size={17} />
                        <span>Take Away</span>
                    </button>
                </div>
            </div>

            {/* ── Tabs & Counters ─────────────────────────────────────── */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl w-full sm:w-fit border border-slate-200">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ShoppingBag size={14} />
                        Active ({counts.pending + counts.preparing + counts.ready})
                    </button>
                    <button
                        onClick={() => setActiveTab('cancelled')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all ${activeTab === 'cancelled' ? 'bg-white text-red-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <History size={14} />
                        History ({counts.cancelled})
                    </button>
                </div>

                {activeTab === 'active' && (
                    <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-5">
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col items-center">
                            <p className="text-2xl sm:text-3xl font-bold text-slate-800">{counts.pending}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending</p>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col items-center">
                            <p className="text-2xl sm:text-3xl font-bold text-slate-800">{counts.preparing}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cooking</p>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col items-center">
                            <p className="text-2xl sm:text-3xl font-bold text-slate-800">{counts.ready}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ready</p>
                            </div>
                        </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

