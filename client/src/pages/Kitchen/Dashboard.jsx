import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import logoImg from '../../assets/logo.png';
import { ChefHat, Clock, RefreshCw, CheckCheck, Utensils, XCircle, Grid, List } from 'lucide-react';
import CancelOrderModal from '../../components/CancelOrderModal';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import StatusBadge from '../../components/StatusBadge';
import { tokenColors } from '../../utils/tokenColors';

/* ── Status badge color ──────────────────────────────────────────────────── */
const ticketBg = {
    pending: { bar: 'bg-[var(--status-pending)]', badge: 'bg-[var(--status-pending-bg)] text-[var(--status-pending)]', glow: 'hover:shadow-[var(--status-pending-border)]' },
    accepted: { bar: 'bg-[var(--status-accepted)]', badge: 'bg-[var(--status-accepted-bg)] text-[var(--status-accepted)]', glow: 'hover:shadow-[var(--status-accepted-border)]' },
    preparing: { bar: 'bg-[var(--status-preparing)]', badge: 'bg-[var(--status-preparing-bg)] text-[var(--status-preparing)]', glow: 'hover:shadow-[var(--status-preparing-border)]' },
    ready: { bar: 'bg-[var(--status-ready)]', badge: 'bg-[var(--status-ready-bg)] text-[var(--status-ready)]', glow: 'hover:shadow-[var(--status-ready-border)]' },
};

/* ── Time since order ────────────────────────────────────────────────────── */
const useElapsed = (createdAt) => {
    const [elapsed, setElapsed] = useState('');
    useEffect(() => {
        const calc = () => {
            const diff = Math.floor((Date.now() - new Date(createdAt)) / 1000);
            if (diff < 60) { setElapsed(`${diff}s`); return; }
            const minutes = Math.floor(diff / 60);
            if (minutes < 60) { setElapsed(`${minutes}m ${diff % 60}s`); return; }
            const hours = Math.floor(minutes / 60);
            if (hours < 24) { setElapsed(`${hours}h ${minutes % 60}m`); return; }
            const days = Math.floor(hours / 24);
            if (days < 7) { setElapsed(`${days}d ${hours % 24}h`); return; }
            setElapsed(`${Math.floor(days / 7)}w ago`);
        };
        calc();
        const id = setInterval(calc, 1000);
        return () => clearInterval(id);
    }, [createdAt]);
    return elapsed;
};

/* ── Inline timer cell for table rows ───────────────────────────────────── */
const KitchenTimer = ({ createdAt, urgency }) => {
    const elapsed = useElapsed(createdAt);
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${urgency ? 'text-red-600 bg-red-100 px-2 py-0.5 rounded-md' : 'text-gray-400'}`}>
            <Clock size={11} />{elapsed}
        </span>
    );
};

/* ── KOT Ticket Card ─────────────────────────────────────────────────────── */
const KotTicket = ({ order, onUpdateStatus, onUpdateItemStatus, onCancel, onCancelItem, userRole, viewType = 'normal' }) => {
    const isCompact = viewType === 'compact' || viewType === 'mini';
    const isMini = viewType === 'mini';
    const isList = viewType === 'list';
    const cfg = ticketBg[order.orderStatus] || ticketBg.pending;
    const elapsed = useElapsed(order.createdAt);

    // Urgency: warn if > 10 mins
    const urgency = (Date.now() - new Date(order.createdAt)) > 600000;

    const tColor = tokenColors[order.orderStatus] || 'bg-[var(--theme-bg-card)] border-[var(--theme-border)]';
    const isReady = order.orderStatus?.toLowerCase() === 'ready';
    const hasNewItems = order.items?.some(i => 
        i.status?.toUpperCase() === 'PENDING' && 
        (new Date(i.createdAt) - new Date(order.createdAt)) > 30000
    );

    /* ── LIST ROW (table-style) ─────────────────────────────────────────── */
    if (isList) {
        const borderColor =
            hasNewItems ? 'border-l-[var(--status-pending)]' :
            order.orderStatus === 'pending'   ? 'border-l-[var(--status-pending)]' :
            order.orderStatus === 'accepted'  ? 'border-l-[var(--status-accepted)]' :
            order.orderStatus === 'preparing' ? 'border-l-[var(--status-preparing)]' :
            order.orderStatus === 'ready'     ? 'border-l-[var(--status-ready)]' :
            'border-l-[var(--theme-border)]';

        const itemsSummary = order.items
            .filter(i => i.status?.toUpperCase() !== 'CANCELLED')
            .map(i => `${i.quantity} ${i.name}`)
            .join(', ');

        return (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-l-[6px] shadow-sm transition-all animate-fade-in ${tColor} ${borderColor} ${urgency ? 'ring-1 ring-red-500/30' : ''}`}>
                {/* Order + Table */}
                <div className="w-32 shrink-0">
                    <p className="text-sm font-black text-gray-900 leading-none">{order.orderNumber}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/50 border border-black/10 rounded-lg text-[10px] font-black text-gray-900">
                            <Utensils size={9} />
                            {order.orderType === 'dine-in' ? `T${order.tableId?.number || order.tableId || '?'}` : `TK${order.tokenNumber}`}
                        </span>
                    </div>
                </div>

                {/* Items summary */}
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{itemsSummary || 'No items'}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
                        {order.orderType === 'dine-in' ? 'Dine-In' : 'Takeaway'} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Timer */}
                <div className={`shrink-0 flex items-center gap-1 text-[11px] font-bold ${urgency ? 'text-red-600 bg-red-100 px-2 py-0.5 rounded-md' : 'text-gray-400'}`}>
                    <Clock size={11} />
                    {elapsed}
                </div>

                {/* Status */}
                <div className="shrink-0">
                    <StatusBadge status={order.orderStatus} size="sm" />
                </div>

                {/* Action */}
                {(userRole === 'kitchen' || userRole === 'admin') && (
                    <div className="shrink-0 flex items-center gap-1">
                        {order.orderStatus === 'pending' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onUpdateStatus(order._id, 'accepted'); }}
                                style={{ backgroundColor: 'var(--status-accepted)' }}
                                className="px-3 h-8 text-white text-[10px] font-black rounded-xl active:scale-95 transition-all"
                            >Accept</button>
                        )}
                        {(order.orderStatus === 'accepted' || order.orderStatus === 'preparing') && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onUpdateStatus(order._id, order.orderStatus === 'accepted' ? 'preparing' : 'ready'); }}
                                style={{ backgroundColor: order.orderStatus === 'accepted' ? 'var(--status-preparing)' : 'var(--status-ready)' }}
                                className="px-3 h-8 text-white text-[10px] font-black rounded-xl active:scale-95 transition-all"
                            >{order.orderStatus === 'accepted' ? 'Start' : 'Ready ✓'}</button>
                        )}
                        {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (order.orderStatus !== 'ready' || userRole === 'admin') && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCancel(order); }}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 transition-all"
                            ><XCircle size={15} /></button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`
            relative rounded-2xl overflow-hidden border-l-[5px] transition-all duration-300
            flex flex-col shadow-md sm:hover:shadow-xl
            ${tColor}
            ${hasNewItems ? `ring-2 ring-[var(--status-pending)] shadow-[0_0_20px_var(--status-pending-bg)] animate-pulse` : ''}
            ${hasNewItems ? 'border-l-[var(--status-pending)]' : (
                order.orderStatus === 'pending' ? 'border-l-[var(--status-pending)]' :
                order.orderStatus === 'accepted' ? 'border-l-[var(--status-accepted)]' :
                order.orderStatus === 'preparing' ? 'border-l-[var(--status-preparing)]' :
                order.orderStatus === 'ready' ? 'border-l-[var(--status-ready)]' :
                'border-l-[var(--theme-border)]'
            )}
            ${isReady && !hasNewItems ? 'animate-pulse' : ''}
            ${urgency ? 'ring-2 ring-red-500/40' : ''}
            animate-fade-in
        `}>
            {/* Ticket Header */}
            <div className={`text-left ${isList ? 'border-none w-44 shrink-0 py-0 pr-3' : (isMini ? 'p-2 border-b border-black/8' : 'p-3 border-b border-black/8')}`}>
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2">
                        <h3 className={`${isMini ? 'text-[11px]' : (isCompact ? 'text-xs' : 'text-sm')} font-black text-gray-900 leading-none tracking-tight whitespace-nowrap`}>
                            {order.orderNumber}
                        </h3>
                        {!isList && !isCompact && (
                            <span className="text-[9px] font-bold text-gray-500 opacity-60 uppercase tracking-widest hidden sm:inline">
                                {order.orderType === 'dine-in' ? 'Dine In' : 'Takeaway'}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!isList && <StatusBadge status={order.orderStatus} size={isMini ? 'xs' : 'sm'} />}
                        {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (order.orderStatus !== 'ready' || userRole === 'admin') && (userRole === 'kitchen' || userRole === 'admin') && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCancel(order); }}
                                className="p-1 hover:bg-red-500/10 rounded-lg text-red-500 transition-all"
                                title="Cancel entire order"
                            >
                                <XCircle size={isMini ? 12 : 15} />
                            </button>
                        )}
                    </div>
                </div>

                <div className={`flex flex-wrap items-center gap-2 mt-2 ${isCompact ? 'flex-col items-start gap-1' : ''}`}>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white/40 rounded-lg border border-black/10 shadow-sm">
                        <span className="text-gray-600"><Utensils size={isMini ? 9 : 11} /></span>
                        <span className={`font-black text-gray-900 uppercase tracking-tight ${isMini ? 'text-[9px]' : 'text-[10px]'}`}>
                            {order.orderType === 'dine-in' ? `T${order.tableId?.number || order.tableId || '?'}` : `TK${order.tokenNumber}`}
                        </span>
                    </div>
                    <span className={`inline-flex items-center gap-1 font-mono tracking-tight ${isMini ? 'text-[8px]' : 'text-[10px]'} ${urgency ? 'text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded-md' : 'text-gray-500 opacity-60'} ${isMini ? 'hidden sm:flex' : ''}`}>
                        <Clock size={isMini ? 8 : 10} />
                        {elapsed}
                    </span>
                    {/* Tap hint — inline, no overlap */}
                    {!isList && !isCompact && (
                        <span className="sm:hidden text-[8px] font-bold text-gray-400 opacity-50 uppercase tracking-wider ml-auto flex items-center gap-0.5">
                            tap · details
                        </span>
                    )}
                </div>
            </div>

            {/* Items List */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar ${isList ? 'p-0 px-3 h-full flex flex-wrap items-center gap-2' : (isMini ? 'p-2 space-y-1 max-h-[120px]' : 'p-3 space-y-2 max-h-[200px]')}`}>
                {order.items.map(item => {
                    const status = item.status?.toUpperCase() || 'PENDING';
                    const isCancelled = status === 'CANCELLED';
                    const isItemReady = status === 'READY';
                    const isNewAdd = status === 'PENDING' &&
                        (new Date(item.createdAt) - new Date(order.createdAt)) > 30000;

                    const nextStatus =
                        status === 'PENDING'   ? 'ACCEPTED'  :
                        status === 'ACCEPTED'  ? 'PREPARING' :
                        status === 'PREPARING' ? 'READY'     : 'PENDING';

                    const canCancelThisItem =
                        !isCancelled && status === 'PENDING' &&
                        (userRole === 'kitchen' || userRole === 'admin');

                    return (
                        <div key={item._id} className={`${isList ? 'inline-flex items-center' : 'flex flex-col gap-0.5'} group`}>
                            <div className="flex items-center justify-between gap-1.5 w-full">
                                <div
                                    className={`flex items-start gap-2 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity ${isCancelled ? 'cursor-not-allowed opacity-50' : ''}`}
                                    onClick={() => !isCancelled && status !== 'READY' && onUpdateItemStatus(order._id, item._id, nextStatus)}
                                >
                                    <div className={`
                                        rounded-md flex-shrink-0 flex items-center justify-center font-bold transition-all
                                        ${isMini ? 'w-4 h-4 text-[8px]' : (isCompact ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[11px]')}
                                        ${status === 'READY'     ? 'bg-[var(--status-ready)] text-white shadow-sm' :
                                          status === 'PREPARING' ? 'bg-[var(--status-preparing)] text-white shadow-sm' :
                                          status === 'ACCEPTED'  ? 'bg-[var(--status-accepted)] text-white shadow-sm' :
                                          isCancelled ? 'bg-red-500/20 text-red-500' :
                                          isNewAdd ? 'bg-orange-500 text-white shadow-sm animate-pulse' :
                                          'bg-white/50 text-gray-700 border border-black/10'}
                                    `}>
                                        {item.quantity}
                                    </div>
                                    <div className="min-w-0 text-left">
                                        <div className="flex items-center gap-1 flex-wrap">
                                            <p className={`font-bold leading-tight transition-colors ${isMini ? 'text-[10px]' : (isCompact ? 'text-[11px]' : 'text-xs')} ${
                                                isItemReady ? 'text-[var(--status-ready)]' :
                                                isCancelled ? 'text-red-400 line-through italic' :
                                                'text-gray-900'
                                            }`}>
                                                {item.name}
                                            </p>
                                            {isNewAdd && !isMini && (
                                                <span className="bg-orange-500 text-white text-[7px] font-black px-1.5 py-px rounded uppercase tracking-widest leading-none">NEW</span>
                                            )}
                                            {isItemReady && !isMini && (
                                                <span className="bg-[var(--status-ready-bg)] text-[var(--status-ready)] text-[7px] font-black px-1.5 py-px rounded uppercase tracking-widest leading-none">Done</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {canCancelThisItem && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onCancelItem(order, item); }}
                                        className="sm:opacity-0 group-hover:opacity-100 opacity-100 p-2 sm:p-0.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-all ml-1"
                                        title="Cancel item"
                                    >
                                        <XCircle size={isMini ? 10 : 14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Action Buttons */}
            {(userRole === 'kitchen' || userRole === 'admin') && (
                <div className={`shrink-0 ${isList ? 'h-full border-l border-black/10 p-2 w-28 flex flex-col justify-center' : (isMini ? 'p-2 border-t border-black/8 flex gap-1' : 'p-3 border-t border-black/8 flex gap-2')}`}>
                    {order.orderStatus === 'pending' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order._id, 'accepted'); }}
                            style={{ backgroundColor: 'var(--status-accepted)' }}
                            className={`w-full py-2 text-white text-[11px] font-black rounded-xl shadow-md transition-all active:scale-95 hover:brightness-110 ${isList ? 'h-8' : ''}`}
                        >
                            Accept
                        </button>
                    )}
                    {(order.orderStatus === 'accepted' || order.orderStatus === 'preparing') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order._id, order.orderStatus === 'accepted' ? 'preparing' : 'ready'); }}
                            style={{ backgroundColor: order.orderStatus === 'accepted' ? 'var(--status-preparing)' : 'var(--status-ready)' }}
                            className={`w-full py-2 text-white text-[11px] font-black rounded-xl shadow-md transition-all active:scale-95 hover:brightness-110 ${isList ? 'h-8' : ''}`}
                        >
                            {order.orderStatus === 'accepted' ? (isMini ? 'Go' : 'Start') : 'Ready ✓'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

/* ── Main Screen ─────────────────────────────────────────────────────────── */
const KitchenDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'cancelled'
    const [filterType, setFilterType] = useState('all'); // 'all', 'dine-in', 'takeaway'
    const [statusFilter, setStatusFilter] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null, item: null });
    const [detailsModal, setDetailsModal] = useState({ isOpen: false, order: null });
    const [isCardView, setIsCardView] = useState(() => localStorage.getItem('kitchenCardView') !== 'false');
    const { user, socket, socketConnected, settings } = useContext(AuthContext);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await api.get('/api/orders', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setOrders(res.data.orders || []);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Kitchen fetch error', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;

        fetchOrders();

        if (socket) {
            const onNewOrder = (order) => {
                setOrders(prev => {
                    if (prev.find(o => o._id === order._id)) return prev;
                    return [order, ...prev];
                });
            };

            const onUpdateOrder = (order) => {
                setOrders(prev => {
                    const exists = prev.find(o => o._id === order._id);
                    if (exists) {
                        return prev.map(o => o._id === order._id ? order : o);
                    } else {
                        return [order, ...prev];
                    }
                });
            };

            const onCancelled = (order) => {
                setOrders(prev => prev.map(o => o._id === order._id ? order : o));
            };

            socket.on('new-order', onNewOrder);
            socket.on('order-updated', onUpdateOrder);
            socket.on('order-completed', onUpdateOrder);
            socket.on('orderCancelled', onCancelled);
            socket.on('itemUpdated', onUpdateOrder);

            return () => {
                socket.off('new-order', onNewOrder);
                socket.off('order-updated', onUpdateOrder);
                socket.off('order-completed', onUpdateOrder);
                socket.off('orderCancelled', onCancelled);
                socket.off('itemUpdated', onUpdateOrder);
            };
        }
        window.addEventListener('pos-refresh', fetchOrders);
        return () => window.removeEventListener('pos-refresh', fetchOrders);
    }, [user, socket, fetchOrders]);


    const updateStatus = async (orderId, newStatus) => {
        try {
            await api.put(`/api/orders/${orderId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Status update failed");
        }
    };

    const updateItemStatus = async (orderId, itemId, newStatus) => {
        try {
            await api.put(`/api/orders/${orderId}/items/${itemId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Item status update failed");
        }
    };

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

    const ACTIVE_STATUSES = ['pending', 'accepted', 'preparing', 'ready'];
    // Only count orders that are actually visible in the kitchen display (kotStatus not Closed)
    const activeKotOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.orderStatus) && o.kotStatus !== 'Closed');

    const counts = {
        pending: activeKotOrders.filter(o => o.orderStatus === 'pending').length,
        accepted: activeKotOrders.filter(o => o.orderStatus === 'accepted').length,
        preparing: activeKotOrders.filter(o => o.orderStatus === 'preparing').length,
        ready: activeKotOrders.filter(o => o.orderStatus === 'ready').length,
        cancelled: orders.filter(o => o.orderStatus === 'cancelled').length,
        completed: orders.filter(o => o.orderStatus === 'completed').length,
    };
    const displayOrders = (activeTab === 'active'
        ? activeKotOrders
        : activeTab === 'cancelled'
            ? orders.filter(o => o.orderStatus === 'cancelled')
            : orders.filter(o => o.orderStatus === 'completed')
    ).filter(o => {
        const matchesType = filterType === 'all' || o.orderType === filterType;
        const matchesStatus = !statusFilter || o.orderStatus === statusFilter;
        return matchesType && matchesStatus;
    });

    return (
        <div className="space-y-5 animate-fade-in pb-10 text-left">



            {/* ── Tabs & Stats ────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 p-1.5 bg-[var(--theme-bg-hover)] rounded-2xl border border-[var(--theme-border)] w-full sm:w-fit">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)]'}`}
                    >
                        Active ({counts.pending + counts.accepted + counts.preparing + counts.ready})
                    </button>
                    <button
                        onClick={() => setActiveTab('cancelled')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'cancelled' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)]'}`}
                    >
                        Cancelled ({counts.cancelled})
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'completed' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)]'}`}
                    >
                        Completed ({counts.completed})
                    </button>
                </div>

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex flex-col gap-4 bg-[var(--theme-bg-card)] p-4 sm:p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                    <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-1.5 p-1 bg-[var(--theme-bg-dark)] rounded-2xl border border-[var(--theme-border)] w-fit">
                            {['all', 'dine-in', 'takeaway'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setFilterType(t)}
                                    className={`
                                        flex-1 px-2 sm:px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all whitespace-nowrap
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
                            onClick={() => { const v = !isCardView; setIsCardView(v); localStorage.setItem('kitchenCardView', v); }}
                            className={`relative flex items-center gap-2 pl-1.5 pr-4 h-10 rounded-full border transition-all duration-300 shadow-sm active:scale-95 shrink-0 ${isCardView ? 'bg-blue-500/10 border-blue-500/25' : 'bg-orange-500/10 border-orange-500/25'}`}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${isCardView ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'}`}>
                                {isCardView ? <Grid size={12} strokeWidth={2.5} /> : <List size={12} strokeWidth={2.5} />}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isCardView ? 'text-blue-600' : 'text-orange-500'}`}>
                                {isCardView ? 'Card' : 'List'}
                            </span>
                        </button>
                    </div>

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
                                <p className={`text-xl sm:text-3xl font-black tabular-nums ${statusFilter === key ? activeText : 'text-[var(--theme-text-main)]'}`}>{count}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className={`w-1 h-1 rounded-full ${dot}`} />
                                    <p className={`text-[9px] sm:text-[11px] uppercase font-bold tracking-tighter sm:tracking-wider ${statusFilter === key ? activeText : 'text-[var(--theme-text-muted)]'}`}>{label}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

            </div>

            {/* ── KOT Grid ────────────────────────────────────────────── */}
            {loading ? (
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton rounded-xl h-48" />)}
                </div>
            ) : displayOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-[var(--theme-text-muted)]">
                    {activeTab === 'active' ? (
                        <>
                            <ChefHat size={56} className="mb-4 opacity-20" />
                            <h3 className="text-xl font-bold text-[var(--theme-text-muted)]">Kitchen is clear!</h3>
                            <p className="text-sm mt-1">No open KOTs in the queue</p>
                        </>
                    ) : activeTab === 'cancelled' ? (
                        <>
                            <ChefHat size={56} className="mb-4 opacity-20" />
                            <h3 className="text-xl font-bold text-[var(--theme-text-muted)]">No cancellations</h3>
                            <p className="text-sm mt-1">Everything is running smoothly</p>
                        </>
                    ) : (
                        <>
                            <ChefHat size={56} className="mb-4 opacity-20" />
                            <h3 className="text-xl font-bold text-[var(--theme-text-muted)]">No completed orders</h3>
                            <p className="text-sm mt-1">Completed orders will appear here</p>
                        </>
                    )}
                </div>
            ) : !isCardView ? (
                /* ── LIST: proper table ──────────────────────────────── */
                <div className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--theme-bg-deep)] text-[var(--theme-text-muted)] text-[10px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-4 py-3 w-36">Order</th>
                                    <th className="px-4 py-3">Items</th>
                                    <th className="px-4 py-3 w-24 text-center hidden sm:table-cell">Time</th>
                                    <th className="px-4 py-3 w-24 text-center hidden md:table-cell">Status</th>
                                    <th className="px-4 py-3 w-32 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--theme-border)]">
                                {displayOrders.map(order => {
                                    const urgency = (Date.now() - new Date(order.createdAt)) > 600000;
                                    const leftColor =
                                        order.orderStatus === 'pending'   ? 'border-l-[var(--status-pending)]' :
                                        order.orderStatus === 'accepted'  ? 'border-l-[var(--status-accepted)]' :
                                        order.orderStatus === 'preparing' ? 'border-l-[var(--status-preparing)]' :
                                        order.orderStatus === 'ready'     ? 'border-l-[var(--status-ready)]' :
                                        'border-l-transparent';
                                    const rowBg = tokenColors[order.orderStatus] || '';
                                    const items = order.items.filter(i => i.status?.toUpperCase() !== 'CANCELLED');

                                    return (
                                        <tr
                                            key={order._id}
                                            onClick={() => setDetailsModal({ isOpen: true, order })}
                                            className={`group border-l-4 ${leftColor} ${rowBg} cursor-pointer hover:brightness-95 transition-all`}
                                        >
                                            {/* Order + table */}
                                            <td className="px-4 py-3">
                                                <p className="font-black text-sm text-gray-900 leading-none">{order.orderNumber}</p>
                                                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-black/8 border border-black/10 rounded-lg text-[10px] font-black text-gray-800">
                                                    <Utensils size={9} />
                                                    {order.orderType === 'dine-in'
                                                        ? `T${order.tableId?.number || order.tableId || '?'}`
                                                        : `TK${order.tokenNumber}`}
                                                </span>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                                                    {order.orderType === 'dine-in' ? 'Dine-In' : 'Takeaway'}
                                                </p>
                                            </td>

                                            {/* Items */}
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {items.map((item, i) => (
                                                        <span key={i} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                                                            item.status?.toUpperCase() === 'READY'     ? 'bg-[var(--status-ready-bg)] text-[var(--status-ready)] border-[var(--status-ready-border)]' :
                                                            item.status?.toUpperCase() === 'PREPARING' ? 'bg-[var(--status-preparing-bg)] text-[var(--status-preparing)] border-[var(--status-preparing-border)]' :
                                                            item.status?.toUpperCase() === 'ACCEPTED'  ? 'bg-[var(--status-accepted-bg)] text-[var(--status-accepted)] border-[var(--status-accepted-border)]' :
                                                            'bg-black/5 text-gray-700 border-black/10'
                                                        }`}>
                                                            <span className="font-black">{item.quantity}×</span>{item.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>

                                            {/* Time */}
                                            <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                <KitchenTimer createdAt={order.createdAt} urgency={urgency} />
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                <StatusBadge status={order.orderStatus} size="sm" />
                                            </td>

                                            {/* Action */}
                                            <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1">
                                                    {order.orderStatus === 'pending' && (
                                                        <button
                                                            onClick={() => updateStatus(order._id, 'accepted')}
                                                            style={{ backgroundColor: 'var(--status-accepted)' }}
                                                            className="px-3 h-8 text-white text-[10px] font-black rounded-xl active:scale-95 transition-all whitespace-nowrap"
                                                        >Accept</button>
                                                    )}
                                                    {(order.orderStatus === 'accepted' || order.orderStatus === 'preparing') && (
                                                        <button
                                                            onClick={() => updateStatus(order._id, order.orderStatus === 'accepted' ? 'preparing' : 'ready')}
                                                            style={{ backgroundColor: order.orderStatus === 'accepted' ? 'var(--status-preparing)' : 'var(--status-ready)' }}
                                                            className="px-3 h-8 text-white text-[10px] font-black rounded-xl active:scale-95 transition-all whitespace-nowrap"
                                                        >{order.orderStatus === 'accepted' ? 'Start' : 'Ready ✓'}</button>
                                                    )}
                                                    {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (order.orderStatus !== 'ready' || user.role === 'admin') && (user.role === 'kitchen' || user.role === 'admin') && (
                                                        <button
                                                            onClick={() => setCancelModal({ isOpen: true, order, item: null })}
                                                            className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 transition-all"
                                                        ><XCircle size={15} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ── CARD: grid ──────────────────────────────────────── */
                <div className={`grid gap-2 sm:gap-4 ${
                    settings.dashboardView === 'one' ? 'grid-cols-1' :
                    settings.dashboardView === 'two' ? 'grid-cols-1 sm:grid-cols-2' :
                    'grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
                }`}>
                    {displayOrders.map(order => (
                        <div
                            key={order._id}
                            onClick={(e) => {
                                if (e.target.closest('button')) return;
                                setDetailsModal({ isOpen: true, order: order });
                            }}
                            className="transition-transform active:scale-[0.98]"
                        >
                            <KotTicket
                                order={order}
                                onUpdateStatus={updateStatus}
                                onUpdateItemStatus={updateItemStatus}
                                onCancel={(o) => setCancelModal({ isOpen: true, order: o, item: null })}
                                onCancelItem={(o, i) => setCancelModal({ isOpen: true, order: o, item: i })}
                                userRole={user.role}
                                viewType={settings.dashboardView === 'one' ? 'list' : settings.dashboardView === 'two' ? 'normal' : 'mini'}
                            />
                        </div>
                    ))}
                </div>
            )}

            <OrderDetailsModal
                order={detailsModal.order}
                isOpen={detailsModal.isOpen}
                onClose={() => setDetailsModal({ isOpen: false, order: null })}
                formatPrice={(p) => `₹${p}`}
                onCancelItem={(o, i) => {
                    setDetailsModal({ isOpen: false, order: null });
                    setCancelModal({ isOpen: true, order: o, item: i });
                }}
                onCancelOrder={(o) => {
                    setDetailsModal({ isOpen: false, order: null });
                    setCancelModal({ isOpen: true, order: o, item: null });
                }}
                userRole={user.role}
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

export default KitchenDashboard;

