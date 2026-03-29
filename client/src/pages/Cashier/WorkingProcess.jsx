import { useState, useEffect, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import logoImg from '../../assets/logo.png';
import { Printer, ChefHat, List, Grid, RefreshCw, Clock, CheckCircle, Play, Timer } from 'lucide-react';

const WorkingProcess = () => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const { user, socket, formatPrice, settings } = useContext(AuthContext);

    const [filterType, setFilterType] = useState('all');
    const [statusFilter, setStatusFilter] = useState(null);
    const [isGridView, setIsGridView] = useState(true);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/orders', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const ordersArray = res.data.orders || [];
            setOrders(ordersArray.filter(o => ['pending', 'preparing', 'accepted', 'ready'].includes(o.orderStatus)));
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) fetchOrders();

        if (!socket) return;

        const onNewOrder = (newOrder) => {
            setOrders(prev => prev.find(o => o._id === newOrder._id) ? prev : [newOrder, ...prev]);
        };

        const onOrderUpdated = (updatedOrder) => {
            const isDone = ['completed', 'cancelled'].includes(updatedOrder.orderStatus);
            setOrders(prev => {
                const existing = prev.find(o => o._id === updatedOrder._id);
                if (isDone) return prev.filter(o => o._id !== updatedOrder._id);
                if (existing) return prev.map(o => o._id === updatedOrder._id ? updatedOrder : o);
                return [updatedOrder, ...prev];
            });
            // Update selectedOrder without needing it in deps — compare by id at call time
            setSelectedOrder(prev => {
                if (!prev || prev._id !== updatedOrder._id) return prev;
                return isDone ? null : updatedOrder;
            });
        };

        socket.on('new-order', onNewOrder);
        socket.on('order-updated', onOrderUpdated);
        socket.on('itemUpdated', onOrderUpdated);

        return () => {
            socket.off('new-order', onNewOrder);
            socket.off('order-updated', onOrderUpdated);
            socket.off('itemUpdated', onOrderUpdated);
        };
    }, [user, socket, fetchOrders]);

    const enabledOrders = orders
        .filter(o => settings?.takeawayEnabled !== false || o.orderType !== 'takeaway')
        .filter(o => settings?.dineInEnabled !== false || o.orderType !== 'dine-in');

    const currentTypeOrders = enabledOrders.filter(o => filterType === 'all' || o.orderType === filterType);

    const counts = {
        pending: currentTypeOrders.filter(o => o.orderStatus === 'pending').length,
        accepted: currentTypeOrders.filter(o => o.orderStatus === 'accepted').length,
        preparing: currentTypeOrders.filter(o => o.orderStatus === 'preparing').length,
        ready: currentTypeOrders.filter(o => o.orderStatus === 'ready').length,
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
            pending: '#f59e0b',
            accepted: '#3b82f6',
            preparing: '#8b5cf6',
            ready: '#10b981',
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
            case 'pending': return 'text-[var(--status-pending)] bg-[var(--status-pending-bg)] border-[var(--status-pending-border)]';
            case 'accepted': return 'text-[var(--status-accepted)] bg-[var(--status-accepted-bg)] border-[var(--status-accepted-border)]';
            case 'preparing': return 'text-[var(--status-preparing)] bg-[var(--status-preparing-bg)] border-[var(--status-preparing-border)]';
            case 'ready': return 'text-[var(--status-ready)] bg-[var(--status-ready-bg)] border-[var(--status-ready-border)]';
            default: return 'text-gray-400 bg-gray-900/30 border-gray-700/30';
        }
    };

    return (
        <div className="flex flex-col animate-fade-in">
            {/* ── TopBar Portal ────────────────────────────────────────── */}
            {document.getElementById('topbar-portal') && createPortal(
                <div className="flex items-center gap-3 w-full animate-fade-in px-4">
                    {/* Operational Filters - 3D Mechanical Switch */}
                    <div className="flex bg-[var(--theme-bg-dark)] p-1 rounded-2xl border border-[var(--theme-border)] shadow-inner h-11 min-w-[320px]">
                        {['all', 'dine-in', 'takeaway']
                            .filter(t => t !== 'takeaway' || settings?.takeawayEnabled !== false)
                            .filter(t => t !== 'dine-in' || settings?.dineInEnabled !== false)
                            .map(t => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`flex-1 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center ${
                                    filterType === t
                                        ? 'bg-orange-500 text-white shadow-[0_2px_4px_rgba(249,115,22,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)] scale-[1.02] border-t border-white/20 active:translate-y-[1px] active:shadow-none'
                                        : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-hover)]'
                                }`}
                            >
                                {t === 'all' ? 'ALL' : t.replace('-', ' ')}
                            </button>
                        ))}
                    </div>

                    {/* Dashboard Status Counters - 3D Mechanical Pills */}
                    <div className="flex items-center gap-1.5 bg-[var(--theme-bg-dark)] p-1 rounded-2xl border border-[var(--theme-border)] shadow-inner h-11 shrink-0">
                        {[
                            { key: 'pending',   count: counts.pending,   dot: 'bg-[var(--status-pending)]',    label: 'Q', icon: Clock },
                            { key: 'accepted',  count: counts.accepted,  dot: 'bg-[var(--status-accepted)]',   label: 'A', icon: CheckCircle },
                            { key: 'preparing', count: counts.preparing, dot: 'bg-[var(--status-preparing)]',  label: 'C', icon: Timer },
                            { key: 'ready',     count: counts.ready,     dot: 'bg-[var(--status-ready)]',      label: 'R', icon: Play },
                        ].map((stat) => {
                            const isActive = statusFilter === stat.key;
                            // Dynamic active styles based on status key
                            const activeStyles = {
                                pending:   'bg-orange-500/20 border-orange-500/40 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)] scale-105',
                                accepted:  'bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-105',
                                preparing: 'bg-purple-500/20 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(139,92,246,0.15)] scale-105',
                                ready:     'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-105'
                            };

                            return (
                                <button
                                    key={stat.key}
                                    onClick={() => setStatusFilter(f => f === stat.key ? null : stat.key)}
                                    className={`px-4 rounded-xl flex items-center gap-2 h-9 border transition-all duration-300 ${
                                        isActive
                                            ? `${activeStyles[stat.key]} border-current active:translate-y-[0.5px]`
                                            : 'bg-transparent border-transparent text-[var(--theme-text-muted)] hover:bg-white/5'
                                    }`}
                                >
                                    <span className={`w-2.5 h-2.5 rounded-full ${stat.dot} ${isActive ? 'shadow-[0_0_12px_currentColor] scale-110' : 'opacity-60 shadow-none'}`} />
                                    <span className={`text-sm font-black transition-colors ${isActive ? 'text-white' : 'text-inherit'}`}>
                                        {stat.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="h-8 w-px bg-[var(--theme-border)] mx-2 opacity-50 flex-shrink-0" />

                    <div className="ml-auto flex items-center gap-4">
                        {/* View Mode Toggle moved to right TopBar point */}

                        {/* View Mode Toggle moved to right TopBar point */}
                        <button
                            onClick={() => setIsGridView(v => !v)}
                            className={`
                                relative flex items-center h-10 w-28 rounded-full transition-all duration-300 shadow-inner overflow-hidden border
                                ${isGridView 
                                    ? 'bg-blue-500/10 border-blue-500/20' 
                                    : 'bg-orange-500/10 border-orange-500/20'}
                            `}
                        >
                            <div 
                                className={`
                                    absolute top-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                    ${isGridView 
                                        ? 'left-[calc(100%-36px)] bg-blue-600 rotate-[360deg]' 
                                        : 'left-1 bg-orange-600 rotate-0'}
                                `}
                            >
                                {isGridView ? <Grid size={14} strokeWidth={3} className="text-white" /> : <List size={14} strokeWidth={3} className="text-white" />}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
                                <span className={`text-[10px] font-black transition-all duration-300 ${isGridView ? 'opacity-0 -translate-x-2' : 'opacity-100 translate-x-7 text-orange-600'}`}>LIST</span>
                                <span className={`text-[10px] font-black transition-all duration-300 ${!isGridView ? 'opacity-0 translate-x-2' : 'opacity-100 -translate-x-7 text-blue-600'}`}>GRID</span>
                            </div>
                        </button>
                        
                        <button
                            onClick={fetchOrders}
                            className="w-10 h-10 bg-[var(--theme-bg-card)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-orange-500 hover:border-orange-500/50 rounded-xl flex items-center justify-center transition-all active:translate-y-[1px] active:shadow-inner"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>,
                document.getElementById('topbar-portal')
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-auto md:h-[calc(100dvh-120px)] min-h-0 md:min-h-[420px]">
                {/* Left: Active Orders List — 2/5 of available width */}
                <div className="md:col-span-2 bg-[var(--theme-bg-card)] rounded-xl shadow-lg border border-[var(--theme-border)] overflow-hidden flex flex-col min-h-[300px] md:min-h-0">
                    <div className="px-4 py-3 border-b border-[var(--theme-border)] bg-[var(--theme-bg-hover)] flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-[var(--theme-text-main)]">Active Orders</h2>
                            <span className="bg-orange-600/20 text-orange-400 text-xs px-2 py-1 rounded-full font-bold">{displayOrders.length}</span>
                        </div>
                    </div>
                    <div className={`overflow-y-auto flex-1 p-3 custom-scrollbar ${isGridView ? 'grid grid-cols-2 gap-3 content-start' : 'space-y-2.5'}`}>
                        {displayOrders.map(order => {
                            const tokenLabel = order.orderType === 'dine-in'
                                ? `Table ${order.tableId?.number || order.tableId || '?'}`
                                : `Token ${order.tokenNumber || '?'}`;
                            return isGridView ? (
                                <button
                                    key={order._id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`w-full min-h-[100px] h-[100px] sm:min-h-[120px] sm:h-[120px] max-w-[150px] mx-auto rounded-2xl border-2 flex flex-col items-center justify-center p-2.5 sm:p-3 transition-all hover:scale-[1.02] active:scale-95 shadow-sm overflow-hidden ${
                                        selectedOrder?._id === order._id 
                                            ? 'ring-4 ring-offset-2 ring-current z-10 scale-105 shadow-xl shadow-current/20' 
                                            : 'opacity-80 hover:opacity-100'
                                        } ${order.orderStatus === 'ready' ? 'animate-pulse' : ''} ${getStatusColor(order.orderStatus)}`}
                                >
                                    {/* Top Row: Type & Status */}
                                    <div className="flex items-start justify-between w-full shrink-0">
                                        <span className="text-[9px] uppercase font-black opacity-60 tracking-wider">
                                            {order.orderType === 'dine-in' ? 'Dine' : 'Take'}
                                        </span>
                                        <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border border-current transition-colors ${selectedOrder?._id === order._id ? 'bg-white text-black' : 'bg-white/10'}`}>
                                            {order.orderStatus}
                                        </span>
                                    </div>

                                    {/* Centered Large Label */}
                                    <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
                                        <span className="text-lg sm:text-xl font-black leading-[1.1] tracking-tight text-center px-1 break-words w-full truncate">
                                            {tokenLabel}
                                        </span>
                                    </div>

                                    {/* Bottom aesthetic indicator bar */}
                                    <div className="w-1/3 h-1 rounded-full bg-current opacity-25 shrink-0 mt-auto" />
                                </button>
                            ) : (
                                <div
                                    key={order._id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer group flex flex-col ${
                                        selectedOrder?._id === order._id
                                            ? `${getStatusColor(order.orderStatus)} ring-4 ring-offset-2 ring-current z-10 scale-[1.01] shadow-xl`
                                            : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] hover:bg-[var(--theme-bg-hover)]'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className={`font-black text-md ${selectedOrder?._id === order._id ? 'text-inherit' : 'text-[var(--theme-text-main)]'}`}>{order.orderNumber}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-black border border-current ${selectedOrder?._id === order._id ? 'bg-white text-black' : getStatusColor(order.orderStatus)}`}>
                                            {order.orderStatus}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <p className="text-sm font-black uppercase tracking-tight">{tokenLabel}</p>
                                        <p className="text-[10px] font-bold opacity-60">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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

                {/* Right: Order Details — 3/5 of available width, hidden on mobile when empty */}
                <div className={`md:col-span-3 bg-[var(--theme-bg-card)] rounded-xl shadow-lg border border-[var(--theme-border)] flex flex-col overflow-hidden relative ${!selectedOrder ? 'hidden md:flex' : 'flex'}`}>
                    {selectedOrder ? (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar flex justify-center bg-[var(--theme-bg-dark)]">
                                <div id="printable-kot" className="w-full max-w-sm bg-white text-black p-6 shadow-2xl relative">
                                    {/* Watermark */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none overflow-hidden">
                                        <h1 className="text-7xl font-bold uppercase rotate-45 select-none">KOT</h1>
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
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border transition-colors ${item.status?.toLowerCase() === 'pending' ? 'border-[var(--status-pending)] text-[var(--status-pending)]' :
                                                                item.status?.toLowerCase() === 'accepted' ? 'border-[var(--status-accepted)] text-[var(--status-accepted)]' :
                                                                    item.status?.toLowerCase() === 'preparing' ? 'border-[var(--status-preparing)] text-[var(--status-preparing)]' :
                                                                        item.status?.toLowerCase() === 'ready' ? 'border-[var(--status-ready)] text-[var(--status-ready)]' :
                                                                            item.status?.toLowerCase() === 'cancelled' ? 'border-red-600 text-red-600 line-through' :
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
                                        <div className={`text-xl font-black uppercase tracking-widest py-2 border-2 transition-colors ${selectedOrder.orderStatus === 'ready' ? 'border-[var(--status-ready)] text-[var(--status-ready)]' :
                                                selectedOrder.orderStatus === 'preparing' ? 'border-[var(--status-preparing)] text-[var(--status-preparing)]' :
                                                    selectedOrder.orderStatus === 'accepted' ? 'border-[var(--status-accepted)] text-[var(--status-accepted)]' :
                                                        'border-[var(--status-pending)] text-[var(--status-pending)]'
                                            }`}>
                                            {selectedOrder.orderStatus}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="px-4 py-3 bg-[var(--theme-bg-hover)] border-t border-[var(--theme-border)] flex items-center justify-end gap-3">
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

