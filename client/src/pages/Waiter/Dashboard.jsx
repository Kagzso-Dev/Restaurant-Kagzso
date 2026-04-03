import { useState, useEffect, useContext, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import { Utensils, Package, Grid, List, ShoppingBag, Clock, History, WifiOff, ChevronRight, ChevronLeft, RefreshCw, X, Armchair, LogOut, Monitor } from 'lucide-react';
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
    const isAccepted = order.orderStatus?.toLowerCase() === 'accepted';
    const isPending = order.orderStatus?.toLowerCase() === 'pending';

    const bgColor =
        isPending ? 'bg-orange-50/80 border-orange-200' :
            isAccepted ? 'bg-blue-50/80 border-blue-200' :
                order.orderStatus === 'preparing' ? 'bg-indigo-50/80 border-indigo-200' :
                    isReady ? 'bg-emerald-50/80 border-emerald-200' :
                        'bg-white border-gray-200';

    const borderAccent =
        isPending ? 'border-l-orange-500' :
            isAccepted ? 'border-l-blue-500' :
                order.orderStatus === 'preparing' ? 'border-l-indigo-500' :
                    isReady ? 'border-l-emerald-500' :
                        'border-l-gray-400';

    const visibleItems = order.items?.filter(i => i.status?.toUpperCase() !== 'CANCELLED') || [];

    return (
        <div className={`
            relative flex flex-col rounded-2xl border border-l-[6px] shadow-sm transition-all duration-200
            hover:shadow-lg active:scale-[0.98] cursor-pointer overflow-hidden h-full min-h-[160px]
            ${bgColor} ${borderAccent} ${isReady ? 'animate-pulse' : ''}
        `}>
            {/* ── Top Row: Order # and Status Badge ── */}
            <div className="px-3 pt-3 flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 tracking-tighter leading-none">
                    {String(order.orderNumber).startsWith('ORD-') ? String(order.orderNumber).replace('ORD-', '#') : `#${order.orderNumber}`}
                </h3>
                <StatusBadge status={order.orderStatus} items={order.items || []} size="sm" />
            </div>

            {/* ── Middle Row: Table/Token and Clock ── */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-black/[0.04]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/80 border border-black/5 rounded-lg text-[10px] font-black text-gray-700 shadow-sm shrink-0">
                    <Utensils size={10} className="text-orange-500 shrink-0" />
                    {order.orderType === 'dine-in'
                        ? `T${order.tableId?.number || order.tableId || '?'}`
                        : `TK${order.tokenNumber || '?'}`}
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-black shrink-0 ${urgency ? 'text-red-600 bg-red-100 px-2 py-0.5 rounded-lg' : 'text-red-500/80'}`}>
                    <Clock size={10} />{elapsed.replace(' ', '')}
                </span>
            </div>

            {/* ── Items List ── */}
            <div className="flex-1 px-3 py-3 space-y-1.5 min-h-[60px] max-h-[140px] overflow-y-auto no-scrollbar">
                {visibleItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-[10px] font-black bg-black/[0.06] text-gray-800">
                            {item.quantity}
                        </div>
                        <span className="flex-1 text-[12px] font-black text-gray-800 leading-tight truncate">
                            {item.name}{item.variant ? ` (${item.variant.name})` : ''}
                        </span>
                    </div>
                ))}
            </div>

            {/* ── Footer ── */}
            <div className="px-3 py-2.5 bg-black/[0.02] flex items-center justify-between mt-auto">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">
                    {order.orderType === 'dine-in' ? 'DINE' : 'TAKE'}
                </span>
                <span className="text-[13px] font-black text-gray-900 tabular-nums">
                    {formatPrice(order.finalAmount)}
                </span>
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
                    <StatusBadge status={order.orderStatus} items={order.items || []} />
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

    // Use the DB flag as the canonical source — set by server when new items are added to a ready order,
    // cleared by server when all items are READY again.
    const isPartiallyReady = !!order.isPartiallyReady;

    return (
        <button
            onClick={onClick}
            style={{ transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease, ring 200ms ease' }}
            className={`
                w-full rounded-xl border flex flex-col overflow-hidden group
                hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:scale-[0.98]
                ${isPartiallyReady ? 'bg-amber-50 border-emerald-300 shadow-emerald-100' : `${s.card} ${s.glow}`}
                ${isReady && !isPartiallyReady ? 'shadow-md shadow-emerald-200' : 'shadow-sm'}
                ${isSelected ? 'ring-2 ring-orange-500 ring-offset-1 -translate-y-0.5 shadow-lg shadow-orange-200' : ''}
            `}
        >
            {/* Status accent bar */}
            <div className={`h-1 w-full shrink-0 ${isPartiallyReady ? 'bg-emerald-500' : s.bar} ${isReady ? 'animate-pulse' : ''}`} />

            {/* Metric Top Section (Value on Top, Label Below) */}
            <div className="flex flex-col items-center pt-2.5 pb-2">
                {/* 1. Status Row */}
                <div className="flex items-center gap-1 mb-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isPartiallyReady ? 'bg-emerald-500' : s.bar}`} />
                    <span className={`text-[7px] font-black uppercase tracking-widest ${isPartiallyReady ? 'text-emerald-700' : s.num}`}>
                        {isPartiallyReady ? 'Partial Ready' : order.orderStatus}
                    </span>
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
                        #{String(order.orderNumber).startsWith('ORD-') ? String(order.orderNumber).replace('ORD-', '') : order.orderNumber}
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
    const [isProductionMode, setIsProductionMode] = useState(false);
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
                if (selectedOrder?._id === o._id) {
                    if (o.paymentStatus === 'paid' || o.orderStatus === 'cancelled') setSelectedOrder(null);
                    else setSelectedOrder(o);
                }
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
        const isItem = arg3 !== undefined;
        const url = isItem ? `/api/orders/${orderId}/items/${arg2}/cancel` : `/api/orders/${orderId}/cancel`;
        const reason = isItem ? arg3 : arg2;
        // Errors propagate to CancelOrderModal which shows the message and keeps modal open
        await api.put(url, { reason }, { headers: { Authorization: `Bearer ${user.token}` } });
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await api.put(`/api/orders/${orderId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
        } catch (err) { alert(err.response?.data?.message || "Action failed"); }
    };
    
    const handleAddItems = async (orderId, items) => {
        try {
            await api.post(`/api/orders/${orderId}/add-items`, 
                { items }, 
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add items');
        }
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
    const displayOrders = statusFilter 
        ? (statusFilter === 'ready' ? readyOrders : processOrders)
        : filteredOrders;

    // TOKEN mode: prev / next navigation
    const tokenIdx = selectedOrder ? displayOrders.findIndex(o => o._id === selectedOrder._id) : -1;
    const goNext = useCallback(() => {
        if (tokenIdx < displayOrders.length - 1) setSelectedOrder(displayOrders[tokenIdx + 1]);
    }, [tokenIdx, displayOrders]);
    const goPrev = useCallback(() => {
        if (tokenIdx > 0) setSelectedOrder(displayOrders[tokenIdx - 1]);
    }, [tokenIdx, displayOrders]);

    return (
        <div className="flex flex-col gap-2 animate-fade-in text-left flex-1 overflow-y-auto overscroll-contain min-h-0 pb-4">
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

            {/* ── Desktop/Tablet: Action Bar ── */}
            {document.getElementById('topbar-portal') && createPortal(
                <div className="flex items-center justify-between w-full animate-fade-in px-1 gap-2">
                    {/* Left side: Filters */}
                    <div className="hidden lg:flex items-center">
                        <div className="flex items-center p-1 bg-white border border-gray-200 rounded-2xl shadow-sm h-11 w-fit">
                             {['all', 'dine-in', 'takeaway']
                                .filter(t => t !== 'takeaway' || settings?.takeawayEnabled !== false)
                                .filter(t => t !== 'dine-in' || settings?.dineInEnabled !== false)
                                .map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setFilterType(t)}
                                        className={`px-6 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap min-w-[100px] ${
                                            filterType === t 
                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 active:scale-95' 
                                                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    >
                                        {t === 'all' ? 'ALL' : t.replace('-', ' ')}
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* Right side: Actions + Utilities */}
                    <div className="flex items-center gap-3 ml-auto">
                        {/* Primary Order Actions */}
                        <div className="hidden xl:flex items-center gap-3 pr-3 border-r border-gray-200">
                            {user?.role !== 'cashier' && settings?.dineInEnabled !== false && (
                                <button onClick={() => navigate('/dine-in')} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-600/10 whitespace-nowrap min-h-[44px] active:scale-95 border-b-4 border-orange-800/40">
                                    <Utensils size={16} strokeWidth={3} /> Dine In
                                </button>
                            )}
                            {user?.role !== 'cashier' && settings?.takeawayEnabled !== false && (
                                <button onClick={() => navigate('/take-away')} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/10 whitespace-nowrap min-h-[44px] active:scale-95 border-b-4 border-blue-800/40">
                                    <Package size={16} strokeWidth={3} /> Takeaway
                                </button>
                            )}
                        </div>

                        {/* Utility controls & Refresh */}
                        <div className="flex items-center gap-2">
                             <button onClick={() => setShowCounters(prev => !prev)} title="Stats"
                                className={`w-11 h-11 flex items-center justify-center rounded-2xl border transition-all active:scale-90 ${showCounters ? 'bg-orange-500/10 border-orange-500/30 text-orange-500 shadow-inner' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-gray-50 shadow-sm'}`}>
                                <Clock size={20} strokeWidth={2.5} />
                            </button>
                            
                            <button onClick={() => setIsProductionMode(!isProductionMode)} title={isProductionMode ? 'Grid view' : 'List view'}
                                className={`w-11 h-11 flex items-center justify-center rounded-2xl border transition-all active:scale-90 ${isProductionMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-inner' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-gray-50 shadow-sm'}`}>
                                {isProductionMode ? <Grid size={20} strokeWidth={2.5} /> : <List size={20} strokeWidth={2.5} />}
                            </button>

                            <button onClick={() => { if (refreshing) return; setRefreshing(true); window.dispatchEvent(new CustomEvent('pos-refresh')); setTimeout(() => setRefreshing(false), 1000); }} title="Refresh"

                                className={`w-11 h-11 flex items-center justify-center rounded-2xl border transition-all active:scale-90 ${refreshing ? 'border-orange-500/40 bg-orange-500/10 text-orange-500 shadow-inner' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-gray-50 shadow-sm'}`}>
                                <RefreshCw size={20} strokeWidth={2.5} className={refreshing ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                </div>,
                document.getElementById('topbar-portal')
            )}

            {/* ── Row 2 (mobile only): Filters + Table action ── */}
            {document.getElementById('topbar-portal-row2') && createPortal(
                <div className="flex flex-col w-full gap-2 animate-fade-in px-1 pb-1 sm:hidden">
                    <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar pb-1">
                         {/* Filter Pill (Mobile) */}
                         <div className="flex items-center p-0.5 bg-[var(--theme-bg-dark)] rounded-xl border border-[var(--theme-border)] shadow-sm shrink-0">
                             {['all', 'dine-in', 'takeaway']
                                .filter(t => t !== 'takeaway' || settings?.takeawayEnabled !== false)
                                .filter(t => t !== 'dine-in' || settings?.dineInEnabled !== false)
                                .map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setFilterType(t)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${filterType === t ? 'bg-[var(--theme-bg-card)] text-orange-500 shadow-sm border border-[var(--theme-border)]' : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'}`}
                                    >
                                        {t === 'all' ? 'All' : t === 'dine' ? 'Dine' : t}
                                    </button>
                                ))}
                        </div>

                         <div className="flex items-center gap-1.5 ml-auto">
                            {settings?.tableMapEnabled !== false && (
                                <button onClick={() => setShowTables(t => !t)} className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${showTables ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500' : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)]'}`}>
                                    <Armchair size={16} strokeWidth={2.5} />
                                </button>
                            )}
                            <button onClick={() => navigate('/logout')} className="w-9 h-9 flex items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/5 text-rose-500 transition-all active:scale-95">
                                <LogOut size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {user?.role !== 'cashier' && settings?.dineInEnabled !== false && (
                            <button onClick={() => navigate('/dine-in')} className="flex-1 flex items-center justify-center gap-2 h-10 bg-orange-500 text-white rounded-xl font-black text-[10px] uppercase tracking-wider active:scale-95 shadow-lg shadow-orange-500/20">
                                <Utensils size={13} strokeWidth={3} /> Dine In
                            </button>
                        )}
                        {user?.role !== 'cashier' && settings?.takeawayEnabled !== false && (
                            <button onClick={() => navigate('/take-away')} className="flex-1 flex items-center justify-center gap-2 h-10 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider active:scale-95 shadow-lg shadow-blue-600/20">
                                <Package size={13} strokeWidth={3} /> Takeaway
                            </button>
                        )}
                    </div>
                </div>,
                document.getElementById('topbar-portal-row2')
            )}

            {activeTab === 'active' && showCounters && createPortal(
                <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowCounters(false); }}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCounters(false)} />
                    <div className="relative bg-[var(--theme-bg-card)] rounded-3xl border-2 border-[var(--theme-border)] shadow-2xl w-full max-w-3xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--theme-border)]">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20">
                                    <Clock size={16} className="text-orange-500" />
                                </div>
                                <span className="text-sm font-black text-[var(--theme-text-main)] tracking-tight">Order Stats</span>
                            </div>
                            <button onClick={() => setShowCounters(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--theme-text-muted)]">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4">
                    {/* ── Mobile / Tablet: compact 2×2 grid (unchanged) ── */}
                    <div className="xl:hidden flex items-stretch gap-1.5 w-full">
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[var(--theme-bg-dark)]/40 p-1.5 rounded-xl border border-[var(--theme-border)] shadow-sm min-w-0">
                            {[
                                { key: 'pending',   count: counts.pending,   dot: 'bg-[var(--status-pending)]',   label: 'Pending',  activeColor: 'text-[var(--status-pending)]',   activeBg: 'bg-[var(--status-pending-bg)]'   },
                                { key: 'accepted',  count: counts.accepted,  dot: 'bg-[var(--status-accepted)]',  label: 'Accepted', activeColor: 'text-[var(--status-accepted)]',  activeBg: 'bg-[var(--status-accepted-bg)]'  },
                                { key: 'preparing', count: counts.preparing, dot: 'bg-[var(--status-preparing)]', label: 'Cooking',  activeColor: 'text-[var(--status-preparing)]', activeBg: 'bg-[var(--status-preparing-bg)]' },
                                { key: 'ready',     count: counts.ready,     dot: 'bg-[var(--status-ready)]',     label: 'Ready',    activeColor: 'text-[var(--status-ready)]',     activeBg: 'bg-[var(--status-ready-bg)]'     },
                            ].map(({ key, count, dot, label, activeColor, activeBg }, idx) => (
                                <button
                                    key={key}
                                    onClick={() => setStatusFilter(f => f === key ? null : key)}
                                    style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: 'backwards' }}
                                    className={`group rounded-lg transition-all duration-300 border animate-in fade-in zoom-in-95
                                        py-2 px-1 flex flex-col items-center justify-center gap-0.5
                                        ${statusFilter === key ? `${activeBg} border-transparent shadow-sm scale-[0.97]` : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)]/40 hover:border-orange-500/30'}`}
                                >
                                    <p className={`text-base font-black tabular-nums leading-none transition-colors ${statusFilter === key ? activeColor : 'text-[var(--theme-text-main)]'}`}>{count}</p>
                                    <p className={`text-[8px] uppercase font-black tracking-widest whitespace-nowrap leading-none transition-colors ${statusFilter === key ? activeColor : 'text-[var(--theme-text-muted)]'}`}>{label}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Desktop: premium stat bar ── */}
                    <div className="hidden xl:grid grid-cols-4 gap-3 w-full">
                        {[
                            {
                                key: 'pending',
                                count: counts.pending,
                                label: 'Pending',
                                accent: 'border-l-orange-500',
                                countColor: 'text-orange-500',
                                iconBg: 'bg-orange-500/10',
                                iconColor: 'text-orange-500',
                                activeBg: 'bg-[var(--status-pending-bg)]',
                                activeRing: 'ring-orange-400/40',
                                icon: (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                ),
                            },
                            {
                                key: 'accepted',
                                count: counts.accepted,
                                label: 'Accepted',
                                accent: 'border-l-violet-500',
                                countColor: 'text-violet-500',
                                iconBg: 'bg-violet-500/10',
                                iconColor: 'text-violet-500',
                                activeBg: 'bg-[var(--status-accepted-bg)]',
                                activeRing: 'ring-violet-400/40',
                                icon: (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                ),
                            },
                            {
                                key: 'preparing',
                                count: counts.preparing,
                                label: 'Cooking',
                                accent: 'border-l-blue-500',
                                countColor: 'text-blue-500',
                                iconBg: 'bg-blue-500/10',
                                iconColor: 'text-blue-500',
                                activeBg: 'bg-[var(--status-preparing-bg)]',
                                activeRing: 'ring-blue-400/40',
                                icon: (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                        <path d="M12 2a5 5 0 0 1 5 5c0 5-5 11-5 11S7 12 7 7a5 5 0 0 1 5-5z"/><circle cx="12" cy="7" r="2"/>
                                    </svg>
                                ),
                            },
                            {
                                key: 'ready',
                                count: counts.ready,
                                label: 'Ready',
                                accent: 'border-l-emerald-500',
                                countColor: 'text-emerald-500',
                                iconBg: 'bg-emerald-500/10',
                                iconColor: 'text-emerald-500',
                                activeBg: 'bg-[var(--status-ready-bg)]',
                                activeRing: 'ring-emerald-400/40',
                                icon: (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                                    </svg>
                                ),
                            },
                        ].map(({ key, count, label, accent, countColor, iconBg, iconColor, activeBg, activeRing, icon }, idx) => (
                            <button
                                key={key}
                                onClick={() => setStatusFilter(f => f === key ? null : key)}
                                style={{ animationDelay: `${idx * 0.06}s`, animationFillMode: 'backwards' }}
                                className={`
                                    group relative flex items-center gap-4 px-5 py-3.5 rounded-2xl border-l-4
                                    border border-[var(--theme-border)] ${accent}
                                    transition-all duration-300 animate-in fade-in slide-in-from-bottom-2
                                    ${statusFilter === key
                                        ? `${activeBg} ring-2 ${activeRing} shadow-lg scale-[0.98]`
                                        : 'bg-[var(--theme-bg-card)] hover:shadow-md hover:scale-[1.01] hover:border-[var(--theme-border)]'
                                    }
                                `}
                            >
                                {/* Icon badge */}
                                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor} transition-transform duration-200 group-hover:scale-110`}>
                                    {icon}
                                </div>

                                {/* Text block */}
                                <div className="flex flex-col items-start min-w-0">
                                    <span className={`text-3xl font-black tabular-nums leading-none tracking-tight ${countColor}`}>
                                        {count}
                                    </span>
                                    <span className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)] whitespace-nowrap">
                                        {label}
                                    </span>
                                </div>

                                {/* Active filter indicator */}
                                {statusFilter === key && (
                                    <div className={`absolute top-2.5 right-3 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${iconBg} ${iconColor}`}>
                                        Filtered
                                    </div>
                                )}

                                {/* Animated chevrons (subtle, right edge) */}
                                <div className={`absolute right-3 bottom-3 flex items-center opacity-20 group-hover:opacity-50 transition-opacity ${iconColor}`}>
                                    <ChevronRight size={9} strokeWidth={4} />
                                    <ChevronRight size={9} strokeWidth={4} className="-ml-1.5" />
                                </div>
                            </button>
                        ))}
                        </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showTables && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowTables(false); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-[var(--theme-bg-card)] rounded-3xl border-2 border-[var(--theme-border)] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--theme-border)] shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                    <Grid size={20} className="text-emerald-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-[var(--theme-text-main)] tracking-tight">Table Map</h2>
                                    <p className="text-[10px] text-[var(--theme-text-muted)] uppercase font-bold tracking-widest opacity-60">Floor Overview</p>
                                </div>
                            </div>
                            <button onClick={() => setShowTables(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--theme-text-muted)]">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 sm:p-5 flex-1">
                            <TableGrid allowedStatuses={['available']} showCleanAction={true} onReserve={handleReserveTable} onCancelReservation={handleCancelReservation} />
                        </div>
                    </div>
                </div>,
                document.body
            )}

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
                        <div className={`grid p-3 w-full mx-auto ${
                            isProductionMode
                                ? 'gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8'
                                : selectedOrder
                                    ? 'gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
                                    : 'gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
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

                {/* ── Desktop Side Panel / Mobile Portal ── */}
                {selectedOrder && (
                    <>
                        <div
                            style={{ transition: 'width 550ms cubic-bezier(0.4,0,0.2,1), opacity 350ms cubic-bezier(0.4,0,0.2,1)' }}
                            className={`hidden md:flex flex-col flex-shrink-0 border-l border-[var(--theme-border)] bg-[var(--theme-bg-card)] sticky top-0 self-start h-[calc(100vh-110px)] overflow-hidden
                                ${isProductionMode ? 'md:w-[440px] xl:w-[500px]' : 'md:w-[400px] xl:w-[440px]'}`}
                        >
                            <div className="flex-1 flex flex-col min-h-0">
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
                                onCancelOrder={(o) => setCancelModal({ isOpen: true, order: o, item: null })}
                                onUpdateStatus={handleUpdateStatus}
                                onAddItem={handleAddItems}
                                settings={settings}
                            />



                            </div>
                        </div>

                        {createPortal(
                            <div className="md:hidden fixed inset-0 z-[2000] bg-[var(--theme-bg-card)] flex flex-col animate-in slide-in-from-right duration-500">
                                <div className="flex items-center justify-between px-3 h-16 border-b border-[var(--theme-border)] bg-[var(--theme-bg-card)] flex-shrink-0">
                                    <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-black text-[var(--theme-text-muted)] active:scale-90 bg-[var(--theme-bg-dark)]/40">
                                        <ChevronLeft size={18} strokeWidth={3} /> BACK
                                    </button>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[14px] font-black tracking-tight leading-none uppercase">Order Details</span>
                                        <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest mt-0.5">{tokenIdx + 1} of {displayOrders.length}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={goPrev} disabled={tokenIdx <= 0} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--theme-bg-dark)]/40 text-[var(--theme-text-muted)] active:scale-90 disabled:opacity-20"><ChevronLeft size={20} strokeWidth={2.5} /></button>
                                        <button onClick={goNext} disabled={tokenIdx >= displayOrders.length - 1} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--theme-bg-dark)]/40 text-[var(--theme-text-muted)] active:scale-90 disabled:opacity-20"><ChevronRight size={20} strokeWidth={2.5} /></button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <OrderDetailsModal
                                        variant="panel" isOpen={true} order={selectedOrder} onClose={() => setSelectedOrder(null)}
                                        formatPrice={formatPrice} userRole={user.role} onCancelItem={(o, i) => setCancelModal({ isOpen: true, order: o, item: i })}
                                        onCancelOrder={(o) => setCancelModal({ isOpen: true, order: o, item: null })}
                                        onUpdateStatus={handleUpdateStatus} onAddItem={handleAddItems} settings={settings}
                                    />
                                </div>
                                <div className="h-safe-bottom" />
                            </div>,
                            document.body
                        )}
                    </>
                )}
            </div>

            <CancelOrderModal isOpen={cancelModal.isOpen} order={cancelModal.order} item={cancelModal.item} title={cancelModal.item ? "Cancel Item" : "Cancel Order"} onClose={() => setCancelModal({ isOpen: false, order: null, item: null })} onConfirm={handleCancelAction} />
        </div>
    );
};

export default WaiterDashboard;
