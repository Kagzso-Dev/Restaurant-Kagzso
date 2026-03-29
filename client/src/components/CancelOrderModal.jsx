import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const CancelOrderModal = ({ order, item, isOpen, onClose, onConfirm, title = "Cancel Order" }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        setLoading(true);
        try {
            if (item) {
                await onConfirm(order._id, item._id, reason);
            } else {
                await onConfirm(order._id, reason);
            }
            setReason('');
            onClose();
        } catch (err) {
            // onConfirm re-threw — keep modal open so user sees the error
            alert(err?.response?.data?.message || err?.message || 'Cancellation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-x-0 top-0 bottom-14 md:inset-0 z-[10000] flex items-end md:items-center justify-center md:p-4 text-left">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[6px]" onClick={onClose} />

            {/* Sheet / Modal */}
            <div className="relative bg-white dark:bg-[var(--theme-bg-card)] w-full md:w-auto md:max-w-[360px] rounded-t-[2rem] md:rounded-[2rem] shadow-[0_-8px_40px_rgba(0,0,0,0.3)] md:shadow-[0_25px_70px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-300 border border-[var(--theme-border)] max-h-[calc(100dvh-4rem)] md:max-h-[90vh]">

                {/* Drag handle (mobile only) */}
                <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                    <div className="w-10 h-1 rounded-full bg-[var(--theme-border)]" />
                </div>

                {/* Visual Accent */}
                <div className="h-1.5 bg-red-600 w-full flex-shrink-0" />

                <div className="flex-1 overflow-y-auto p-6 pb-5">
                    {/* Header Block */}
                    <div className="flex flex-col items-center text-center gap-2 mb-5">
                        <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-1">
                            <AlertTriangle size={24} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-[18px] font-black tracking-tight leading-tight uppercase text-[var(--theme-text-main)]">
                            {title}
                        </h3>
                        {item || order ? (
                            <p className="text-[11px] font-black bg-red-500/5 px-2.5 py-1 rounded-lg text-red-600/70 border border-red-500/10 uppercase tracking-wider">
                                {item ? item.name : order?.orderNumber.replace('ORD-', '#')}
                            </p>
                        ) : null}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/5">
                            <p className="text-[12px] text-center text-[var(--theme-text-muted)] font-bold leading-relaxed">
                                Are you sure? This action cannot be undone.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[var(--theme-text-muted)] ml-1">
                                Cancellation Reason
                            </label>

                            {/* Quick reasons - optimized for premium touch */}
                            <div className="flex flex-wrap gap-1.5 justify-center">
                                {['Out of Stock', 'Guest Changed', 'Mistake'].map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setReason(r)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${reason === r ? 'bg-red-600 text-white border-red-600 shadow-md scale-[0.98]' : 'bg-[var(--theme-bg-hover)] text-[var(--theme-text-subtle)] border-[var(--theme-border)] hover:border-red-500/50'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Details (e.g. Out of stock...)"
                                className="hidden md:block w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-2xl p-4 text-[var(--theme-text-main)] text-xs placeholder:text-[var(--theme-text-subtle)] focus:outline-none focus:ring-2 focus:ring-red-500/30 min-h-[80px] resize-none transition-all font-bold"
                                required
                            />
                        </div>
                    </form>
                </div>

                {/* Footer Actions (iOS-Style Grid) */}
                <div className="flex-shrink-0 grid grid-cols-2 border-t border-[var(--theme-border)] bg-gray-50/30 dark:bg-black/10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-14 sm:h-16 flex items-center justify-center text-[13px] sm:text-[14px] text-[var(--theme-text-muted)] font-black uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-white/5 active:bg-gray-200 transition-colors border-r border-[var(--theme-border)]"
                    >
                        Nevermind
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        onClick={handleSubmit}
                        className="h-14 sm:h-16 flex items-center justify-center text-[13px] sm:text-[14px] text-red-600 font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors active:text-red-700 font-bold"
                    >
                        {loading ? '...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CancelOrderModal;

