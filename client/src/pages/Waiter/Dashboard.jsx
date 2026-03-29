import { useState, useEffect, useContext, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import { Utensils, Package, Grid, List, ShoppingBag, Clock, History, WifiOff, ChevronRight, ChevronLeft, RefreshCw, X, Armchair } from 'lucide-react';
import TableGrid from '../../components/TableGrid';
import CancelOrderModal from '../../components/CancelOrderModal';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import StatusBadge from '../../components/StatusBadge';
import NotificationBell from '../../components/NotificationBell';

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
                        <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-black bg-black/5 text-gray-700">
                            {item.quantity}
                        </div>
                        <span className="flex-1 text-[11px] font-bold text-gray-900 leading-tight line-clamp-2">{item.name}{item.variant ? ` (${item.variant.name})` : ''}</span>
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
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-black text-[var(--theme-text-main)] tracking-tight">{order.orderNumber}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-white/60 dark:bg-white/10 border border-[var(--theme-border)] text-[10px] font-black text-[var(--theme-text-main)] whitespace-nowrap shadow-sm">
                        {order.orderType === 'dine-in'
                            ? `Table ${order.tableId?.number || order.tableId || '?'}`
                            : `Token ${order.tokenNumber || '?'}`}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-black text-[var(--theme-text-main)]">{formatPrice(order.finalAmount)}</span>
                    <StatusBadge status={order.orderStatus} />
                </div>
            </div>
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

/* ── Production Token Card ───────────────────────────────────────────────── */
const STATUS_META = {
    pending:   { bar: 'bg-amber-500',   card: 'bg-amber-50   border-amber-200',   num: 'text-amber-600',   badge: 'bg-amber-100   text-amber-700   border-amber-300',   glow: 'shadow-amber-200' },
    accepted:  { bar: 'bg-blue-500',    card: 'bg-blue-50    border-blue-200',    num: 'text-blue-600',    badge: 'bg-blue-100    text-blue-700    border-blue-300',    glow: 'shadow-blue-200' },
    preparing: { bar: 'bg-violet-500',  card: 'bg-violet-50  border-violet-200',  num: 'text-violet-600',  badge: 'bg-violet-100  text-violet-700  border-violet-300',  glow: 'shadow-violet-200' },
    ready:     { bar: 'bg-emerald-500', card: 'bg-emerald-50 border-emerald-300', num: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-400', glow: 'shadow-emerald-300' },
    completed: { bar: 'bg-gray-800',    card: 'bg-gray-50    border-gray-300',    num: 'text-gray-900',    badge: 'bg-gray-200    text-gray-800    border-gray-400',    glow: 'shadow-gray-200' },
    cancelled: { bar: 'bg-rose-500',    card: 'bg-rose-50    border-rose-200',    num: 'text-rose-600',    badge: 'bg-rose-100    text-rose-700    border-rose-300',    glow: 'shadow-rose-200' },
};

const TokenSquare = memo(({ order, onClick, isSelected }) => {
    const elapsed = useElapsed(order.createdAt);
    const isReady = order.orderStatus?.toLowerCase() === 'ready';
    const s = STATUS_META[order.orderStatus?.toLowerCase()] || STATUS_META.pending;
    const isDine = order.orderType === 'dine-in';
    const identifier = isDine
        ? (order.tableId?.number || order.tableId || '?')
        : (order.tokenNumber || '?');
    const activeItems = order.items?.filter(i => i.status?.toUpperCase() !== 'CANCELLED') || [];
    const itemCount = activeItems.length;

    return (
        <button
            onClick={onClick}
            style={{ transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease, ring 200ms ease' }}
            className={`
                w-full rounded-xl border flex flex-col overflow-hidden group
                hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:scale-[0.98]
                ${s.card} ${s.glow}
                ${isReady ? 'shadow-md shadow-emerald-200' : 'shadow-sm'}
                ${isSelected ? 'ring-2 ring-orange-500 ring-offset-1 -translate-y-0.5 shadow-lg shadow-orange-200' : ''}
            `}
        >
            {/* Status accent bar */}
            <div className={`h-1 w-full shrink-0 ${s.bar} ${isReady ? 'animate-pulse' : ''}`} />

            {/* Metric Top Section (Value on Top, Label Below) */}
            <div className="flex flex-col items-center pt-2.5 pb-2">
                {/* 1. Status Row */}
                <div className="flex items-center gap-1 mb-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${s.bar}`} />
                    <span className={`text-[7px] font-black uppercase tracking-widest ${s.num}`}>{order.orderStatus}</span>
                </div>

                {/* 2. Primary Identifier (Table/Token) - FORCED BLACK */}
                <div className="flex flex-col items-center justify-center">
                    <span className={`text-2xl font-black leading-none tracking-tighter text-black group-hover:scale-110 transition-transform duration-200`}>
                        {identifier}
                    </span>
                    <span className="text-[7px] font-black uppercase tracking-[0.2rem] text-black mt-1">
                        {isDine ? 'TABLE' : 'TOKEN'}
                    </span>
                </div>
            </div>

            {/* Middle Section: Financial & Order Info - FORCED BLACK */}
            <div className="grid grid-cols-2 border-t border-black/[0.04] bg-black/[0.01]">
                <div className="flex flex-col items-center py-1.5 border-r border-black/[0.04]">
                    <span className="text-[10px] font-black text-black tracking-tight leading-none">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(order.finalAmount)}
                    </span>
                    <span className="text-[6px] font-black text-black uppercase tracking-widest mt-0.5">AMOUNT</span>
                </div>
                <div className="flex flex-col items-center py-1.5">
                    <span className="text-[10px] font-black text-black tracking-tight leading-none">
                        #{order.orderNumber.replace('ORD-', '')}
                    </span>
                    <span className="text-[6px] font-black text-black uppercase tracking-widest mt-0.5">ORDER</span>
                </div>
            </div>

            {/* Item list */}
            {activeItems.length > 0 && (
                <div className="px-2 pb-1.5 space-y-0.5 border-t border-black/[0.04] pt-1.5">
                    {activeItems.slice(0, 1).map((item, i) => (
                        <div key={i} className="flex items-center gap-1 text-[9px] font-bold text-gray-950 leading-tight">
                            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] font-black shrink-0 ${s.badge} border`}>
                                {item.quantity}
                            </span>
                            <span className="truncate">{item.name}{item.variant ? ` · ${item.variant.name}` : ''}</span>
                        </div>
                    ))}
                    {activeItems.length > 1 && (
                        <div className="pl-[1.25rem] w-full text-left">
                            <span className={`text-[7px] font-black ${s.num} opacity-70 uppercase tracking-tight`}>
                                +{activeItems.length - 1} more
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Footer bar */}
            <div className="flex items-center justify-between px-2 py-1.5 border-t border-black/[0.04] bg-black/[0.025] shrink-0">
                <span className="flex items-center gap-1 text-[8px] font-black text-gray-400">
                    <ShoppingBag size={8} />
                    {itemCount}
                </span>
                <span className={`flex items-center gap-1 text-[8px] font-black ${(Date.now() - new Date(order.createdAt)) > 600000 ? 'text-red-500' : 'text-gray-400'}`}>
                    <Clock size={8} />
                    {elapsed}
                </span>
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
    const [statusFilter, setStatusFilter] = useState(null); 
    const [filterType, setFilterType] = useState('all'); 
    const [showTables, setShowTables] = useState(false);
    const [showCounters, setShowCounters] = useState(false); // Default Off per user request
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null, item: null });
    const [refreshing, setRefreshing] = useState(false);
    const [isProductionMode, setIsProductionMode] = useState(() => {
        const local = localStorage.getItem('isProductionMode');
        if (local !== null) return local === 'true';
        return false;
    });
    const { user, socket, formatPrice, settings } = useContext(AuthContext);

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

    const handleReserveTable = useCallback(async (tableId) => {
        try {
            const res = await api.put(`/api/tables/${tableId}/reserve`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
            setTables(prev => prev.map(t => t._id === tableId ? res.data : t));
        } catch (err) { alert(err.response?.data?.message || 'Failed to reserve table'); }
    }, [user]);

    const handleCancelReservation = useCallback(async (tableId) => {
        try {
            const res = await api.put(`/api/tables/${tableId}/release`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
            setTables(prev => prev.map(t => t._id === tableId ? res.data : t));
        } catch (err) { alert(err.response?.data?.message || 'Failed to cancel reservation'); }
    }, [user]);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            setFetchError(false);
            const res = await api.get('/api/orders', { params: { limit: 100 }, headers: { Authorization: `Bearer ${user.token}` } });
            setOrders(res.data.orders || []);
        } catch (err) { setFetchError(true); } finally { setLoading(false); }
    }, [user]);

    useEffect(() => {
        if (user) fetchOrders();
        if (socket) {
            const onNew = (o) => setOrders(p => { if (p.find(x => x._id === o._id)) return p; return [o, ...p]; });
            const onUpdate = (o) => {
                setOrders(p => { const exists = p.find(x => x._id === o._id); return exists ? p.map(x => x._id === o._id ? o : x) : [o, ...p]; });
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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const openId = params.get('openOrder');
        if (openId && orders.length > 0) {
            const target = orders.find(o => o._id === openId);
            if (target) { setSelectedOrder(target); navigate('/waiter', { replace: true }); }
        }
    }, [orders, navigate]);

    const handleCancelAction = async (orderId, arg2, arg3) => {
        try {
            const isItem = arg3 !== undefined;
            const url = isItem ? `/api/orders/${orderId}/items/${arg2}/cancel` : `/api/orders/${orderId}/cancel`;
            const reason = isItem ? arg3 : arg2;
            await api.put(url, { reason }, { headers: { Authorization: `Bearer ${user.token}` } });
        } catch (err) { alert(err.response?.data?.message || "Action failed"); }
    };

    const activeOrders = orders.filter(o => o.paymentStatus !== 'paid' && o.orderStatus !== 'cancelled');
    const historyOrders = orders.filter(o => o.paymentStatus === 'paid').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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

    const readyOrders = filteredOrders.filter(o => o.orderStatus === 'ready');
    const processOrders = filteredOrders.filter(o => o.orderStatus !== 'ready');
    const displayOrders = statusFilter === 'ready' ? readyOrders : processOrders;

    // TOKEN mode: prev / next navigation
    const tokenIdx = selectedOrder ? displayOrders.findIndex(o => o._id === selectedOrder._id) : -1;
    const goNext = useCallback(() => {
        if (tokenIdx < displayOrders.length - 1) setSelectedOrder(displayOrders[tokenIdx + 1]);
    }, [tokenIdx, displayOrders]);
    const goPrev = useCallback(() => {
        if (tokenIdx > 0) setSelectedOrder(displayOrders[tokenIdx - 1]);
    }, [tokenIdx, displayOrders]);

    return (
        <div className="flex flex-col gap-2 animate-fade-in text-left">
            {fetchError && (
                <div id="net-error-alert" className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-bounce-subtle">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <WifiOff size={20} className="text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-600">Network Connection Error</h3>
                            <p className="text-[10px] text-red-500 font-medium">Cannot reach the POS server.</p>
                        </div>
                    </div>
                    <button onClick={() => fetchOrders()} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95">Try Again</button>
                </div>
            )}

            {/* ── Row 1: Filter + action buttons ── */}
            {document.getElementById('topbar-portal') && createPortal(
                <div className="flex items-center justify-between w-full h-full animate-fade-in pr-2 md:pr-3">
                    {/* Left: filter pill */}
                    <div className="flex items-center gap-2 min-w-0">
                        {/* Filter Pill */}
                        <div className="flex items-center p-0.5 bg-[var(--theme-bg-dark)] rounded-xl border border-[var(--theme-border)] shadow-sm flex-1 md:flex-none">
                            {['all', 'dine-in', 'takeaway']
                                .filter(t => t !== 'takeaway' || settings?.takeawayEnabled !== false)
                                .filter(t => t !== 'dine-in' || settings?.dineInEnabled !== false)
                                .map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setFilterType(t)}
                                        className={`flex-1 px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg text-[10px] md:text-[11px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${filterType === t ? 'bg-[var(--theme-bg-card)] text-orange-500 shadow-sm border border-[var(--theme-border)]' : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'}`}
                                    >
                                        <span className="hidden sm:inline">{t === 'all' ? 'All' : t === 'dine-in' ? 'Dine-In' : 'Takeaway'}</span>
                                        <span className="inline sm:hidden">{t === 'all' ? 'All' : t === 'dine-in' ? 'Dine' : 'Take'}</span>
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* Right: Mobile-only utility buttons — now pushed right by justify-between */}
                    <div className="flex md:hidden items-center gap-1.5 shrink-0 ml-auto">
                        <button onClick={() => setShowCounters(!showCounters)} className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${showCounters ? 'bg-orange-500/15 border-orange-500/40 text-orange-500' : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)]'}`}>
                            <Clock size={16} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => setIsProductionMode(!isProductionMode)} className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${isProductionMode ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500' : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)]'}`}>
                            {isProductionMode ? <Grid size={16} strokeWidth={2.5} /> : <List size={16} strokeWidth={2.5} />}
                        </button>
                        <button onClick={() => { if (refreshing) return; setRefreshing(true); fetchOrders(); setTimeout(() => setRefreshing(false), 1000); }} className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${refreshing ? 'border-orange-500/40 bg-orange-500/10 text-orange-500' : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)]'}`}>
                            <RefreshCw size={16} strokeWidth={2.5} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Right: desktop controls — icon-only utility buttons + action buttons */}
                    <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        {/* Icon-only utility buttons */}
                        <button onClick={() => setShowCounters(prev => !prev)} title="Stats"
                            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${showCounters ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'}`}>
                            <Clock size={16} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => setIsProductionMode(!isProductionMode)} title={isProductionMode ? 'Grid view' : 'List view'}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${isProductionMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'}`}>
                            {isProductionMode ? <Grid size={16} strokeWidth={2.5} /> : <List size={16} strokeWidth={2.5} />}
                        </button>
                        {settings?.tableMapEnabled !== false && (
                            <button onClick={() => setShowTables(t => !t)} title="Tables"
                                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${showTables ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'}`}>
                                <Armchair size={16} strokeWidth={2.5} />
                            </button>
                        )}

                        <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />

                        {/* Action buttons */}
                        {user?.role !== 'cashier' && settings?.dineInEnabled !== false && (
                            <button onClick={() => navigate('/dine-in')} className="flex items-center gap-2 h-10 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-[11px] uppercase tracking-wide transition-all active:scale-95 whitespace-nowrap">
                                <Utensils size={14} strokeWidth={3} />Dine In
                            </button>
                        )}
                        {user?.role !== 'cashier' && settings?.takeawayEnabled !== false && (
                            <button onClick={() => navigate('/take-away')} className="flex items-center gap-2 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[11px] uppercase tracking-wide transition-all active:scale-95 whitespace-nowrap">
                                <Package size={14} strokeWidth={3} />Takeaway
                            </button>
                        )}

                        {/* Refresh */}
                        <button onClick={() => { if (refreshing) return; setRefreshing(true); fetchOrders(); setTimeout(() => setRefreshing(false), 1000); }} title="Refresh"
                            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 ml-1 ${refreshing ? 'border-orange-500/40 bg-orange-500/10 text-orange-500' : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'}`}>
                            <RefreshCw size={16} strokeWidth={2.5} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>,
                document.getElementById('topbar-portal')
            )}

            {/* ── Row 2 (mobile only): secondary controls ── */}
            {document.getElementById('topbar-portal-row2') && createPortal(
                <div className="flex items-center justify-between w-full gap-1.5 animate-fade-in px-1">
                    {/* Tables Toggle */}
                    {settings?.tableMapEnabled !== false && (
                        <button
                            onClick={() => setShowTables(t => !t)}
                            className={`flex flex-[0.8] min-w-0 items-center justify-center gap-1.5 h-10 rounded-xl border transition-all active:scale-95 ${showTables ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 shadow-inner' : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500/60'}`}
                        >
                            <Armchair size={13} className="shrink-0" />
                            <span className="text-[9px] font-black uppercase truncate">Tables</span>
                        </button>
                    )}

                    {/* Dine In Action */}
                    {user?.role !== 'cashier' && settings?.dineInEnabled !== false && (
                        <button onClick={() => navigate('/dine-in')} className="flex-1 min-w-0 flex items-center justify-center gap-2 h-10 bg-orange-500 text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-wider active:scale-95 shadow-lg shadow-orange-500/20">
                            <Utensils size={12} strokeWidth={3} className="shrink-0" /> <span className="truncate">Dine In</span>
                        </button>
                    )}

                    {/* Take Away Action */}
                    {user?.role !== 'cashier' && settings?.takeawayEnabled !== false && (
                        <button onClick={() => navigate('/take-away')} className="flex-1 min-w-0 flex items-center justify-center gap-2 h-10 bg-blue-600 text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-wider active:scale-95 shadow-lg shadow-blue-600/20">
                            <Package size={12} strokeWidth={3} className="shrink-0" /> <span className="truncate">Takeaway</span>
                        </button>
                    )}
                </div>,
                document.getElementById('topbar-portal-row2')
            )}

            {activeTab === 'active' && (
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showCounters ? 'max-h-[200px] opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'}`}>
                    <div className="flex items-stretch gap-1.5 w-full">
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[var(--theme-bg-dark)]/40 p-1.5 rounded-xl border border-[var(--theme-border)] shadow-sm min-w-0 transition-all duration-300">
                            {[
                                { key: 'pending', count: counts.pending, dot: 'bg-[var(--status-pending)]', label: 'Pending', activeColor: 'text-[var(--status-pending)]', activeBg: 'bg-[var(--status-pending-bg)]' },
                                { key: 'accepted', count: counts.accepted, dot: 'bg-[var(--status-accepted)]', label: 'Accepted', activeColor: 'text-[var(--status-accepted)]', activeBg: 'bg-[var(--status-accepted-bg)]' },
                                { key: 'preparing', count: counts.preparing, dot: 'bg-[var(--status-preparing)]', label: 'Cooking', activeColor: 'text-[var(--status-preparing)]', activeBg: 'bg-[var(--status-preparing-bg)]' },
                                { key: 'ready', count: counts.ready, dot: 'bg-[var(--status-ready)]', label: 'Ready', activeColor: 'text-[var(--status-ready)]', activeBg: 'bg-[var(--status-ready-bg)]' },
                            ].map(({ key, count, dot, label, activeColor, activeBg }, idx) => (
                                <button 
                                    key={key} 
                                    onClick={() => setStatusFilter(f => f === key ? null : key)} 
                                    style={{ 
                                        animationDelay: `${idx * 0.05}s`,
                                        animationFillMode: 'backwards' 
                                    }}
                                    className={`group rounded-lg transition-all duration-300 border animate-in fade-in zoom-in-95
                                        py-2 px-1 flex flex-col items-center justify-center gap-0.5
                                        xl:py-2 xl:px-3 xl:flex-row xl:justify-between xl:gap-2
                                        ${statusFilter === key ? `${activeBg} border-transparent shadow-sm scale-[0.97]` : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)]/40 hover:border-orange-500/30'}`}
                                >
                                    {/* Desktop: label left */}
                                    <p className={`hidden xl:block text-[10px] uppercase font-black tracking-tight whitespace-nowrap transition-colors ${statusFilter === key ? activeColor : 'text-[var(--theme-text-muted)]'}`}>{label}</p>
                                    {/* Desktop: chevrons */}
                                    <div className={`hidden xl:flex items-center shrink-0 ${statusFilter === key ? activeColor : dot.replace('bg-', 'text-')}`}>
                                        <ChevronRight size={10} strokeWidth={4} className="animate-chevron-r1" />
                                        <ChevronRight size={10} strokeWidth={4} className="-ml-1.5 opacity-60 animate-chevron-r2" />
                                        <ChevronRight size={10} strokeWidth={4} className="-ml-1.5 opacity-20 animate-chevron-r3" />
                                    </div>
                                    {/* Count — shown on all sizes */}
                                    <p className={`text-base xl:text-lg font-black tabular-nums leading-none transition-colors ${statusFilter === key ? activeColor : 'text-[var(--theme-text-main)]'}`}>{count}</p>
                                    {/* Tablet/mobile: label below count */}
                                    <p className={`xl:hidden text-[8px] uppercase font-black tracking-widest whitespace-nowrap leading-none transition-colors ${statusFilter === key ? activeColor : 'text-[var(--theme-text-muted)]'}`}>{label}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showTables ? 'max-h-[800px] opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
                <div className="bg-[var(--theme-bg-card)] p-4 sm:p-5 rounded-3xl border-2 border-[var(--theme-border)] shadow-xl animate-in fade-in zoom-in-98 duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                <Grid size={20} className="text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-[var(--theme-text-main)] tracking-tight">Table Map</h2>
                                <p className="text-[10px] text-[var(--theme-text-muted)] uppercase font-bold tracking-widest opacity-60">Floor Overview</p>
                            </div>
                        </div>
                        <button onClick={() => setShowTables(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <TableGrid allowedStatuses={['available']} showCleanAction={true} onReserve={handleReserveTable} onCancelReservation={handleCancelReservation} />
                </div>
            </div>

            {/* ── Flex split: cards left + drawer right ────────────────────────── */}
            <div className="flex gap-0 relative" style={{ willChange: 'contents' }}>

                {/* ── Left panel ─────────────────────────────────────── */}
                <div
                    style={{ transition: 'flex 550ms cubic-bezier(0.4,0,0.2,1), opacity 400ms cubic-bezier(0.4,0,0.2,1)' }}
                    className={`min-w-0 pb-10 overflow-hidden ${
                        selectedOrder
                            ? 'flex-1 opacity-100' // Shrink to allow space for the drawer
                            : 'flex-1 opacity-100'
                    }`}
                >
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-1">
                            {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton rounded-2xl h-48" />)}
                        </div>
                    ) : displayOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[var(--theme-text-subtle)]">
                            {activeTab === 'active' ? (
                                <>
                                    <ShoppingBag size={52} className="mb-3 opacity-20" />
                                    <h3 className="text-lg font-bold text-[var(--theme-text-muted)]">{statusFilter ? `No ${statusFilter} orders` : 'No active orders'}</h3>
                                    <p className="text-sm mt-1">{statusFilter ? `Try clearing the filter` : `Tap "New Order" to create one`}</p>
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
                        <div className={`grid p-2 w-full mx-auto ${
                            isProductionMode
                                ? 'gap-2 grid-cols-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5'
                                : selectedOrder
                                    ? 'gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
                                    : 'gap-4 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                        }`}>
                            {displayOrders.map(order => (
                                isProductionMode
                                    ? <TokenSquare key={order._id} order={order} onClick={() => setSelectedOrder(order)} isSelected={selectedOrder?._id === order._id} />
                                    : (
                                        <div
                                            key={order._id}
                                            onClick={() => setSelectedOrder(order)}
                                            className={`transition-all duration-200 rounded-xl ring-2 ${selectedOrder?._id === order._id ? 'ring-orange-500 shadow-lg shadow-orange-500/20' : 'ring-transparent'}`}
                                        >
                                            <WaiterBoxCard order={order} formatPrice={formatPrice} />
                                        </div>
                                    )
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Right panel ────────────────────────────────────── */}
                {/* Mobile (<md): full-screen fixed overlay. Tablet/Desktop: side drawer. */}
                <div
                    style={{ transition: 'flex 550ms cubic-bezier(0.4,0,0.2,1), width 550ms cubic-bezier(0.4,0,0.2,1), opacity 350ms cubic-bezier(0.4,0,0.2,1)' }}
                    className={`flex-shrink-0 border-l border-[var(--theme-border)] overflow-y-auto overflow-x-hidden ${
                        selectedOrder
                            ? [
                                'opacity-100 shadow-2xl',
                                // Mobile: fixed overlay covers the full viewport
                                'max-md:fixed max-md:inset-0 max-md:z-50 max-md:w-full max-md:h-screen max-md:border-l-0',
                                // Tablet/Desktop: side drawer
                                'md:sticky md:top-0 md:self-start md:h-[calc(100vh-110px)]',
                                isProductionMode ? 'md:w-[440px] xl:w-[500px]' : 'md:w-[400px] xl:w-[440px]',
                              ].join(' ')
                            : 'w-0 opacity-0 overflow-hidden pointer-events-none md:sticky md:top-0 md:self-start md:h-[calc(100vh-110px)]'
                    }`}
                >
                    {selectedOrder && (
                        <div
                            key={selectedOrder._id}
                            className="w-full min-h-full flex flex-col bg-[var(--theme-bg-card)] animate-in fade-in slide-in-from-right-6 duration-500"
                            style={{ animationTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' }}
                        >
                            {/* TOKEN mode: navigation bar */}
                            {isProductionMode && (
                                <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--theme-bg-hover)] border-b border-[var(--theme-border)] shrink-0">
                                    <button
                                        onClick={() => setSelectedOrder(null)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-card)] transition-all duration-200 active:scale-95 border border-transparent hover:border-[var(--theme-border)]"
                                    >
                                        <ChevronLeft size={14} strokeWidth={3} />
                                        All Tokens
                                    </button>

                                    <span className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest">
                                        {tokenIdx + 1} / {displayOrders.length}
                                    </span>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={goPrev}
                                            disabled={tokenIdx <= 0}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-card)] transition-all duration-200 active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft size={14} strokeWidth={2.5} />
                                        </button>
                                        <button
                                            onClick={goNext}
                                            disabled={tokenIdx >= displayOrders.length - 1}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-card)] transition-all duration-200 active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed"
                                        >
                                            <ChevronRight size={14} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <OrderDetailsModal
                                variant="panel"
                                isOpen={true}
                                order={selectedOrder}
                                onClose={() => setSelectedOrder(null)}
                                formatPrice={formatPrice}
                                userRole={user.role}
                                onCancelItem={(o, i) => setCancelModal({ isOpen: true, order: o, item: i })}
                                settings={settings}
                            />
                        </div>
                    )}
                </div>
            </div>

            <CancelOrderModal isOpen={cancelModal.isOpen} order={cancelModal.order} item={cancelModal.item} title={cancelModal.item ? "Cancel Item" : "Cancel Order"} onClose={() => setCancelModal({ isOpen: false, order: null, item: null })} onConfirm={handleCancelAction} />
        </div>
    );
};

export default WaiterDashboard;
