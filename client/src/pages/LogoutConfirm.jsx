import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, X, ShieldAlert, ArrowLeft } from 'lucide-react';

const LogoutConfirm = () => {
    const { logout, user } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-[var(--theme-bg-dark)] p-6 flex flex-col items-center justify-center animate-fade-in pb-32">
            <div className="w-full max-w-sm space-y-8 text-center">
                
                {/* Visual Group */}
                <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30 flex items-center justify-center animate-pulse-slow">
                        <LogOut size={44} className="text-rose-500" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center border-4 border-[var(--theme-bg-dark)] shadow-lg">
                        <ShieldAlert size={14} className="text-white" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-[var(--theme-text-main)] uppercase tracking-tighter">
                        Sign Out?
                    </h1>
                    <p className="text-sm text-[var(--theme-text-muted)] font-medium max-w-[240px] mx-auto">
                        Are you sure you want to exit your <span className="text-orange-400 font-bold uppercase">{user?.role}</span> session?
                    </p>
                </div>

                {/* Actions Group */}
                <div className="space-y-3 pt-6">
                    <button
                        onClick={handleLogout}
                        className="w-full h-14 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <LogOut size={20} strokeWidth={3} />
                        Confirm Logout
                    </button>
                    
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full h-14 bg-[var(--theme-bg-card)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] rounded-2xl font-black uppercase tracking-widest border border-[var(--theme-border)] transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <ArrowLeft size={18} strokeWidth={3} />
                        Go Back
                    </button>
                </div>

                <div className="pt-8 opacity-20 flex flex-col items-center gap-2">
                    <div className="w-10 h-1 bg-[var(--theme-border)] rounded-full" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em]">KAGZSO Secure Exit</p>
                </div>
            </div>
        </div>
    );
};

export default LogoutConfirm;
