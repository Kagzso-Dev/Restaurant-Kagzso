import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import { ChefHat, Clock, CheckCheck, Utensils, XCircle, Grid, List } from 'lucide-react';
import CancelOrderModal from '../../components/CancelOrderModal';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import StatusBadge from '../../components/StatusBadge';
import TableGrid from '../../components/TableGrid';
import { tokenColors } from '../../utils/tokenColors';


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
            if (days < 30) { setElapsed(`${days}d ${hours % 24}h`); return; }
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
    const isList = viewType === 'list';
    const elapsed = useElapsed(order.createdAt);
    const urgency = (Date.now() - new Date(order.createdAt)) > 600000;
    const tColor = tokenColors[order.orderStatus] || 'bg-[var(--theme-bg-card)] border-[var(--theme-border)]';
    const isReady = order.orderStatus?.toLowerCase() === 'ready';
    const hasNewItems = order.items?.some(i =>
        i.status?.toUpperCase() === 'PENDING' &&
        (new Date(i.createdAt) - new Date(order.createdAt)) > 30000
    );

    const borderColor =
        hasNewItems                          ? 'border-l-[var(--status-pending)]' :
        order.orderStatus === 'pending'      ? 'border-l-[var(--status-pending)]' :
        order.orderStatus === 'accepted'     ? 'border-l-[var(--status-accepted)]' :
        order.orderStatus === 'preparing'    ? 'border-l-[var(--status-preparing)]' :
        order.orderStatus === 'ready'        ? 'border-l-[var(--status-ready)]' :
        'border-l-[var(--theme-border)]';

    /* ── LIST ROW ───────────────────────────────────────────────────────── */
    if (isList) {
        const itemsSummary = order.items
            .filter(i => i.status?.toUpperCase() !== 'CANCELLED')
            .map(i => `${i.quantity} ${i.name}${i.variant ? ` (${i.variant.name})` : ''}`)
            .join(', ');
        return (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-l-[6px] shadow-sm transition-all animate-fade-in ${tColor} ${borderColor} ${urgency ? 'ring-1 ring-red-500/30' : ''}`}>
                <div className="w-32 shrink-0">
                    <p className="text-sm font-black text-gray-900 leading-none">{order.orderNumber}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/50 border border-black/10 rounded-lg text-[10px] font-black text-gray-900">
                            <Utensils size={9} />
                            {order.orderType === 'dine-in' ? `T${order.tableId?.number || order.tableId || '?'}` : `TK${order.tokenNumber}`}
                        </span>
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{itemsSummary || 'No items'}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
                        {order.orderType === 'dine-in' ? 'Dine-In' : 'Takeaway'} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className={`shrink-0 flex items-center gap-1 text-[11px] font-bold ${urgency ? 'text-red-600 bg-red-100 px-2 py-0.5 rounded-md' : 'text-gray-400'}`}>
                    <Clock size={11} />{elapsed}
                </div>
                <div className="shrink-0"><StatusBadge status={order.orderStatus} size="sm" /></div>
                {(userRole === 'kitchen' || userRole === 'admin') && (
                    <div className="shrink-0 flex items-center gap-1">
                        {order.orderStatus === 'pending' && (
                            <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(order._id, 'accepted'); }} style={{ backgroundColor: 'var(--status-accepted)' }} className="px-3 h-8 text-white text-[10px] font-black rounded-xl active:scale-95 transition-all">Accept</button>
                        )}
                        {(order.orderStatus === 'accepted' || order.orderStatus === 'preparing') && (
                            <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(order._id, order.orderStatus === 'accepted' ? 'preparing' : 'ready'); }} style={{ backgroundColor: order.orderStatus === 'accepted' ? 'var(--status-preparing)' : 'var(--status-ready)' }} className="px-3 h-8 text-white text-[10px] font-black rounded-xl active:scale-95 transition-all">{order.orderStatus === 'accepted' ? 'Start' : 'Ready ✓'}</button>
                        )}
                        {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (order.orderStatus !== 'ready' || userRole === 'admin') && (
                            <button onClick={(e) => { e.stopPropagation(); onCancel(order); }} className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 transition-all"><XCircle size={15} /></button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    /* ── CARD (box style) ───────────────────────────────────────────────── */
    return (
        <div className={`
            relative rounded-2xl border-l-4 flex flex-col shadow-md transition-all duration-300 animate-fade-in overflow-hidden
            ${tColor} ${borderColor}
            ${hasNewItems ? 'ring-2 ring-orange-400/60' : ''}
            ${isReady && !hasNewItems ? 'animate-pulse' : ''}
            ${urgency ? 'ring-2 ring-red-500/40' : ''}
        `}>
            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="px-4 pt-3.5 pb-2.5 border-b border-black/[0.06]">
                {/* Row 1: ORDER label + cancel btn */}
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 opacity-70">Order</span>
                    {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' &&
                     (order.orderStatus !== 'ready' || userRole === 'admin') &&
                     (userRole === 'kitchen' || userRole === 'admin') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onCancel(order); }}
                            className="p-1 hover:bg-red-500/15 rounded-lg text-red-500/70 hover:text-red-600 transition-all"
                            title="Cancel order"
                        >
                            <XCircle size={14} />
                        </button>
                    )}
                </div>
                {/* Row 2: Order number + status badge */}
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-black text-gray-900 tracking-tight leading-none">{order.orderNumber}</h3>
                    <StatusBadge status={order.orderStatus} size="sm" />
                </div>
                {/* Row 3: Token/Table + timer */}
                <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/50 border border-black/10 rounded-lg text-[10px] font-black text-gray-700 shadow-sm">
                        <Utensils size={9} className="text-orange-500" />
                        {order.orderType === 'dine-in'
                            ? `Table ${order.tableId?.number || order.tableId || '?'}`
                            : `Token ${order.tokenNumber || '?'}`}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${urgency ? 'text-red-600 bg-red-100 px-1.5 py-0.5 rounded-md' : 'text-gray-400'}`}>
                        <Clock size={10} />{elapsed}
                    </span>
                    {hasNewItems && (
                        <span className="ml-auto text-[8px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wide animate-pulse">+New</span>
                    )}
                </div>
            </div>

            {/* ── Items ─────────────────────────────────────────────────── */}
            <div className="flex-1 px-3 py-2.5 space-y-2 overflow-y-auto custom-scrollbar max-h-[220px]">
                {order.items.map(item => {
                    const status = item.status?.toUpperCase() || 'PENDING';
                    const isCancelled = status === 'CANCELLED';
                    const isItemReady = status === 'READY';
                    const isNewAdd = status === 'PENDING' && (new Date(item.createdAt) - new Date(order.createdAt)) > 30000;
                    const nextStatus = status === 'PENDING' ? 'ACCEPTED' : status === 'ACCEPTED' ? 'PREPARING' : status === 'PREPARING' ? 'READY' : 'PENDING';
                    const canCancel = !isCancelled && status === 'PENDING' && (userRole === 'kitchen' || userRole === 'admin');

                    return (
                        <div key={item._id} className={`flex items-center gap-2 group ${isCancelled ? 'opacity-40' : ''}`}>
                            {/* Qty badge */}
                            <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-black transition-all
                                ${status === 'READY'     ? 'bg-emerald-500 text-white' :
                                  status === 'PREPARING' ? 'bg-indigo-500 text-white' :
                                  status === 'ACCEPTED'  ? 'bg-blue-500 text-white' :
                                  isCancelled            ? 'bg-red-400/30 text-red-500' :
                                  isNewAdd               ? 'bg-orange-500 text-white animate-pulse' :
                                  'bg-white/60 text-gray-700 border border-black/10'}`}
                            >{item.quantity}</div>

                            {/* Name */}
                            <span
                                className={`flex-1 text-xs font-bold leading-tight cursor-pointer transition-opacity hover:opacity-70
                                    ${isItemReady ? 'text-emerald-600' : isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}
                                onClick={() => !isCancelled && status !== 'READY' && onUpdateItemStatus(order._id, item._id, nextStatus)}
                            >
                                {item.name}
                                {item.variant?.name && <span className="ml-1 text-[7px] opacity-70">({item.variant.name})</span>}
                                {isNewAdd && <span className="ml-1.5 bg-orange-500 text-white text-[7px] font-black px-1 py-px rounded uppercase">NEW</span>}
                                {isItemReady && <span className="ml-1.5 text-[7px] font-black text-emerald-500 uppercase">✓ Done</span>}
                            </span>

                            {/* Item action buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                                {!isCancelled && status !== 'READY' && (userRole === 'kitchen' || userRole === 'admin') && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onUpdateItemStatus(order._id, item._id, nextStatus); }}
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-500/15 transition-all"
                                        title="Mark next status"
                                    >
                                        <CheckCheck size={13} />
                                    </button>
                                )}
                                {canCancel && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onCancelItem(order, item); }}
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/15 transition-all"
                                        title="Cancel item"
                                    >
                                        <XCircle size={13} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Action Button ─────────────────────────────────────────── */}
            {(userRole === 'kitchen' || userRole === 'admin') && (
                order.orderStatus === 'pending' || order.orderStatus === 'accepted' || order.orderStatus === 'preparing'
            ) && (
                <div className="px-3 pb-3 pt-2 border-t border-black/[0.06]">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const next = order.orderStatus === 'pending' ? 'accepted' : order.orderStatus === 'accepted' ? 'preparing' : 'ready';
                            onUpdateStatus(order._id, next);
                        }}
                        style={{
                            backgroundColor:
                                order.orderStatus === 'pending' ? 'var(--status-accepted)' :
                                order.orderStatus === 'accepted' ? 'var(--status-preparing)' :
                                'var(--status-ready)'
                        }}
                        className="w-full py-2.5 text-white text-[12px] font-black rounded-xl shadow-md transition-all active:scale-95 hover:brightness-110 tracking-wide"
                    >
                        {order.orderStatus === 'pending' ? 'Accept' : order.orderStatus === 'accepted' ? 'Start Cooking' : 'Mark Ready ✓'}
                    </button>
                </div>
            )}
        </div>
    );
};

/* ── Kitchen Token Card (Compact Mode) ─────────────────────────────────── */
const KitchenTokenCard = ({ order, onClick }) => {
    const urgency = (Date.now() - new Date(order.createdAt)) > 600000;
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
            className={`rounded-2xl border-2 flex flex-col items-center justify-between p-2.5 pt-3 pb-2.5 gap-1.5 transition-all active:scale-95 shadow-sm hover:shadow-md group relative overflow-hidden min-h-[100px]
                ${sColor} ${isReady ? 'animate-pulse' : ''} ${urgency ? 'ring-2 ring-red-500/50' : ''}`}
        >
            <span className="absolute top-1.5 left-2.5 text-[8px] font-black opacity-25 tracking-tight">{order.orderNumber}</span>
            <span className="text-[8px] uppercase font-black opacity-40 tracking-widest mt-2">
                {order.orderType === 'dine-in' ? 'Dine In' : 'Takeaway'}
            </span>
            <span className="text-sm font-black leading-none group-hover:scale-105 transition-transform tracking-tight text-center">
                {order.orderType === 'dine-in'
                    ? `T${order.tableId?.number || order.tableId || '?'}`
                    : `TK${order.tokenNumber || '?'}`}
            </span>
            <div className="text-[7px] font-black uppercase tracking-tight px-2 py-0.5 rounded-md border border-current/30 bg-white/5">
                {order.orderStatus}
            </div>
            <div className="flex items-center justify-between w-full mt-0.5 opacity-40 text-[7px] font-bold">
                <span>{itemCount} items</span>
                <span>{time}</span>
            </div>
        </button>
    );
};

/* ── Main Screen ─────────────────────────────────────────────────────────── */
const KitchenDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'cancelled'
    const [filterType, setFilterType] = useState('all'); // 'all', 'dine-in', 'takeaway'
    const [statusFilter, setStatusFilter] = useState(null);
    const [, setLastRefresh] = useState(new Date());
    const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null, item: null });
    const [detailsModal, setDetailsModal] = useState({ isOpen: false, order: null });
    const [isCardView, setIsCardView] = useState(() => localStorage.getItem('kitchenCardView') !== 'false');
    const [showTables, setShowTables] = useState(false);
    const { user, socket, settings } = useContext(AuthContext);

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
    )
    .filter(o => settings?.takeawayEnabled !== false || o.orderType !== 'takeaway')
    .filter(o => settings?.dineInEnabled   !== false || o.orderType !== 'dine-in')
    .filter(o => {
        const matchesType = filterType === 'all' || o.orderType === filterType;
        const matchesStatus = !statusFilter || o.orderStatus === statusFilter;
        return matchesType && matchesStatus;
    });

    return (
        <div className="space-y-5 animate-fade-in pb-10 text-left">



            {/* ── Tabs & Stats ────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                    {/* TOKEN | CARD segmented pill */}
                    <div className="flex items-center p-1 bg-[var(--theme-bg-dark)] rounded-2xl border border-[var(--theme-border)] shadow-sm shrink-0">
                        <button
                            onClick={() => { setIsCardView(true); localStorage.setItem('kitchenCardView', 'true'); }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                                isCardView 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                            }`}
                        >
                            <Grid size={11} strokeWidth={2.5} />
                            Token
                        </button>
                        <button
                            onClick={() => { setIsCardView(false); localStorage.setItem('kitchenCardView', 'false'); }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                                !isCardView 
                                    ? 'bg-orange-500 text-white shadow-md' 
                                    : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                            }`}
                        >
                            <List size={11} strokeWidth={2.5} />
                            Card
                        </button>
                    </div>
                </div>

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex flex-col gap-4 bg-[var(--theme-bg-card)] p-4 sm:p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                    {/* ALL / DINE-IN / TAKEAWAY filter — hide disabled types */}
                    <div className="flex items-center gap-1.5 p-1 bg-[var(--theme-bg-dark)] rounded-2xl border border-[var(--theme-border)] w-full">
                        {['all', 'dine-in', 'takeaway']
                            .filter(t => t !== 'takeaway' || settings?.takeawayEnabled !== false)
                            .filter(t => t !== 'dine-in'  || settings?.dineInEnabled   !== false)
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
            ) : (
                <>
                    {/* ── Table Map ─────────────────────────────────────────── */}
                    {showTables && (
                        <div className="bg-[var(--theme-bg-card)] p-4 sm:p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm animate-fade-in mb-5">
                            <TableGrid
                                onSelectTable={(t) => {
                                    if (t.status === 'occupied' || t.status === 'active') {
                                        // Find active order for kitchen display comparison
                                        const order = orders.find(o => o.tableId?._id === t._id && ['pending', 'preparing', 'ready'].includes(o.orderStatus));
                                        if (order) setDetailsModal({ isOpen: true, order });
                                    }
                                }}
                                activeOrders={orders}
                            />
                        </div>
                    )}

                    {/* ── KOT Grid ────────────────────────────────────────────── */}
                    <div className={`grid gap-3 ${
                        isCardView 
                            ? 'grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12' 
                            : 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
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
                                {isCardView ? (
                                    <KitchenTokenCard
                                        order={order}
                                        onClick={() => setDetailsModal({ isOpen: true, order })}
                                    />
                                ) : (
                                    <KotTicket
                                        order={order}
                                        onUpdateStatus={updateStatus}
                                        onUpdateItemStatus={updateItemStatus}
                                        onCancel={(o) => setCancelModal({ isOpen: true, order: o, item: null })}
                                        onCancelItem={(o, i) => setCancelModal({ isOpen: true, order: o, item: i })}
                                        userRole={user.role}
                                        viewType="normal"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </>
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

