import { useState, useEffect, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import { ChefHat, Clock, CheckCheck, Utensils, XCircle, Grid, List, Loader2, ChevronRight, ChevronLeft, RefreshCw, X } from 'lucide-react';
import CancelOrderModal from '../../components/CancelOrderModal';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import StatusBadge from '../../components/StatusBadge';
import TableGrid from '../../components/TableGrid';
import { tokenColors } from '../../utils/tokenColors';
import { printBill } from '../../components/BillPrint';


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
    const [isMarkingAll, setIsMarkingAll] = useState(false);
    const [loadingItems, setLoadingItems] = useState({});
    const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
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
                            <button onClick={async (e) => {
                                e.stopPropagation();
                                if(isUpdatingOrder) return;
                                setIsUpdatingOrder(true);
                                try { await onUpdateStatus(order._id, 'accepted'); } finally { setIsUpdatingOrder(false); }
                            }} disabled={isUpdatingOrder} style={{ backgroundColor: 'var(--status-accepted)' }} className={`px-3 flex items-center justify-center min-w-[66px] h-8 text-white text-[10px] font-black rounded-xl active:scale-95 transition-all ${isUpdatingOrder ? 'opacity-70' : ''}`}>
                                {isUpdatingOrder ? <Loader2 size={14} className="animate-spin" /> : 'Accept'}
                            </button>
                        )}
                        {(order.orderStatus === 'accepted' || order.orderStatus === 'preparing') && (
                            <button onClick={async (e) => {
                                e.stopPropagation();
                                if(isUpdatingOrder) return;
                                setIsUpdatingOrder(true);
                                try { await onUpdateStatus(order._id, order.orderStatus === 'accepted' ? 'preparing' : 'ready'); } finally { setIsUpdatingOrder(false); }
                            }} disabled={isUpdatingOrder} style={{ backgroundColor: order.orderStatus === 'accepted' ? 'var(--status-preparing)' : 'var(--status-ready)' }} className={`px-3 flex items-center justify-center min-w-[66px] h-8 text-white text-[10px] font-black rounded-xl active:scale-95 transition-all ${isUpdatingOrder ? 'opacity-70' : ''}`}>
                                {isUpdatingOrder ? <Loader2 size={14} className="animate-spin" /> : (order.orderStatus === 'accepted' ? 'Start' : 'Ready ✓')}
                            </button>
                        )}
                        {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (order.orderStatus !== 'ready' || userRole === 'admin') && (
                            <button onClick={(e) => { e.stopPropagation(); onCancel(order); }} className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 transition-all"><XCircle size={15} /></button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    /* ── CARD (box style - mimics Waiter Order History view) ────────────── */
    return (
        <div className={`
            relative flex flex-col rounded-2xl border shadow-sm transition-all duration-300 animate-fade-in overflow-hidden h-full
            bg-[var(--theme-bg-card)] border-[var(--theme-border)] border-l-4 ${borderColor}
            ${hasNewItems ? 'ring-2 ring-orange-400/60' : ''}
            ${isReady && !hasNewItems ? 'animate-pulse' : ''}
            ${urgency ? 'ring-2 ring-red-500/40' : ''}
        `}>
            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="px-3 pt-3 pb-2.5 border-b border-[var(--theme-border)]">
                {/* Row 1: order number + status badge */}
                <div className="flex items-center justify-between gap-1 mb-2 relative">
                    <h3 className="text-[14px] font-black text-[var(--theme-text-main)] tracking-tight leading-none truncate pr-1">
                        {order.orderNumber.replace('ORD-', '#')}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {hasNewItems && <span className="text-[8px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wide animate-pulse">+New</span>}
                        {/* ALL Advancement Toggle - Jump to READY directly */}
                        {order.items.some(i => i.status?.toUpperCase() !== 'READY' && i.status?.toUpperCase() !== 'CANCELLED') && 
                         order.orderStatus !== 'ready' && order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' &&
                         (userRole === 'kitchen' || userRole === 'admin') && (
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (isMarkingAll) return;
                                    setIsMarkingAll(true);
                                    try {
                                        const pendingItems = order.items.filter(i => 
                                            i.status?.toUpperCase() !== 'READY' && 
                                            i.status?.toUpperCase() !== 'CANCELLED'
                                        );
                                        // Directly mark all as READY in one batch
                                        await Promise.all(pendingItems.map(item => 
                                            onUpdateItemStatus(order._id, item._id, 'READY')
                                        ));
                                        // Also advance the whole order to READY
                                        await onUpdateStatus(order._id, 'ready');
                                    } finally {
                                        setIsMarkingAll(false);
                                    }
                                }}
                                disabled={isMarkingAll}
                                className={`flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase transition-all px-1.5 py-0.5 rounded border ${
                                    isMarkingAll 
                                        ? 'bg-emerald-100/50 text-emerald-600/50 border-emerald-200/50 cursor-not-allowed' 
                                        : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 active:scale-95'
                                }`}
                                title="Mark all as ready"
                            >
                                {isMarkingAll ? <Loader2 size={10} className="animate-spin" /> : <CheckCheck size={10} />} All
                            </button>
                        )}
                        <StatusBadge status={order.orderStatus} size="xs" />
                    </div>
                </div>
                {/* Row 2: Token/Table + timer */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--theme-bg-hover)] border border-[var(--theme-border)] rounded-lg text-[10px] font-black text-[var(--theme-text-main)] shadow-sm truncate max-w-[50%]">
                            <Utensils size={9} className="text-orange-500 shrink-0" />
                            {order.orderType === 'dine-in' ? `T${order.tableId?.number || order.tableId || '?'}` : `TK${order.tokenNumber || '?'}`}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold shrink-0 text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md">
                            <Clock size={10} />{elapsed.replace(' ', '')}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Items ─────────────────────────────────────────────────── */}
            <div className="flex-1 px-3 py-2.5 space-y-2 overflow-y-auto custom-scrollbar min-h-[60px] max-h-[220px]">
                {/* ACTIVE ITEMS */}
                {order.items.filter(i => i.status?.toUpperCase() !== 'READY').map(item => {
                    const status = item.status?.toUpperCase() || 'PENDING';
                    const isCancelled = status === 'CANCELLED';
                    const isNewAdd = status === 'PENDING' && (new Date(item.createdAt) - new Date(order.createdAt)) > 30000;
                    const nextStatus = status === 'PENDING' ? 'ACCEPTED' : status === 'ACCEPTED' ? 'PREPARING' : status === 'PREPARING' ? 'READY' : 'PENDING';
                    const canCancel = !isCancelled && status === 'PENDING' && (userRole === 'kitchen' || userRole === 'admin');

                    return (
                        <div key={item._id} className={`flex items-start gap-2 group ${isCancelled ? 'opacity-40' : ''}`}>
                            <div className="w-4 h-4 mt-0.5 shrink-0 rounded flex items-center justify-center text-[10px] font-black bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)] border border-[var(--theme-border)]">
                                {item.quantity}
                            </div>

                            <span
                                className={`flex-1 text-[11px] font-bold leading-tight mt-0.5
                                    ${isCancelled ? 'line-through text-[var(--theme-text-muted)]' : 'text-[var(--theme-text-main)]'}
                                    ${loadingItems[item._id] ? 'opacity-50' : ''}`}
                            >
                                {item.name}
                                {item.variant?.name && <span className="ml-1 text-[8px] opacity-70">({item.variant.name})</span>}
                                {isNewAdd && <span className="ml-1.5 bg-orange-500 text-white text-[7px] font-black px-1 py-px rounded uppercase">NEW</span>}
                            </span>

                            <div className="flex items-center gap-1 shrink-0">
                                {canCancel && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onCancelItem(order, item); }}
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--theme-text-subtle)] hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                                        title="Cancel item"
                                    >
                                        <XCircle size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* COMPLETED ITEMS (Streamlined) */}
                {order.items.some(i => i.status?.toUpperCase() === 'READY') && (
                    <div className="mt-2 pt-2 border-t border-dashed border-[var(--theme-border)] opacity-60">
                        <p className="text-[8px] font-black text-emerald-600 mb-1.5 tracking-widest uppercase">✓ Completed</p>
                        <div className="space-y-1">
                            {order.items.filter(i => i.status?.toUpperCase() === 'READY').map(item => (
                                <div key={item._id} className="flex items-center gap-2 text-[10px] font-medium text-[var(--theme-text-muted)]">
                                    <span className="w-3.5 h-3.5 flex items-center justify-center bg-emerald-500/10 text-emerald-600 text-[8px] font-bold rounded ring-1 ring-emerald-500/20">{item.quantity}</span>
                                    <span className="line-through">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <div className="px-3 py-2 border-t border-[var(--theme-border)] bg-[var(--theme-bg-hover)] mt-auto flex items-center justify-between gap-2">
                <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-tighter shrink-0">
                    {order.orderType === 'dine-in' ? 'DINE' : 'TAKE'}
                </span>

                <div className="flex items-center gap-1">
                    {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' &&
                     (order.orderStatus !== 'ready' || userRole === 'admin') &&
                     (userRole === 'kitchen' || userRole === 'admin') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onCancel(order); }}
                            className="p-1 hover:bg-red-500/15 rounded-md text-red-500/70 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20 mr-1"
                            title="Cancel order"
                        >
                            <XCircle size={14} />
                        </button>
                    )}
                    
                    {(userRole === 'kitchen' || userRole === 'admin') && (
                        order.orderStatus === 'pending' || order.orderStatus === 'accepted' || order.orderStatus === 'preparing'
                    ) ? (
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (isUpdatingOrder) return;
                                setIsUpdatingOrder(true);
                                try {
                                    const next = order.orderStatus === 'pending' ? 'accepted' : order.orderStatus === 'accepted' ? 'preparing' : 'ready';
                                    await onUpdateStatus(order._id, next);
                                } finally {
                                    setIsUpdatingOrder(false);
                                }
                            }}
                            disabled={isUpdatingOrder}
                            className={`px-3 py-1.5 flex items-center justify-center min-w-[65px] h-[26px] text-white text-[10px] font-black rounded-lg shadow-sm transition-all active:scale-95 uppercase tracking-wider ${
                                order.orderStatus === 'pending' ? 'bg-[var(--status-accepted)] hover:brightness-110' :
                                order.orderStatus === 'accepted' ? 'bg-[var(--status-preparing)] hover:brightness-110' :
                                'bg-[var(--status-ready)] hover:brightness-110 text-emerald-900 border border-emerald-900/10'
                            } ${isUpdatingOrder ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {isUpdatingOrder ? <Loader2 size={12} className="animate-spin" /> : order.orderStatus === 'pending' ? 'Accept' : order.orderStatus === 'accepted' ? 'Start' : 'Ready'}
                        </button>
                    ) : null}
                </div>
            </div>
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
            className={`w-full min-h-[100px] h-[100px] sm:min-h-[120px] sm:h-[120px] max-w-[150px] mx-auto rounded-2xl border-2 flex flex-col items-center justify-between p-2.5 sm:p-3 transition-all hover:-translate-y-0.5 active:scale-95 shadow-sm overflow-hidden group relative
                ${sColor} ${isReady ? 'animate-pulse' : ''} ${urgency ? 'ring-2 ring-red-500/50' : ''}`}
        >
            {/* Top row */}
            <div className="flex items-start justify-between w-full shrink-0 relative">
                <span className="text-[8px] sm:text-[9px] uppercase font-black opacity-50 tracking-wider">
                    {order.orderType === 'dine-in' ? 'Dine' : 'Take'}
                </span>
                <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border border-current/30 bg-white/10 shrink-0">
                    {order.orderStatus}
                </span>
                {/* floating order # */}
                <span className="absolute top-6 -left-0.5 text-[7px] font-black opacity-30 tracking-tight leading-none pointer-events-none">{order.orderNumber.replace('ORD-', '#')}</span>
            </div>

            {/* Middle big identifier */}
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 pt-2">
                <span className="text-xl sm:text-2xl font-black leading-none tracking-tight text-center px-1 break-words w-full truncate group-hover:scale-105 transition-transform">
                    {order.orderType === 'dine-in'
                        ? `T${order.tableId?.number || order.tableId || '?'}`
                        : `TK${order.tokenNumber || '?'}`}
                </span>
            </div>

            {/* Bottom details */}
            <div className="flex items-center justify-between w-full opacity-60 text-[7px] sm:text-[8px] font-bold shrink-0 mt-auto">
                <span className="truncate pr-1">{itemCount} items</span>
                <span className="whitespace-nowrap">{time}</span>
            </div>
        </button>
    );
};

/* ── Main Screen ─────────────────────────────────────────────────────────── */
const KitchenDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'active'; // 'active', 'cancelled', 'completed'
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
        if (user.role !== 'kitchen') return;
        try {
            await api.put(`/api/orders/${orderId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
        } catch (err) {
            console.error(err);
        }
    };

    const updateItemStatus = async (orderId, itemId, newStatus) => {
        if (user.role !== 'kitchen') return;
        try {
            await api.put(`/api/orders/${orderId}/items/${itemId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
        } catch (err) {
            console.error(err);
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
            console.error(err);
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

            {/* ── TopBar Portal (Relocated Controls) ────────────────────── */}
            {document.getElementById('topbar-portal') && createPortal(
                <div className="flex items-center justify-between w-full h-full animate-fade-in translate-y-0.5 pr-4">
                    <div className="flex items-center gap-3">
                        {/* 0. Stats Toggle - Triple Chevron Arrow View */}
                        <button 
                            onClick={() => setShowTables(!showTables)} 
                            className={`p-2.5 bg-black/5 dark:bg-white/5 rounded-2xl border border-[var(--theme-border)] shadow-sm shrink-0 transition-all duration-300 group hover:bg-black/10 dark:hover:bg-white/10 ${showTables ? 'ring-2 ring-orange-500/20 shadow-inner' : ''}`}
                            title="Toggle Counters"
                        >
                            <div className={`transition-transform duration-500 flex items-center justify-center ${showTables ? 'rotate-180' : 'rotate-0'}`}>
                                <div className="flex items-center text-rose-500">
                                    <ChevronLeft size={18} strokeWidth={3} className="-mr-2.5" />
                                    <ChevronLeft size={18} strokeWidth={3} className="-mr-2.5" />
                                    <ChevronLeft size={18} strokeWidth={3} />
                                </div>
                            </div>
                        </button>

                        {/* 1. All | Dine-in | Takeaway - Capsule/Pill Switch */}
                        <div className="flex items-center p-1 bg-black/5 dark:bg-white/5 rounded-full border border-[var(--theme-border)] shadow-inner shrink-0 leading-none">
                            {['all', 'dine-in', 'takeaway']
                                .filter(t => t !== 'takeaway' || settings?.takeawayEnabled !== false)
                                .filter(t => t !== 'dine-in' || settings?.dineInEnabled !== false)
                                .map(t => (
                                    <button 
                                        key={t} 
                                        onClick={() => setFilterType(t)} 
                                        className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                            filterType === t 
                                                ? 'bg-white dark:bg-[var(--theme-bg-card)] text-orange-500 shadow-md transform scale-[1.02]' 
                                                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                                        }`}
                                    >
                                        {t === 'all' ? 'ALL' : t === 'dine-in' ? 'DINE-IN' : 'TAKE-AWAY'}
                                    </button>
                                ))}
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-4">
                        {/* 2. View Mode Toggle - 3D Pill Handle */}
                        <button
                            onClick={() => { const next = !isCardView; setIsCardView(next); localStorage.setItem('kitchenCardView', next); }}
                            className={`
                                relative flex items-center h-10 w-28 rounded-full transition-all duration-300 shadow-inner overflow-hidden border
                                ${isCardView 
                                    ? 'bg-blue-600/10 border-blue-500/20' 
                                    : 'bg-orange-500/10 border-orange-500/20'}
                            `}
                        >
                            <div 
                                className={`
                                    absolute top-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                    ${isCardView 
                                        ? 'left-1 bg-blue-600 rotate-0' 
                                        : 'left-[calc(100%-36px)] bg-orange-600 rotate-[360deg]'}
                                `}
                            >
                                {isCardView ? <Grid size={14} strokeWidth={3} className="text-white" /> : <List size={14} strokeWidth={3} className="text-white" />}
                            </div>

                            <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
                                <span className={`text-[9px] font-black transition-all duration-300 ${isCardView ? 'opacity-100 translate-x-7 text-blue-600' : 'opacity-0 translate-x-3'}`}>TOKEN</span>
                                <span className={`text-[9px] font-black transition-all duration-300 ${!isCardView ? 'opacity-100 -translate-x-7 text-orange-600' : 'opacity-0 -translate-x-3'}`}>CARD</span>
                            </div>
                        </button>

                        {/* 3. Refresh Live */}
                        <button
                            onClick={() => { window.dispatchEvent(new CustomEvent('pos-refresh')); }}
                            className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.15)] transition-all active:translate-y-[1px] active:scale-95"
                            title="Refresh Live"
                        >
                            <RefreshCw size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>,
                document.getElementById('topbar-portal')
            )}

            {/* ── Status View (Slide-down Counters) ───────────────────── */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showTables ? 'max-h-[200px] opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[var(--theme-bg-card)] p-3 rounded-2xl border-2 border-[var(--theme-border)] shadow-xl">
                    {[
                        { key: 'pending', count: counts.pending, dot: 'bg-[var(--status-pending)]', label: 'Pending', activeColor: 'text-[var(--status-pending)]', activeBg: 'bg-[var(--status-pending-bg)]' },
                        { key: 'accepted', count: counts.accepted, dot: 'bg-[var(--status-accepted)]', label: 'Accepted', activeColor: 'text-[var(--status-accepted)]', activeBg: 'bg-[var(--status-accepted-bg)]' },
                        { key: 'preparing', count: counts.preparing, dot: 'bg-[var(--status-preparing)]', label: 'Cooking', activeColor: 'text-[var(--status-preparing)]', activeBg: 'bg-[var(--status-preparing-bg)]' },
                        { key: 'ready', count: counts.ready, dot: 'bg-[var(--status-ready)]', label: 'Ready', activeColor: 'text-[var(--status-ready)]', activeBg: 'bg-[var(--status-ready-bg)]' },
                    ].map(({ key, count, dot, label, activeColor, activeBg }, idx) => (
                        <button 
                            key={key} 
                            onClick={() => setStatusFilter(f => f === key ? null : key)} 
                            style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'backwards' }}
                            className={`group rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center transition-all duration-300 border animate-in fade-in zoom-in-95 slide-in-from-top-2 ${
                                statusFilter === key ? `${activeBg} border-transparent shadow-sm scale-95` : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] hover:border-orange-500/30'
                            }`}
                        >
                            <p className={`text-lg sm:text-2xl font-black tabular-nums ${statusFilter === key ? activeColor : 'text-[var(--theme-text-main)]'}`}>{count}</p>
                            <div className="flex items-center gap-1 mt-1">
                                <div className={`flex items-center -ml-0.5 scale-[1.01] ${statusFilter === key ? activeColor : dot.replace('bg-', 'text-')}`}>
                                    <ChevronRight size={12} strokeWidth={4} className="animate-chevron-r1" />
                                    <ChevronRight size={12} strokeWidth={4} className="-ml-1.5 opacity-60 animate-chevron-r2" />
                                    <ChevronRight size={12} strokeWidth={4} className="-ml-1.5 opacity-20 animate-chevron-r3" />
                                </div>
                                <p className={`text-[8px] sm:text-[10px] ml-0.5 uppercase font-bold tracking-wider ${statusFilter === key ? activeColor : 'text-[var(--theme-text-muted)]'}`}>{label}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── KOT Grid ────────────────────────────────────────────── */}
            {loading ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
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
                <div className={`grid gap-4 p-4 ${
                    isCardView
                        ? 'grid-cols-[repeat(auto-fill,minmax(160px,1fr))]'
                        : 'grid-cols-[repeat(auto-fill,minmax(240px,1fr))]'
                }`}>
                    {displayOrders.map(order => (
                        <div key={order._id} className="h-full transition-transform">
                            {isCardView ? (
                                <KitchenTokenCard
                                    order={order}
                                    onClick={() => printBill(order, (p) => `₹${p}`, settings, true)}
                                />
                            ) : (
                                <div onClick={() => printBill(order, (p) => `₹${p}`, settings, true)} className="cursor-pointer h-full">
                                    <KotTicket
                                        order={order}
                                        onUpdateStatus={updateStatus}
                                        onUpdateItemStatus={updateItemStatus}
                                        onCancel={(o) => setCancelModal({ isOpen: true, order: o, item: null })}
                                        onCancelItem={(o, i) => setCancelModal({ isOpen: true, order: o, item: i })}
                                        userRole={user.role}
                                        viewType="normal"
                                    />
                                </div>
                            )}
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

