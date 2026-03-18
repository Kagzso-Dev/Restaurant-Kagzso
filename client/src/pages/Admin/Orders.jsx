import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import { Search, Eye, ShoppingBag, Calendar, X } from 'lucide-react';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import StatusBadge from '../../components/StatusBadge';
import { tokenColors } from '../../utils/tokenColors';

const DATE_RANGES = [
    { label: 'Today', value: 'today' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year' },
];

function getDateRange(rangeValue, customDate) {
    const now = new Date();
    if (rangeValue === 'custom' && customDate) {
        const d = new Date(customDate);
        return {
            start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
            end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
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
    const [customDate, setCustomDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const dateInputRef = useRef(null);
    const { user, formatPrice, socket } = useContext(AuthContext);

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

        const range = getDateRange(dateRange, customDate);
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
    }, [orders, dateRange, customDate, searchQuery]);

    const handleCalendarChange = (e) => {
        setCustomDate(e.target.value);
        setDateRange('custom');
    };

    const clearCustomDate = () => {
        setCustomDate('');
        setDateRange('today');
    };

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

    const activeLabel = dateRange === 'custom' && customDate
        ? new Date(customDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : DATE_RANGES.find(r => r.value === dateRange)?.label || 'Today';

    return (
        <div className="space-y-6 animate-fade-in text-[var(--theme-text-main)]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[var(--theme-bg-card)] p-6 rounded-3xl shadow-xl border border-[var(--theme-border)]">
                <div>
                    <h2 className="text-2xl font-black text-[var(--theme-text-main)]">Order History</h2>
                    <p className="text-sm text-[var(--theme-text-muted)] mt-1">
                        Showing orders for: <span className="font-bold text-orange-500">{activeLabel}</span>
                        {' '}— <span className="font-semibold">{filteredOrders.length}</span> order{filteredOrders.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--theme-text-muted)] group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search Order #..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-4 py-3 bg-[var(--theme-bg-deep)] border border-[var(--theme-border)] rounded-2xl text-[var(--theme-text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500/50 w-full md:w-52 transition-all"
                        />
                    </div>

                    {/* Quick date range buttons */}
                    <div className="flex items-center gap-1 bg-[var(--theme-bg-deep)] p-1.5 rounded-2xl border border-[var(--theme-border)]">
                        {DATE_RANGES.map(r => (
                            <button
                                key={r.value}
                                onClick={() => { setDateRange(r.value); setCustomDate(''); }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${dateRange === r.value
                                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                                        : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-card)]'
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    {/* Calendar picker */}
                    <div className="relative flex items-center">
                        <button
                            onClick={() => dateInputRef.current?.showPicker()}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-200 ${dateRange === 'custom'
                                    ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/30'
                                    : 'bg-[var(--theme-bg-deep)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                                }`}
                        >
                            <Calendar size={16} />
                            <span className="text-xs font-bold whitespace-nowrap">
                                {dateRange === 'custom' && customDate
                                    ? new Date(customDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                    : 'Pick Date'}
                            </span>
                        </button>
                        <input
                            ref={dateInputRef}
                            type="date"
                            value={customDate}
                            onChange={handleCalendarChange}
                            max={new Date().toISOString().split('T')[0]}
                            className="absolute left-0 opacity-0 pointer-events-none w-0 h-0"
                        />
                        {dateRange === 'custom' && customDate && (
                            <button
                                onClick={clearCustomDate}
                                className="ml-1 p-1.5 rounded-xl bg-[var(--theme-bg-deep)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-red-500 transition-colors"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-[var(--theme-bg-card)] rounded-3xl shadow-xl border border-[var(--theme-border)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[var(--theme-bg-deep)] text-[var(--theme-text-muted)] uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                <th className="px-3 sm:px-6 py-3 sm:py-5">Order ID</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-5 hidden xs:table-cell">Service</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-5 text-center hidden sm:table-cell">Items</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-5">Amount</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-5">Status</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-5 text-right sm:pr-10">Details</th>
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
                                                <span className="text-[10px] text-inherit opacity-60 font-mono italic">
                                                    {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 hidden xs:table-cell">
                                            <div className="flex flex-col">
                                                <span className="text-xs sm:text-sm font-semibold text-inherit opacity-80 capitalize">
                                                    {order.orderType}
                                                </span>
                                                <span className="text-[10px] text-inherit opacity-60 font-bold uppercase tracking-wider">
                                                    {order.orderType === 'dine-in' ? `Table ${order.tableId?.number || order.tableId}` : 'Takeaway'}
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

            <OrderDetailsModal
                isOpen={!!selectedOrder}
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                formatPrice={formatPrice}
                onProcessPayment={handleProcessPayment}
                userRole={user?.role}
            />
        </div>
    );
};

export default AdminOrders;
