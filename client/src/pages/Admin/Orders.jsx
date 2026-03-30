import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import { Search, Eye, ShoppingBag, Calendar, X, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import CancelOrderModal from '../../components/CancelOrderModal';
import StatusBadge from '../../components/StatusBadge';
import { tokenColors } from '../../utils/tokenColors';

/* ── Inline Calendar Range Picker ──────────────────────────────────────────── */
const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const toYMD = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const CalendarRangePicker = ({ fromDate, toDate, onApply, onClear }) => {
    const today = toYMD(new Date());
    const [vy, setVy] = useState(() => new Date().getFullYear());
    const [vm, setVm] = useState(() => new Date().getMonth());
    const [hoverDate, setHoverDate] = useState('');

    const prevMonth = () => { if (vm === 0) { setVm(11); setVy(y => y - 1); } else setVm(m => m - 1); };
    const nextMonth = () => { if (vm === 11) { setVm(0); setVy(y => y + 1); } else setVm(m => m + 1); };

    const firstDay = new Date(vy, vm, 1).getDay();
    const daysInMonth = new Date(vy, vm + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const dayStr = (d) => `${vy}-${String(vm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const handleDayClick = (d) => {
        const ds = dayStr(d);
        if (ds > today) return;
        if (!fromDate || (fromDate && toDate)) {
            onApply(ds, '');
        } else {
            if (ds >= fromDate) onApply(fromDate, ds);
            else onApply(ds, fromDate);
        }
    };

    const effectiveTo = hoverDate && fromDate && !toDate
        ? (hoverDate >= fromDate ? hoverDate : fromDate)
        : toDate;
    const effectiveFrom = hoverDate && fromDate && !toDate && hoverDate < fromDate
        ? hoverDate : fromDate;

    const isFrom = (ds) => ds === fromDate;
    const isTo = (ds) => ds === toDate;
    const isInRange = (ds) => effectiveFrom && effectiveTo && ds > effectiveFrom && ds < effectiveTo;
    const isRangeStart = (ds) => ds === effectiveFrom && effectiveTo && ds !== effectiveTo;
    const isRangeEnd = (ds) => ds === effectiveTo && effectiveFrom && ds !== effectiveFrom;
    const isSingle = (ds) => ds === fromDate && (!toDate || toDate === fromDate);

    const fmtLabel = (ymd) => {
        if (!ymd) return 'Select Date';
        const [y, m, d] = ymd.split('-');
        return `${d} ${MONTHS[parseInt(m) - 1].slice(0, 3)} ${y}`;
    };

    return (
        <div className="w-full max-w-[280px] mx-auto select-none space-y-4">
            {/* Month header */}
            <div className="flex items-center justify-between px-1">
                <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--theme-bg-deep)] hover:bg-orange-500/10 text-[var(--theme-text-muted)] hover:text-orange-500 transition-all border border-[var(--theme-border)] active:scale-95 shadow-sm">
                    <ChevronLeft size={14} strokeWidth={2.5} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[11px] font-black text-[var(--theme-text-main)] uppercase tracking-[0.1em]">{MONTHS[vm]}</span>
                    <span className="text-[9px] font-bold text-orange-500 opacity-80">{vy}</span>
                </div>
                <button
                    onClick={nextMonth}
                    disabled={vy === new Date().getFullYear() && vm === new Date().getMonth()}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--theme-bg-deep)] hover:bg-orange-500/10 text-[var(--theme-text-muted)] hover:text-orange-500 transition-all border border-[var(--theme-border)] active:scale-95 disabled:opacity-20 shadow-sm"
                >
                    <ChevronRight size={14} strokeWidth={2.5} />
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-0.5 rounded-xl bg-[var(--theme-bg-deep)]/50 border border-[var(--theme-border)] shadow-inner">
                <div className="grid grid-cols-7 gap-px mb-1">
                    {DAYS_SHORT.map(d => (
                        <div key={d} className="text-center text-[8px] font-black uppercase tracking-widest text-orange-500/60 py-1.5">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-y-0.5 relative">
                    {cells.map((d, i) => {
                        if (!d) return <div key={`e-${i}`} />;
                        const ds = dayStr(d);
                        const future = ds > today;
                        const from = isFrom(ds);
                        const to = isTo(ds);
                        const single = isSingle(ds);
                        const rangeStart = isRangeStart(ds);
                        const rangeEnd = isRangeEnd(ds);
                        const inRange = isInRange(ds);
                        const isToday = ds === today;

                        return (
                            <div
                                key={ds}
                                className={`relative flex items-center justify-center h-8 transition-colors
                                    ${inRange ? 'bg-orange-500/10' : ''}
                                    ${rangeStart ? 'bg-orange-500/15 rounded-l-full' : ''}
                                    ${rangeEnd ? 'bg-orange-500/15 rounded-r-full' : ''}
                                `}
                            >
                                <button
                                    onClick={() => !future && handleDayClick(d)}
                                    onMouseEnter={() => setHoverDate(ds)}
                                    onMouseLeave={() => setHoverDate('')}
                                    className={`
                                        w-7 h-7 rounded-lg text-[10px] font-bold transition-all duration-150 flex items-center justify-center relative
                                        ${future ? 'opacity-20 cursor-not-allowed text-[var(--theme-text-muted)]' : 'cursor-pointer'}
                                        ${(from || to || single) && !future
                                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-black'
                                            : !future ? 'hover:bg-orange-500/10 text-[var(--theme-text-main)]' : ''}
                                        ${isToday && !(from || to || single) ? 'text-orange-500' : ''}
                                    `}
                                >
                                    {isToday && !(from || to || single) && (
                                        <span className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-orange-500 rounded-full animate-pulse" />
                                    )}
                                    {d}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Info display and Actions */}
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[var(--theme-bg-deep)] rounded-xl p-2 border border-[var(--theme-border)] shadow-sm">
                        <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[var(--theme-text-muted)] mb-0.5">Start</p>
                        <p className={`text-[9.5px] font-black ${fromDate ? 'text-orange-500' : 'text-[var(--theme-text-muted)]'}`}>{fmtLabel(fromDate)}</p>
                    </div>
                    <div className="bg-[var(--theme-bg-deep)] rounded-xl p-2 border border-[var(--theme-border)] shadow-sm">
                        <p className="text-[8px] font-black uppercase tracking-[0.1em] text-[var(--theme-text-muted)] mb-0.5">End</p>
                        <p className={`text-[9.5px] font-black ${toDate ? 'text-orange-500' : 'text-[var(--theme-text-muted)]'}`}>{fmtLabel(toDate)}</p>
                    </div>
                </div>

                <div className="flex gap-2 pt-1">
                    <button
                        onClick={onClear}
                        className="flex-1 h-9 rounded-xl border border-[var(--theme-border)] text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all active:scale-95"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => fromDate && onApply(fromDate, toDate, true)}
                        disabled={!fromDate}
                        className="flex-1 h-9 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-orange-500/10 hover:bg-orange-400 disabled:opacity-30 disabled:shadow-none transition-all active:scale-95"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};

const DATE_RANGES = [
    { label: 'Today', value: 'today' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year' },
];

function getDateRange(rangeValue, customFrom, customTo) {
    const now = new Date();
    if (rangeValue === 'custom' && customFrom) {
        const from = new Date(customFrom);
        const to = customTo ? new Date(customTo) : from;
        return {
            start: new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0),
            end: new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999),
        };
    }
    if (rangeValue === 'today') {
        return {
            start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
            end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
        };
    }
    if (rangeValue === 'week') {
        const day = now.getDay();
        const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0);
        const end = new Date(now); end.setDate(now.getDate() + (6 - day)); end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    if (rangeValue === 'month') {
        return {
            start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
            end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
        };
    }
    if (rangeValue === 'year') {
        return {
            start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
            end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
        };
    }
    return null;
}

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [dateRange, setDateRange] = useState('today');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null });
    const datePickerRef = useRef(null);
    const { user, formatPrice, socket } = useContext(AuthContext);
    const location = useLocation();

    // ── External URL auto-sync (Open order from Search) ──────────────────────
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const orderId = params.get('id');
        if (orderId && orders.length > 0) {
            const found = orders.find(o => o._id === orderId);
            if (found) {
                // To be safe, if we arrive with an ID, we switch to a broader list or just show the order
                setDateRange('year'); 
                setSelectedOrder(found);
            }
        }
    }, [location.search, orders]);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await api.get('/api/orders', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setOrders(res.data.orders || []);
        } catch (error) {
            console.error("Error fetching orders", error);
        }
    }, [user]);

    useEffect(() => {
        fetchOrders();

        if (socket) {
            const handleUpdate = (o) => setOrders(prev => {
                const exists = prev.find(x => x._id === o._id);
                return exists ? prev.map(x => x._id === o._id ? o : x) : [o, ...prev];
            });
            const handleNew = (o) => setOrders(prev =>
                prev.find(x => x._id === o._id) ? prev : [o, ...prev]
            );

            socket.on('new-order', handleNew);
            socket.on('order-updated', handleUpdate);
            socket.on('order-completed', handleUpdate);
            socket.on('orderCancelled', handleUpdate);
            socket.on('itemUpdated', handleUpdate);

            return () => {
                socket.off('new-order', handleNew);
                socket.off('order-updated', handleUpdate);
                socket.off('order-completed', handleUpdate);
                socket.off('orderCancelled', handleUpdate);
                socket.off('itemUpdated', handleUpdate);
            };
        }
    }, [user, socket, fetchOrders]);

    useEffect(() => {
        let temp = [...orders];

        const range = getDateRange(dateRange, fromDate, toDate);
        if (range) {
            temp = temp.filter(o => {
                const d = new Date(o.createdAt);
                return d >= range.start && d <= range.end;
            });
        }

        if (searchQuery) {
            temp = temp.filter(o =>
                o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.customerInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredOrders(temp);
    }, [orders, dateRange, fromDate, toDate, searchQuery]);

    const applyDateRange = (from, to, shouldClose = false) => {
        setFromDate(from);
        setToDate(to || '');
        setDateRange('custom');
        if (shouldClose) setShowDatePicker(false);
    };

    const clearCustomDate = () => {
        setFromDate('');
        setToDate('');
        setDateRange('today');
        setShowDatePicker(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
                setShowDatePicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleProcessPayment = async (order) => {
        if (!window.confirm(`Process payment of ${formatPrice(order.finalAmount)} for ${order.orderNumber}?`)) return;

        try {
            const res = await api.put(`/api/orders/${order._id}/payment`, {
                paymentMethod: 'cash',
                amountPaid: order.finalAmount
            });

            if (res.data.success) {
                const updatedOrder = res.data.order;
                setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
                setSelectedOrder(updatedOrder);
            }
        } catch (error) {
            console.error("Payment error:", error);
            alert("Failed to process payment");
        }
    };

    const handleCancelOrder = async (orderId, reason) => {
        await api.put(`/api/orders/${orderId}/cancel`, { reason }, { headers: { Authorization: `Bearer ${user.token}` } });
    };

    const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const activeLabel = dateRange === 'custom' && fromDate
        ? toDate && toDate !== fromDate ? `${fmt(fromDate)} – ${fmt(toDate)}` : fmt(fromDate)
        : DATE_RANGES.find(r => r.value === dateRange)?.label || 'Today';

    return (
        <div className="flex h-screen w-full overflow-hidden animate-fade-in text-[var(--theme-text-main)]">

        {/* ── Left: Orders list (independent scroll) ──────────────────── */}
        <div className="flex-1 w-full min-w-0 overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[var(--theme-bg-card)] p-5 sm:p-6 rounded-3xl shadow-xl border border-[var(--theme-border)] w-full">
                <div className="shrink-0 text-center sm:text-left">
                    <h2 className="text-xl sm:text-2xl font-black text-[var(--theme-text-main)] whitespace-nowrap">Order History</h2>
                    <p className="text-[10px] sm:text-xs text-[var(--theme-text-muted)] mt-1 whitespace-nowrap opacity-70">
                        {activeLabel}
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 flex-1">
                    {/* Search bar */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" size={16} />
                        <input
                            type="text"
                            placeholder="Search Order ID..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--theme-bg-deep)] text-[var(--theme-text-main)] rounded-2xl pl-10 pr-4 py-2.5 border border-[var(--theme-border)] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none text-sm font-medium"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                <X size={14} />
                            </button>
                        )}
                    </div>


                    {/* Quick date range buttons */}
                    <div className="flex items-center gap-1 bg-[var(--theme-bg-deep)] p-1 rounded-2xl border border-[var(--theme-border)] overflow-x-auto no-scrollbar">
                        {DATE_RANGES.map(r => (
                            <button
                                key={r.value}
                                onClick={() => { setDateRange(r.value); setFromDate(''); setToDate(''); setShowDatePicker(false); }}
                                className={`px-2.5 xs:px-3 py-1.5 rounded-xl text-[10px] xs:text-xs font-bold transition-all duration-200 whitespace-nowrap ${dateRange === r.value
                                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                                        : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-card)]'
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    {/* Date range picker */}
                    <div className="relative flex items-center" ref={datePickerRef}>
                        <button
                            onClick={() => setShowDatePicker(v => !v)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-200 ${dateRange === 'custom'
                                    ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/30'
                                    : 'bg-[var(--theme-bg-deep)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                                }`}
                        >
                            <Calendar size={16} />
                            <span className="text-xs font-bold whitespace-nowrap">
                                {dateRange === 'custom' && fromDate
                                    ? toDate && toDate !== fromDate
                                        ? `${new Date(fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(toDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                                        : new Date(fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                    : 'Pick Date'}
                            </span>
                        </button>

                        {dateRange === 'custom' && fromDate && (
                            <button
                                onClick={clearCustomDate}
                                className="ml-1 p-1.5 rounded-xl bg-[var(--theme-bg-deep)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-red-500 transition-colors"
                            >
                                <X size={13} />
                            </button>
                        )}

                        {/* Centered Modal-style Date Picker Overlay */}
                        {showDatePicker && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                <div 
                                    className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
                                    onClick={() => setShowDatePicker(false)} 
                                />
                                <div className="relative z-10 bg-[var(--theme-bg-card)] border border-[var(--theme-border)] rounded-2xl shadow-2xl p-4 animate-fade-in max-w-[280px] w-full mx-auto">
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--theme-border)]">
                                        <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Select Date Range</h3>
                                        <button onClick={() => setShowDatePicker(false)} className="p-1 rounded-lg hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)]">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="scale-90 origin-top -mt-2">
                                        <CalendarRangePicker
                                            fromDate={fromDate}
                                            toDate={toDate}
                                            onApply={applyDateRange}
                                            onClear={clearCustomDate}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-[var(--theme-bg-card)] rounded-3xl shadow-xl border border-[var(--theme-border)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[var(--theme-bg-deep)] text-[var(--theme-text-muted)] uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                <th className="px-3 sm:px-6 py-3 sm:py-5">ID</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-5 hidden sm:table-cell">Type</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-5 text-center hidden md:table-cell">Items</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-5">Amount</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-5">Status</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-5 text-right sm:pr-10 hidden xs:table-cell">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--theme-border)]">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map(order => (
                                    <tr
                                        key={order._id}
                                        className={`group transition-all duration-300 border-b border-[var(--theme-border)] ${tokenColors[order.orderStatus] || 'hover:bg-[var(--theme-bg-hover)]'}`}
                                    >
                                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-inherit mb-0.5 text-xs sm:text-sm">{order.orderNumber}</span>
                                                <span className="text-[10px] text-inherit opacity-60 font-mono italic whitespace-nowrap">
                                                    {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 hidden xs:table-cell">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center justify-center min-w-[32px] h-7 font-black text-inherit px-2.5 bg-black/5 rounded-lg border border-current/10 shadow-sm text-[10px]">
                                                    {order.orderType === 'dine-in' ? `T${order.tableId?.number || order.tableId || '?'}` : `TK${order.tokenNumber || '?'}`}
                                                </span>
                                                <span className="text-[10px] font-black uppercase opacity-60 tracking-wider whitespace-nowrap">
                                                    {order.orderType}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-center hidden sm:table-cell">
                                            <span className="px-2 py-0.5 bg-black/5 rounded-lg text-xs font-bold text-inherit border border-black/5">
                                                {order.items.length}
                                            </span>
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                                            <span className="font-black text-inherit text-xs sm:text-sm">{formatPrice(order.finalAmount)}</span>
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                                            <StatusBadge status={order.orderStatus} />
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right sm:pr-10">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="p-2 sm:p-2.5 bg-[var(--theme-bg-deep)] hover:bg-orange-500 text-[var(--theme-text-muted)] hover:text-white rounded-xl transition-all duration-200 border border-[var(--theme-border)] group-hover:border-orange-500/50 active:scale-95"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500 opacity-50">
                                            <ShoppingBag size={48} className="mb-4" />
                                            <p className="text-lg font-bold">No orders found</p>
                                            <p className="text-sm">Try a different date range or search term</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>

        {/* ── Right: inline detail panel — desktop only ───────────────── */}
        <div className={`hidden lg:flex flex-col shrink-0 border-l border-[var(--theme-border)] overflow-hidden transition-all duration-300 ease-in-out ${selectedOrder ? 'w-[600px]' : 'w-0'}`}>
            {selectedOrder && (
                <OrderDetailsModal
                    variant="panel"
                    isOpen={true}
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    formatPrice={formatPrice}
                    onProcessPayment={handleProcessPayment}
                    onCancelOrder={(o) => setCancelModal({ isOpen: true, order: o })}
                    userRole={user?.role}
                />
            )}
        </div>

        {/* ── Mobile: overlay modal ────────────────────────────────────── */}
        <div className="lg:hidden">
            <OrderDetailsModal
                isOpen={!!selectedOrder}
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                formatPrice={formatPrice}
                onProcessPayment={handleProcessPayment}
                onCancelOrder={(o) => setCancelModal({ isOpen: true, order: o })}
                userRole={user?.role}
            />
        </div>

        <CancelOrderModal
            isOpen={cancelModal.isOpen}
            order={cancelModal.order}
            item={null}
            title="Cancel Order"
            onClose={() => setCancelModal({ isOpen: false, order: null })}
            onConfirm={handleCancelOrder}
        />
        </div>
    );
};

export default AdminOrders;
