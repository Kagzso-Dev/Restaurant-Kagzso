import { useContext } from 'react';
import { NotificationContext } from '../context/NotificationContext';
import { ShoppingBag, ChefHat, CreditCard, X, Bell, AlertTriangle, Megaphone, CheckCircle2 } from 'lucide-react';

const typeConfig = {
    NEW_ORDER:          { icon: ShoppingBag,   color: 'text-indigo-400',  bg: 'bg-indigo-500/10',    border: 'border-indigo-500/20' },
    ORDER_READY:        { icon: ChefHat,       color: 'text-emerald-400', bg: 'bg-emerald-500/10',   border: 'border-emerald-500/20' },
    ready:              { icon: ChefHat,       color: 'text-emerald-400', bg: 'bg-emerald-500/10',   border: 'border-emerald-500/20' },
    PAYMENT_SUCCESS:    { icon: CheckCircle2,  color: 'text-blue-400',    bg: 'bg-blue-500/10',      border: 'border-blue-500/20' },
    ORDER_CANCELLED:    { icon: X,             color: 'text-rose-400',    bg: 'bg-rose-500/10',      border: 'border-rose-500/20' },
    OFFER_ANNOUNCEMENT: { icon: Megaphone,     color: 'text-amber-400',   bg: 'bg-amber-500/10',     border: 'border-amber-500/20' },
    SYSTEM_ALERT:       { icon: AlertTriangle, color: 'text-yellow-400',  bg: 'bg-yellow-500/10',    border: 'border-yellow-500/20' },
    WAITER_REQUEST:     { icon: Bell,          color: 'text-orange-400',  bg: 'bg-orange-500/10',    border: 'border-orange-500/20' },
};

const NotificationToast = () => {
    const { toasts, removeToast } = useContext(NotificationContext);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-2 pointer-events-none w-auto max-w-[90vw]">
            {toasts.map((toast) => {
                const config = typeConfig[toast.type] || typeConfig.SYSTEM_ALERT;
                const Icon = config.icon;

                return (
                    <div 
                        key={toast._id}
                        className={`pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full border ${config.border} bg-black/80 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.4)] border-white/5 animate-in slide-in-from-top-4 fade-in duration-300 overflow-hidden relative group`}
                    >
                        {/* Status Icon */}
                        <div className={`flex items-center justify-center shrink-0`}>
                            <Icon size={16} className={config.color} />
                        </div>
                        
                        <div className="flex flex-col min-w-0 pr-1">
                            <h4 className="text-[11px] font-black text-white/90 uppercase tracking-widest leading-none">
                                {toast.title || 'Alert'}
                            </h4>
                            <p className="text-[10px] text-white/50 font-bold truncate max-w-[200px] sm:max-w-[300px] mt-0.5">
                                {toast.message}
                            </p>
                        </div>

                        {/* Dismissal Button */}
                        <button 
                            onClick={() => removeToast(toast._id)}
                            className="p-1 text-white/20 hover:text-white transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default NotificationToast;
