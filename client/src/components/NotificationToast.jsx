import { useContext } from 'react';
import { NotificationContext } from '../context/NotificationContext';
import { ShoppingBag, ChefHat, CreditCard, X, Bell, AlertTriangle, Megaphone } from 'lucide-react';

const typeConfig = {
    NEW_ORDER:          { icon: ShoppingBag,   color: 'text-indigo-400',  bg: 'bg-indigo-500/10',    border: 'border-indigo-500/20' },
    order:              { icon: ShoppingBag,   color: 'text-indigo-400',  bg: 'bg-indigo-500/10',    border: 'border-indigo-500/20' },
    ORDER_READY:        { icon: ChefHat,       color: 'text-emerald-400', bg: 'bg-emerald-500/10',   border: 'border-emerald-500/20' },
    ready:              { icon: ChefHat,       color: 'text-emerald-400', bg: 'bg-emerald-500/10',   border: 'border-emerald-500/20' },
    PAYMENT_SUCCESS:    { icon: CreditCard,    color: 'text-blue-400',    bg: 'bg-blue-500/10',      border: 'border-blue-500/20' },
    payment:            { icon: CreditCard,    color: 'text-blue-400',    bg: 'bg-blue-500/10',      border: 'border-blue-500/20' },
    ORDER_CANCELLED:    { icon: X,             color: 'text-rose-400',    bg: 'bg-rose-500/10',      border: 'border-rose-500/20' },
    OFFER_ANNOUNCEMENT: { icon: Megaphone,     color: 'text-amber-400',   bg: 'bg-amber-500/10',     border: 'border-amber-500/20' },
    SYSTEM_ALERT:       { icon: AlertTriangle, color: 'text-yellow-400',  bg: 'bg-yellow-500/10',    border: 'border-yellow-500/20' },
    WAITER_REQUEST:     { icon: Bell,            color: 'text-orange-400',  bg: 'bg-orange-500/10',    border: 'border-orange-500/20' },
};

const NotificationToast = () => {
    const { toasts, removeToast } = useContext(NotificationContext);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-[340px]">
            {toasts.map((toast) => {
                const config = typeConfig[toast.type] || typeConfig.SYSTEM_ALERT;
                const Icon = config.icon;

                return (
                    <div 
                        key={toast._id}
                        className={`pointer-events-auto w-full glass-panel p-4 rounded-xl border ${config.border} shadow-2xl animate-toast-in overflow-hidden relative group`}
                    >
                        {/* Progress Bar (Visual dismissal timer) */}
                        <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 w-full" />
                        
                        <div className="flex gap-3 items-start">
                            <div className={`p-2 rounded-lg ${config.bg} ${config.color} shrink-0`}>
                                <Icon size={20} />
                            </div>
                            
                            <div className="flex-1 min-w-0 pr-6">
                                <h4 className="text-sm font-semibold text-white truncate">
                                    {toast.title || 'Notification'}
                                </h4>
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                                    {toast.message}
                                </p>
                            </div>

                            <button 
                                onClick={() => removeToast(toast._id)}
                                className="absolute top-3 right-3 p-1 text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default NotificationToast;
