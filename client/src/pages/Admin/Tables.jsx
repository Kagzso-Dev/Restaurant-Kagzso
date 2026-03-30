import { useState, useContext, useMemo } from 'react';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';
import { Trash2, Plus, RotateCcw, X, Table2 } from 'lucide-react';

// ── Shared components — single source of truth ────────────────────────────
import TableCard, { STATUS_CONFIG } from '../../components/TableCard';
import { useTablesData } from '../../hooks/useTablesData';

/* ── Add Table Modal (Right Drawer) ─────────────────────────────────────────── */
const AddTableModal = ({ defaultNumber, onClose, onSubmit }) => {
    const [form, setForm] = useState({ number: defaultNumber, capacity: 4 });

    return (
        <div className="fixed inset-0 z-[1000] flex justify-end animate-fade-in px-2 sm:px-0">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative z-10 w-full sm:w-[400px] bg-[var(--theme-bg-card)] shadow-2xl flex flex-col h-full border-l border-[var(--theme-border)] animate-slide-left pb-[64px] sm:pb-0 rounded-t-3xl sm:rounded-none">
                {/* Header */}
                <div className="px-5 py-4 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-bg-card2)] shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-[var(--theme-text-main)] uppercase tracking-tighter">Add New Table</h3>
                        <p className="text-[9px] text-[var(--theme-text-muted)] font-bold uppercase tracking-widest mt-0.5 opacity-60">Floor Plan Settings</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--theme-bg-hover)] rounded-xl transition-colors">
                        <Plus size={20} className="rotate-45" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                    <form id="add-table-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-6">
                        
                        {/* Table Number */}
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] ml-1">
                                Designation / Number
                            </label>
                            <input
                                type="text"
                                value={form.number}
                                onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                                required
                                placeholder="e.g. 12"
                                className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] rounded-2xl px-5 py-3.5 border border-[var(--theme-border)] focus:border-orange-500 focus:outline-none transition-all font-black text-xl tracking-tighter"
                            />
                        </div>

                        {/* Capacity Selection */}
                        <div className="space-y-3">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] ml-1">
                                Seating Capacity
                            </label>
                            
                            <div className="grid grid-cols-5 gap-1.5">
                                {[2, 4, 6, 8, 10].map((cap) => (
                                    <button
                                        key={cap}
                                        type="button"
                                        onClick={() => setForm({ ...form, capacity: cap })}
                                        className={`h-10 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${form.capacity === cap ? 'bg-orange-500 text-white border-transparent shadow-lg shadow-orange-500/20' : 'bg-[var(--theme-bg-dark)] text-[var(--theme-text-muted)] border-[var(--theme-border)] hover:border-orange-500/50'}`}
                                    >
                                        {cap}
                                    </button>
                                ))}
                            </div>

                            <input
                                type="number"
                                value={form.capacity}
                                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                                required
                                min="1"
                                className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] rounded-xl px-4 py-2 border border-[var(--theme-border)] focus:border-orange-500 focus:outline-none transition-all font-bold text-xs"
                                placeholder="Custom"
                            />
                        </div>

                        {/* Info Box */}
                        <div className="p-3.5 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex gap-3 items-start">
                            <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                <Table2 size={14} className="text-orange-500" />
                            </div>
                            <p className="text-[9px] text-[var(--theme-text-muted)] font-bold leading-relaxed opacity-70 uppercase tracking-tight">
                                New tables are added to the available pool. Manage status directly from the grid.
                            </p>
                        </div>
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-[var(--theme-border)] bg-[var(--theme-bg-card2)] flex gap-2.5 shrink-0">
                    <button type="button" onClick={onClose} className="flex-1 h-11 text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] rounded-xl transition-all border border-[var(--theme-border)]">
                        Cancel
                    </button>
                    <button type="submit" form="add-table-form" className="flex-[1.5] h-11 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-600/30 active:scale-95">
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Main Component ───────────────────────────────────────────────────────── */
const AdminTables = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewType, setViewType] = useState('grid'); // 'grid' | 'list'
    const { user } = useContext(AuthContext);

    // ── Single source of truth: same hook + same API as Waiter ──────────────
    const { tables, setTables, loading } = useTablesData();

    // ── Admin-only actions ───────────────────────────────────────────────────

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this table?')) return;
        try {
            await api.delete(`/api/tables/${id}`, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            setTables((prev) => prev.filter((t) => t._id !== id));
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting table');
        }
    };

    const handleForceReset = async (id) => {
        if (!window.confirm('Force reset this table to Available?')) return;
        try {
            const res = await api.put(`/api/tables/${id}/force-reset`, {}, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            setTables((prev) => prev.map((t) => (t._id === id ? res.data.table : t)));
        } catch (err) {
            alert(err.response?.data?.message || 'Error resetting table');
        }
    };

    const handleAddTable = async (formData) => {
        try {
            const res = await api.post('/api/tables', formData, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            setTables((prev) =>
                [...prev, res.data].sort((a, b) => parseInt(a.number) - parseInt(b.number))
            );
            setIsModalOpen(false);
        } catch (err) {
            alert('Error creating table: ' + (err.response?.data?.message || err.message));
        }
    };

    // ── Derived ──────────────────────────────────────────────────────────────

    const statusCounts = useMemo(() => {
        const counts = {};
        Object.keys(STATUS_CONFIG).forEach((s) => {
            counts[s] = tables.filter((t) => t.status === s).length;
        });
        return counts;
    }, [tables]);

    const filteredTables = useMemo(
        () => (statusFilter === 'all' ? tables : tables.filter((t) => t.status === statusFilter)),
        [tables, statusFilter]
    );

    const nextTableNum = (() => {
        const nums = tables.map((t) => parseInt(t.number)).filter((n) => !isNaN(n));
        return nums.length > 0 ? Math.max(...nums) + 1 : 1;
    })();

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5 animate-fade-in">

            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--theme-bg-card2)] p-5 sm:p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-[var(--theme-text-main)] uppercase tracking-tighter leading-tight">Table Map</h1>
                    <p className="text-[10px] sm:text-sm text-[var(--theme-text-muted)] mt-1 font-bold uppercase tracking-widest opacity-60">Manage Floor Plan</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-600/30 whitespace-nowrap min-h-[44px]"
                    >
                        <Plus size={16} />
                        Add Table
                    </button>
                </div>
            </div>

            {/* ── Status Filter Pills ──────────────────────────────────── */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setStatusFilter('all')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                        statusFilter === 'all'
                            ? 'bg-[var(--theme-text-main)] text-[var(--theme-bg-dark)] border-transparent'
                            : 'bg-[var(--theme-bg-card)] text-[var(--theme-text-muted)] border-[var(--theme-border)] hover:border-gray-400'
                    }`}
                >
                    All
                    <span className="bg-[var(--theme-bg-hover)] px-1.5 py-0.5 rounded-md tabular-nums opacity-60 font-mono text-[9px]">{tables.length}</span>
                </button>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => setStatusFilter((k) => (k === key ? 'all' : key))}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                            statusFilter === key
                                ? `${config.border} ${config.bg}`
                                : 'bg-[var(--theme-bg-card)] text-[var(--theme-text-muted)] border-[var(--theme-border)] hover:border-gray-400'
                        }`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
                        <span className={statusFilter === key ? config.text : 'opacity-80'}>{config.label}</span>
                        <span className={`px-1.5 py-0.5 rounded-md tabular-nums ${statusFilter === key ? config.text : 'text-[var(--theme-text-muted)]'} bg-[var(--theme-bg-hover)] font-mono text-[9px]`}>
                            {statusCounts[key] || 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Tables Grid — uses shared TableCard ───────────────────── */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {Array(12).fill(0).map((_, i) => (
                        <div key={i} className="skeleton rounded-2xl min-h-[130px]" />
                    ))}
                </div>
            ) : filteredTables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-[var(--theme-text-muted)]">
                    <Table2 size={44} className="mb-3 opacity-20" />
                    <p className="font-bold text-base">No tables found</p>
                    <p className="text-sm opacity-70 mt-1">
                        {statusFilter !== 'all' ? `No ${statusFilter} tables` : 'Add your first table to get started'}
                    </p>
                </div>
            ) : (
                <div className={viewType === 'grid' 
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
                    : "flex flex-col gap-3"
                }>
                    {filteredTables.map((table) => (
                        <div key={table._id} className="flex flex-col gap-1.5">
                            <TableCard
                                table={table}
                                variant={viewType}
                                actions={
                                    <>
                                        {table.status !== 'available' && (
                                            <button
                                                onClick={() => handleForceReset(table._id)}
                                                title="Force Reset"
                                                className="p-1.5 text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                            >
                                                <RotateCcw size={13} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(table._id)}
                                            title="Delete"
                                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </>
                                }
                            />
                            {table.status === 'cleaning' && (
                                <button
                                    onClick={async () => {
                                        try {
                                            await api.put(`/api/tables/${table._id}/clean`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
                                            // useTablesData socket will update state globally
                                        } catch (err) { alert(err.response?.data?.message || 'Clean failed'); }
                                    }}
                                    className="w-full py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase rounded-lg transition-colors"
                                >
                                    ✓ Clean
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Add Table Modal ──────────────────────────────────────── */}
            {isModalOpen && (
                <AddTableModal
                    defaultNumber={nextTableNum}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleAddTable}
                />
            )}
        </div>
    );
};

export default AdminTables;
