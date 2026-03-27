import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import logoImg from '../../assets/logo.png';
import { Printer, ChefHat, List, Grid } from 'lucide-react';

const WorkingProcess = () => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const { user, socket, formatPrice, settings } = useContext(AuthContext);

    const [filterType, setFilterType] = useState('all');
    const [statusFilter, setStatusFilter] = useState(null);
    const [isGridView, setIsGridView] = useState(false);

    useEffect(() => {
        const fetchOrders = async () => {
            const res = await api.get('/api/orders', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            // Filter active working process orders
            const ordersArray = res.data.orders || [];
            setOrders(ordersArray.filter(o => ['pending', 'preparing', 'accepted', 'ready'].includes(o.orderStatus)));
        };

        if (user) {
            fetchOrders();
        }

        if (socket) {
            socket.on('new-order', (newOrder) => {
                setOrders(prev => [newOrder, ...prev]);
            });
            socket.on('order-updated', (updatedOrder) => {
                setOrders(prev => {
                    const existing = prev.find(o => o._id === updatedOrder._id);
                    if (['completed', 'cancelled'].includes(updatedOrder.orderStatus)) {
                        if (selectedOrder?._id === updatedOrder._id) setSelectedOrder(null);
                        return prev.filter(o => o._id !== updatedOrder._id);
                    }
                    if (existing) {
                        const updated = prev.map(o => o._id === updatedOrder._id ? updatedOrder : o);
                        if (selectedOrder?._id === updatedOrder._id) setSelectedOrder(updatedOrder);
                        return updated;
                    }
                    return [updatedOrder, ...prev];
                });
            });
        }

        return () => {
            if (socket) {
                socket.off('new-order');
                socket.off('order-updated');
            }
        };
    }, [user, socket, selectedOrder]);

    const enabledOrders = orders
        .filter(o => settings?.takeawayEnabled !== false || o.orderType !== 'takeaway')
        .filter(o => settings?.dineInEnabled   !== false || o.orderType !== 'dine-in');

    const currentTypeOrders = enabledOrders.filter(o => filterType === 'all' || o.orderType === filterType);

    const counts = {
        pending:  currentTypeOrders.filter(o => o.orderStatus === 'pending').length,
        accepted: currentTypeOrders.filter(o => o.orderStatus === 'accepted').length,
        preparing:currentTypeOrders.filter(o => o.orderStatus === 'preparing').length,
        ready:    currentTypeOrders.filter(o => o.orderStatus === 'ready').length,
    };

    const displayOrders = enabledOrders.filter(o => {
        const matchesType = filterType === 'all' || o.orderType === filterType;
        const matchesStatus = !statusFilter || o.orderStatus === statusFilter;
        return matchesType && matchesStatus;
    });

    // Clear selected order if it's no longer in the filtered list
    useEffect(() => {
        if (selectedOrder && !displayOrders.find(o => o._id === selectedOrder._id)) {
            setSelectedOrder(null);
        }
    }, [filterType, statusFilter, displayOrders, selectedOrder]);

    const printKOT = () => {
        if (!selectedOrder) return;
        const statusColors = {
            pending:   '#f59e0b',
            accepted:  '#3b82f6',
            preparing: '#8b5cf6',
            ready:     '#10b981',
            cancelled: '#ef4444',
        };

        const getItemStatusStyle = (status) => {
            const color = statusColors[status?.toLowerCase()] || '#6b7280';
            return `border:1px solid ${color};color:${color};font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;text-transform:uppercase;`;
        };

        const orderStatusColor = statusColors[selectedOrder.orderStatus?.toLowerCase()] || '#6b7280';

        const itemsHTML = selectedOrder.items.map((item, idx) => `
            <tr style="border-bottom:1px dashed #e5e7eb;">
                <td style="padding:8px 4px;">
                    <span style="font-weight:700;">${item.name}</span>
                    ${item.notes ? `<div style="font-size:11px;color:#6b7280;font-style:italic;margin-top:2px;">Note: ${item.notes}</div>` : ''}
                </td>
                <td style="padding:8px 4px;text-align:center;font-weight:700;font-size:18px;">${item.quantity}</td>
                <td style="padding:8px 4px;text-align:right;">
                    <span style="${getItemStatusStyle(item.status)}">${item.status || ''}</span>
                </td>
            </tr>
        `).join('');

        const tableOrToken = selectedOrder.orderType === 'dine-in'
            ? `TBL ${selectedOrder.tableId?.number || selectedOrder.tableId || '?'}`
            : `TOK ${selectedOrder.tokenNumber}`;

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>KOT - ${selectedOrder.orderNumber}</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: monospace, sans-serif; background:#fff; color:#000; padding:12px; }
        @page { size: 80mm auto; margin: 5mm; }
    </style>
</head>
<body>
    <div style="max-width:320px;margin:0 auto;position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.05;pointer-events:none;transform:rotate(45deg);">
            <span style="font-size:80px;font-weight:900;letter-spacing:4px;">KOT</span>
        </div>
        <div style="text-align:center;border-bottom:2px dashed #d1d5db;padding-bottom:12px;margin-bottom:12px;">
            <h1 style="font-size:22px;font-weight:900;letter-spacing:1px;">KITCHEN ORDER</h1>
            <p style="font-size:11px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">${selectedOrder.orderType}</p>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:12px;">
            <div>
                <p><strong>Order:</strong> ${selectedOrder.orderNumber}</p>
                <p><strong>Time:</strong> ${new Date(selectedOrder.createdAt).toLocaleTimeString()}</p>
            </div>
            <div style="text-align:right;">
                <p style="font-size:18px;font-weight:900;">${tableOrToken}</p>
            </div>
        </div>
        <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:16px;">
            <thead>
                <tr style="border-bottom:2px solid #000;">
                    <th style="padding:4px;text-align:left;">Item</th>
                    <th style="padding:4px;text-align:center;">Qty</th>
                    <th style="padding:4px;text-align:right;">Status</th>
                </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
        </table>
        <div style="border-top:2px solid #000;padding-top:12px;text-align:center;">
            <p style="font-size:10px;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Order Status</p>
            <div style="font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:2px;padding:8px;border:2px solid ${orderStatusColor};color:${orderStatusColor};">
                ${selectedOrder.orderStatus}
            </div>
        </div>
    </div>
    <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; };<\/script>
</body>
</html>`;

        const win = window.open('', '_blank', 'width=400,height=600');
        win.document.write(html);
        win.document.close();
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending':   return 'text-[var(--status-pending)] bg-[var(--status-pending-bg)] border-[var(--status-pending-border)]';
            case 'accepted':  return 'text-[var(--status-accepted)] bg-[var(--status-accepted-bg)] border-[var(--status-accepted-border)]';
            case 'preparing': return 'text-[var(--status-preparing)] bg-[var(--status-preparing-bg)] border-[var(--status-preparing-border)]';
            case 'ready':     return 'text-[var(--status-ready)] bg-[var(--status-ready-bg)] border-[var(--status-ready-border)]';
            default:          return 'text-gray-400 bg-gray-900/30 border-gray-700/30';
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* ── Tabs & Counters ─────────────────────────────────────── */}
            <div className="flex flex-col gap-4 bg-[var(--theme-bg-card)] p-4 sm:p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                <div className="flex items-center gap-1.5 p-1 bg-[var(--theme-bg-dark)] rounded-2xl border border-[var(--theme-border)] w-full">
                    {['all', 'dine-in', 'takeaway']
                        .filter(t => t !== 'takeaway' || settings?.takeawayEnabled !== false)
                        .filter(t => t !== 'dine-in'  || settings?.dineInEnabled   !== false)
                        .map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={`
                                flex-1 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                                ${filterType === t
                                    ? 'bg-[var(--theme-bg-card)] text-orange-500 shadow-sm border border-[var(--theme-border)]'
                                    : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'}
                            `}
                        >
                            {t === 'all' ? 'ALL' : t.replace('-', ' ').toUpperCase()}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-4 gap-2 mt-2">
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
                            <p className={`text-lg sm:text-2xl font-black tabular-nums ${statusFilter === key ? activeText : 'text-[var(--theme-text-main)]'}`}>{count}</p>
                            <div className="flex items-center gap-1 mt-1">
                                <span className={`w-1 h-1 rounded-full ${dot}`} />
                                <p className={`text-[8px] sm:text-[10px] uppercase font-bold tracking-tighter sm:tracking-wider ${statusFilter === key ? activeText : 'text-[var(--theme-text-muted)]'}`}>{label}</p>
                            </div>
                        </button>
                    ))}
                </div>


            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8 flex-1 overflow-hidden h-auto md:h-[calc(100dvh-320px)] min-h-[500px]">
                {/* Left: Active Orders List */}
                <div className="md:col-span-1 bg-[var(--theme-bg-card)] rounded-xl shadow-lg border border-[var(--theme-border)] overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-[var(--theme-border)] bg-[var(--theme-bg-hover)] flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-[var(--theme-text-main)]">Active Orders</h2>
                            <span className="bg-orange-600/20 text-orange-400 text-xs px-2 py-1 rounded-full font-bold">{displayOrders.length}</span>
                        </div>
                        {/* Grid / List toggle */}
                        <button
                            onClick={() => setIsGridView(v => !v)}
                            className={`flex items-center gap-1.5 pl-1.5 pr-3 h-8 rounded-full border transition-all duration-300 active:scale-95 ${
                                isGridView
                                    ? 'bg-blue-500/10 border-blue-500/25'
                                    : 'bg-orange-500/10 border-orange-500/25'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm ${isGridView ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'}`}>
                                {isGridView ? <Grid size={10} strokeWidth={2.5} /> : <List size={10} strokeWidth={2.5} />}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isGridView ? 'text-blue-600' : 'text-orange-500'}`}>
                                {isGridView ? 'Grid' : 'List'}
                            </span>
                        </button>
                    </div>
                    <div className={`overflow-y-auto flex-1 p-4 custom-scrollbar ${isGridView ? 'grid grid-cols-3 gap-2 content-start' : 'space-y-3'}`}>
                        {displayOrders.map(order => {
                            const tokenLabel = order.orderType === 'dine-in'
                                ? `Table ${order.tableId?.number || order.tableId || '?'}`
                                : `Token ${order.tokenNumber || '?'}`;
                            return isGridView ? (
                                <button
                                    key={order._id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-2 transition-all active:scale-90 ${
                                        selectedOrder?._id === order._id ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                                    } ${order.orderStatus === 'ready' ? 'animate-pulse' : ''} ${getStatusColor(order.orderStatus)}`}
                                >
                                    <span className="text-[10px] uppercase font-black opacity-40 leading-none mb-1 tracking-widest">
                                        {order.orderType === 'dine-in' ? 'Dine In' : 'Takeaway'}
                                    </span>
                                    <span className="text-lg font-black leading-tight tracking-tight text-center">
                                        {tokenLabel}
                                    </span>
                                    <span className={`mt-2 text-[7px] font-black uppercase px-2 py-0.5 rounded border border-current/30 bg-white/5`}>
                                        {order.orderStatus}
                                    </span>
                                </button>
                            ) : (
                            <div
                                key={order._id}
                                onClick={() => setSelectedOrder(order)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer group ${selectedOrder?._id === order._id
                                    ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10'
                                    : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] hover:bg-[var(--theme-bg-hover)] hover:border-[var(--theme-text-muted)]'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-[var(--theme-text-main)] text-md">{order.orderNumber}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${getStatusColor(order.orderStatus)}`}>
                                        {order.orderStatus}
                                    </span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <p className="text-sm font-black text-[var(--theme-text-main)] group-hover:text-blue-500 transition-colors uppercase tracking-tight">{tokenLabel}</p>
                                    <p className="text-sm font-semibold text-[var(--theme-text-muted)]">{new Date(order.createdAt).toLocaleTimeString()}</p>
                                </div>
                            </div>
                            );
                        })}
                        {orders.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                                <p>No active kitchen orders</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Order Details */}
                <div className="md:col-span-2 bg-[var(--theme-bg-card)] rounded-xl shadow-lg border border-[var(--theme-border)] flex flex-col overflow-hidden relative">
                    {selectedOrder ? (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex justify-center bg-[var(--theme-bg-dark)]">
                                <div id="printable-kot" className="w-full max-w-sm bg-white text-black p-6 shadow-2xl relative">
                                    {/* Watermark */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                                        <h1 className="text-9xl font-bold uppercase rotate-45">KOT</h1>
                                    </div>

                                    {/* KOT Header */}
                                    <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4 relative z-10">
                                        <h1 className="text-3xl font-extrabold tracking-tight mb-1">KITCHEN ORDER</h1>
                                        <p className="text-sm font-semibold text-gray-600 uppercase tracking-widest">{selectedOrder.orderType}</p>
                                    </div>

                                    {/* Meta Data */}
                                    <div className="flex justify-between text-xs mb-4 relative z-10">
                                        <div className="text-left">
                                            <p><span className="font-bold">Order:</span> {selectedOrder.orderNumber}</p>
                                            <p><span className="font-bold">Time:</span> {new Date(selectedOrder.createdAt).toLocaleTimeString()}</p>
                                        </div>
                                            <div className="text-right">
                                                <p><span className="font-bold text-lg">{selectedOrder.orderType === 'dine-in' ? `Table ${selectedOrder.tableId?.number || selectedOrder.tableId || '?'}` : `Token ${selectedOrder.tokenNumber || '?'}`}</span></p>
                                            </div>
                                    </div>

                                    {/* Items */}
                                    <table className="w-full text-sm text-left mb-6 relative z-10">
                                        <thead>
                                            <tr className="border-b border-black">
                                                <th className="py-1">Item</th>
                                                <th className="py-1 text-center">Qty</th>
                                                <th className="py-1 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedOrder.items.map((item, idx) => (
                                                <tr key={idx} className="border-b border-dashed border-gray-200">
                                                    <td className="py-3">
                                                        <span className="font-bold">{item.name}</span>
                                                        {item.notes && <div className="text-xs text-gray-500 italic mt-1">Note: {item.notes}</div>}
                                                    </td>
                                                    <td className="py-3 text-center font-bold text-lg">{item.quantity}</td>
                                                    <td className="py-3 text-right">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border transition-colors ${
                                                            item.status?.toLowerCase() === 'pending'   ? 'border-[var(--status-pending)] text-[var(--status-pending)]' :
                                                            item.status?.toLowerCase() === 'accepted'  ? 'border-[var(--status-accepted)] text-[var(--status-accepted)]' :
                                                            item.status?.toLowerCase() === 'preparing' ? 'border-[var(--status-preparing)] text-[var(--status-preparing)]' :
                                                            item.status?.toLowerCase() === 'ready'     ? 'border-[var(--status-ready)] text-[var(--status-ready)]' :
                                                            item.status?.toUpperCase() === 'CANCELLED' ? 'border-red-600 text-red-600 line-through' :
                                                            'border-gray-400 text-gray-600'
                                                        }`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Order Status */}
                                    <div className="border-t-2 border-black pt-4 text-center relative z-10">
                                        <p className="text-xs font-bold uppercase mb-2">Order Status</p>
                                        <div className={`text-xl font-black uppercase tracking-widest py-2 border-2 transition-colors ${
                                            selectedOrder.orderStatus === 'ready'     ? 'border-[var(--status-ready)] text-[var(--status-ready)]' :
                                            selectedOrder.orderStatus === 'preparing' ? 'border-[var(--status-preparing)] text-[var(--status-preparing)]' :
                                            selectedOrder.orderStatus === 'accepted'  ? 'border-[var(--status-accepted)] text-[var(--status-accepted)]' :
                                            'border-[var(--status-pending)] text-[var(--status-pending)]'
                                        }`}>
                                            {selectedOrder.orderStatus}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-6 bg-[var(--theme-bg-hover)] border-t border-[var(--theme-border)] flex items-center justify-end gap-4">
                                <button
                                    onClick={printKOT}
                                    className="flex items-center space-x-2 px-6 py-3 bg-[var(--theme-bg-card)] hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-main)] rounded-xl transition-colors font-semibold border border-[var(--theme-border)]"
                                >
                                    <Printer size={20} />
                                    <span>Print KOT</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full items-center justify-center text-[var(--theme-text-muted)] p-8 space-y-6">
                            <div className="w-24 h-24 bg-[var(--theme-bg-dark)] rounded-full flex items-center justify-center border-4 border-[var(--theme-border)] shadow-2xl">
                                <ChefHat size={48} className="text-orange-500" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-[var(--theme-text-main)]">No Order Selected</h3>
                                <p className="max-w-xs mx-auto">Select an order to view its working process details.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkingProcess;

