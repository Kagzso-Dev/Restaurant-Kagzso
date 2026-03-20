import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import logoImg from '../../assets/logo.png';
import { ChefHat, Clock, RefreshCw, CheckCheck, Utensils, XCircle, Plus } from 'lucide-react';
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
            const m = Math.floor(diff / 60), s = diff % 60;
            if (m < 60) { setElapsed(`${m}m ${s}s`); return; }
            setElapsed(`${Math.floor(m / 60)}h ${m % 60}m`);
        };
        calc();
        const id = setInterval(calc, 1000);
        return () => clearInterval(id);
    }, [createdAt]);
    return elapsed;
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

    return (
        <div className={`
            relative rounded-xl overflow-hidden border-l-4 transition-all duration-300
            flex flex-col shadow-sm sm:hover:scale-[1.01] sm:hover:shadow-lg
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
            ${urgency ? 'ring-2 ring-red-500/30' : ''}
            ${isList ? 'flex-row items-center h-16 sm:h-20 px-3' : ''}
            animate-fade-in
        `}>
            {/* Ticket Header */}
            <div className={`border-black/5 text-left ${isList ? 'border-none w-40 shrink-0 py-0 pr-3' : (isMini ? 'p-1.5 border-b' : 'p-2.5 border-b')}`}>
                <div className="flex items-center justify-between gap-1.5">
                    <div className="min-w-0">
                        <p className={`text-[8px] text-inherit opacity-70 uppercase tracking-widest font-semibold ${isCompact ? 'hidden' : ''}`}>Order</p>
                        <h3 className={`${isMini ? 'text-[10px]' : (isCompact ? 'text-[11px]' : 'text-sm')} font-black text-inherit leading-none tracking-tighter whitespace-nowrap`}>{order.orderNumber}</h3>
                    </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {!isList && <StatusBadge status={order.orderStatus} size={isMini ? 'xs' : 'sm'} />}
                    
                    {/* Overall Order Cancel Button - Hidden if ready (unless admin), or finished */}
                    {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (order.orderStatus !== 'ready' || userRole === 'admin') && (userRole === 'kitchen' || userRole === 'admin') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onCancel(order); }}
                            className="p-1 hover:bg-red-500/10 rounded-lg text-red-500 transition-all ml-0.5"
                            title="Cancel entire order"
                        >
                            <XCircle size={isMini ? 12 : 16} />
                        </button>
                    )}
                </div>
                </div>

                <div className={`flex items-center justify-between mt-1 text-[9px] text-inherit opacity-60 ${isCompact ? 'flex-col items-start gap-0.5' : ''}`}>
                    <span className="flex items-center gap-1 truncate max-w-full font-bold">
                        {order.orderType === 'dine-in'
                            ? <><Utensils size={isMini ? 8 : 10} /> {isMini ? '' : 'T'}{order.tableId?.number || order.tableId || '?'}</>
                            : <><ChefHat size={isMini ? 8 : 10} /> {isMini ? '' : 'TK'}{order.tokenNumber}</>
                        }
                    </span>
                    <span className={`flex items-center gap-1 font-mono ${urgency ? 'text-red-400 font-bold' : ''} ${isMini ? 'hidden sm:flex' : ''}`}>
                        <Clock size={isMini ? 8 : 10} />
                        {elapsed}
                    </span>
                </div>
            </div>

            {/* Items List */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar ${isList ? 'p-0 px-3 h-full flex flex-wrap items-center gap-2' : (isMini ? 'p-1.5 space-y-1 max-h-[120px]' : 'p-2.5 space-y-1.5 max-h-[180px]')}`}>
                {order.items.map(item => {
                    const status = item.status?.toUpperCase() || 'PENDING';
                    const isCancelled = status === 'CANCELLED';
                    const isItemReady = status === 'READY';
                    // Item is "new add" if it's PENDING and was added 30s+ after the order was created
                    const isNewAdd = status === 'PENDING' &&
                        (new Date(item.createdAt) - new Date(order.createdAt)) > 30000;

                    const nextStatus =
                        status === 'PENDING'   ? 'ACCEPTED'  :
                        status === 'ACCEPTED'  ? 'PREPARING' :
                        status === 'PREPARING' ? 'READY'     : 'PENDING';

                    // Cancel is only allowed for PENDING items — locked items (READY/PREPARING) stay untouched
                    const canCancelThisItem =
                        !isCancelled && status === 'PENDING' &&
                        (userRole === 'kitchen' || userRole === 'admin');

                    return (
                        <div key={item._id} className={`${isList ? 'inline-flex items-center' : 'flex flex-col gap-0.5'} group`}>
                            <div className="flex items-center justify-between gap-1.5 w-full">
                                <div
                                    className={`flex items-start gap-1.5 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity ${isCancelled ? 'cursor-not-allowed opacity-50' : ''}`}
                                    onClick={() => !isCancelled && status !== 'READY' && onUpdateItemStatus(order._id, item._id, nextStatus)}
                                >
                                    <div className={`
                                        rounded-md flex-shrink-0
                                        flex items-center justify-center font-bold transition-all
                                        ${isMini ? 'w-3.5 h-3.5 text-[7px]' : (isCompact ? 'w-4 h-4 text-[8px]' : 'w-5 h-5 text-[10px]')}
                                        ${status === 'READY'     ? 'bg-[var(--status-ready)] text-white shadow-sm' :
                                          status === 'PREPARING' ? 'bg-[var(--status-preparing)] text-white shadow-sm' :
                                          status === 'ACCEPTED'  ? 'bg-[var(--status-accepted)] text-white shadow-sm' :
                                          isCancelled ? 'bg-red-500/20 text-red-400' :
                                          isNewAdd ? 'bg-orange-500 text-white shadow-sm animate-pulse' :
                                          'bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)]'}
                                    `}>
                                        {item.quantity}
                                    </div>
                                    <div className="min-w-0 text-left">
                                        <div className="flex items-center gap-1 flex-wrap">
                                            <p className={`font-semibold leading-tight transition-colors ${isMini ? 'text-[9px]' : (isCompact ? 'text-[10px]' : 'text-xs')} ${
                                                isItemReady  ? 'text-[var(--status-ready)] opacity-100' :
                                                isCancelled  ? 'text-red-500/50 line-through italic' :
                                                'text-inherit'
                                            }`}>
                                                {item.name}
                                            </p>
                                            {/* NEW badge — only on freshly added items, hidden in mini view */}
                                            {isNewAdd && !isMini && (
                                                <span className="bg-orange-500 text-white text-[7px] font-black px-1 py-px rounded uppercase tracking-widest leading-none">
                                                    NEW
                                                </span>
                                            )}
                                            {/* DONE badge — item already finished, locked */}
                                            {isItemReady && !isMini && (
                                                <span className="bg-[var(--status-ready-bg)] text-[var(--status-ready)] text-[7px] font-black px-1 py-px rounded uppercase tracking-widest leading-none">
                                                    Done
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Cancel only for PENDING items — READY/PREPARING items are permanently locked */}
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

            {/* Click Indicator for Mobile */}
            <div className="absolute top-2 right-2 sm:hidden text-[7px] font-black uppercase text-[var(--theme-text-muted)] opacity-30 flex items-center gap-1">
                Tap for Details <Plus size={8} />
            </div>

            {/* Action Buttons */}
            {(userRole === 'kitchen' || userRole === 'admin') && (
                <div className={`border-l border-[var(--theme-border)] shrink-0 ${isList ? 'h-full border-t-0 p-2 w-28 flex flex-col justify-center' : (isMini ? 'p-1.5 border-t flex gap-1' : 'p-2.5 border-t flex gap-2 text-left')}`}>
                    {order.orderStatus === 'pending' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order._id, 'accepted'); }}
                            style={{ backgroundColor: 'var(--status-accepted)' }}
                            className={`w-full py-2 sm:py-1.5 text-white text-[10px] sm:text-[9px] font-black rounded-lg sm:rounded shadow-md transition-all active:scale-95 brightness-90 hover:brightness-100 ${isList ? 'h-8' : ''}`}
                        >
                            Accept
                        </button>
                    )}
                    {(order.orderStatus === 'accepted' || order.orderStatus === 'preparing') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onUpdateStatus(order._id, order.orderStatus === 'accepted' ? 'preparing' : 'ready'); }}
                            style={{ 
                                backgroundColor: order.orderStatus === 'accepted' ? 'var(--status-preparing)' : 'var(--status-ready)' 
                            }}
                            className={`w-full py-2 sm:py-1.5 text-white text-[10px] sm:text-[9px] font-black rounded-lg sm:rounded shadow-md transition-all active:scale-95 brightness-90 hover:brightness-100 ${isList ? 'h-8' : ''}`}
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
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null, item: null });
    const [detailsModal, setDetailsModal] = useState({ isOpen: false, order: null });
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
    ).filter(o => filterType === 'all' ? true : o.orderType === filterType);

    return (
        <div className="space-y-5 animate-fade-in pb-10 text-left">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--theme-bg-card2)] rounded-2xl p-4 sm:p-5 border border-[var(--theme-border)]">
                <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-[var(--theme-bg-deep)] rounded-xl flex items-center justify-center shadow-glow-orange flex-shrink-0 border border-[var(--theme-border)] p-1.5">
                            <img src={logoImg} alt="KAGSZO" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl font-bold text-[var(--theme-text-main)]">
                                Kitchen TV
                                <span className="text-[var(--theme-text-muted)] font-normal ml-2 text-sm md:text-base">Control Center</span>
                            </h1>
                            <p className="text-xs text-[var(--theme-text-muted)]">
                                Watching {orders.filter(o => ACTIVE_STATUSES.includes(o.orderStatus) && o.kotStatus !== 'Closed').length} live tickets
                            </p>
                        </div>
                    </div>
                    
                    {/* Refresh Button on Mobile (Top Right of Card) */}
                    <button
                        onClick={fetchOrders}
                        className="sm:hidden p-2 bg-[var(--theme-bg-hover)] hover:bg-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Refresh"
                    >
                        <RefreshCw size={17} />
                    </button>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <div className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${socketConnected
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-400'
                            }`} />
                        {socketConnected ? 'Live' : 'Reconnecting...'}
                    </div>

                    {/* Refresh Button on Desktop (Keep in action row) */}
                    <button
                        onClick={fetchOrders}
                        className="hidden sm:flex p-2.5 bg-[var(--theme-bg-hover)] hover:bg-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] rounded-xl transition-colors min-h-[44px] min-w-[44px] items-center justify-center"
                        title="Refresh"
                    >
                        <RefreshCw size={17} />
                    </button>
                </div>
            </div>

            {/* ── Tabs & Stats ────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 p-1.5 bg-[var(--theme-bg-hover)] rounded-2xl border border-[var(--theme-border)] w-full sm:w-fit">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)]'}`}
                    >
                        Active KOTs ({counts.pending + counts.accepted + counts.preparing + counts.ready})
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

                {/* ── Order Type Filter ──────────────────────────────────── */}
                <div className="flex gap-1.5 p-1 bg-[var(--theme-bg-hover)] rounded-xl border border-[var(--theme-border)] w-fit">
                    {['all', 'dine-in', 'takeaway'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={`
                                px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                ${filterType === t 
                                    ? 'bg-[var(--theme-bg-card)] text-[var(--theme-text-main)] shadow-sm ring-1 ring-white/10' 
                                    : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-white/5'}
                            `}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {activeTab === 'active' && (
                    <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-left">
                        <span className="px-3 py-1.5 bg-[var(--status-pending-bg)] text-[var(--status-pending)] rounded-lg font-bold border border-[var(--status-pending-border)]">
                            {counts.pending} New
                        </span>
                        <span className="px-3 py-1.5 bg-[var(--status-accepted-bg)] text-[var(--status-accepted)] rounded-lg font-bold border border-[var(--status-accepted-border)]">
                            {counts.accepted} Accepted
                        </span>
                        <span className="px-3 py-1.5 bg-[var(--status-preparing-bg)] text-[var(--status-preparing)] rounded-lg font-bold border border-[var(--status-preparing-border)]">
                            {counts.preparing} Cooking
                        </span>
                        <span className="px-3 py-1.5 bg-[var(--status-ready-bg)] text-[var(--status-ready)] rounded-lg font-bold border border-[var(--status-ready-border)]">
                            {counts.ready} Ready
                        </span>
                    </div>
                )}
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
            ) : (
                <div className={`grid gap-2 sm:gap-4 ${
                    settings.dashboardView === 'one' ? 'grid-cols-1' :
                    settings.dashboardView === 'two' ? 'grid-cols-1 sm:grid-cols-2' :
                    'grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
                }`}>
                    {displayOrders.map(order => (
                        <div 
                            key={order._id}
                            onClick={(e) => {
                                // Don't open if clicking action elements or small toggles
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

