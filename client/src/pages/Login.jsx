import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import logoImg from '../assets/logo.png';
import HeroSection from '../components/HeroSection';

// Helper: get dashboard path by role
const getDashboardPath = (role) => {
    switch (role) {

        case 'admin': return '/admin';
        case 'kitchen': return '/kitchen';
        case 'cashier': return '/cashier';
        case 'waiter': return '/waiter';
        default: return '/';
    }
};

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const { user, login, loading, settings, serverStatus } = useContext(AuthContext);
    const navigate = useNavigate();

    // If user is already logged in, redirect to their dashboard
    useEffect(() => {
        if (!loading && user) {
            navigate(getDashboardPath(user.role), { replace: true });
        }
    }, [user, loading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userData = await login(username, password);
            navigate(getDashboardPath(userData.role), { replace: true });
        } catch (err) {
            console.error(err);
            setError(typeof err === 'string' ? err : (err.message || 'Login failed'));
        }
    };

    return (
        <div className="flex flex-col min-h-[100dvh] bg-[var(--theme-bg-dark)] relative overflow-y-auto overflow-x-hidden">
            {/* Hero Section */}
            <HeroSection />

            {/* Login Section Anchor */}
            <div id="login-section" className="px-4">

            {/* Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 -right-32 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl"></div>
            </div>

            {/* Main Content (Centered) */}
            <div className="flex-1 flex flex-col items-center justify-center py-12 z-10 w-full">
                {/* Logo Section */}
                <div className="mb-8 flex flex-col items-center animate-fade-in-down px-4 text-center">
                    {/* Logo + Name Row */}
                    <div className="flex items-center gap-3 mb-2">
                        <div className="relative">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-white/10 p-1 shadow-md">
                                <img src={logoImg} alt="KAGZSO" className="w-full h-full object-contain" />
                            </div>
                        </div>
                        <h1 className="text-xl sm:text-3xl font-black text-[var(--theme-text-main)] tracking-widest uppercase">{settings?.restaurantName || 'KAGZSO'}</h1>
                    </div>
                    <p className="text-[10px] sm:text-sm text-[var(--theme-text-muted)] font-medium tracking-wider uppercase">Smart POS & Kitchen Management</p>
                    <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--theme-bg-muted)] border border-[var(--theme-border)]">
                        <div className={`w-1.5 h-1.5 rounded-full ${serverStatus === 'online' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter text-[var(--theme-text-subtle)]">
                            {serverStatus === 'online' ? 'System Online' : 'Connecting to Server...'}
                        </span>
                    </div>
                </div>

                {/* Login Card */}
                <div className="w-full max-w-[calc(100%-1rem)] sm:max-w-md bg-[var(--theme-bg-card)] p-6 sm:p-8 rounded-2xl shadow-2xl border border-[var(--theme-border)] animate-fade-in-up">
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-xl sm:text-2xl font-bold text-[var(--theme-text-main)] mb-1 sm:mb-2">Welcome back</h2>
                        <p className="text-[var(--theme-text-muted)] text-xs sm:text-sm">Sign in to your account to continue</p>
                    </div>

                    {error && (
                        <div className="p-3 mb-6 text-sm text-red-500 bg-red-500/10 rounded-lg border border-red-500/20 flex items-center">
                            <span className="mr-2">⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" autoComplete="off">
                        <div>
                            <label className="block text-xs font-bold text-[var(--theme-text-subtle)] uppercase mb-2 tracking-wider">Username</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--theme-text-subtle)] group-focus-within:text-orange-500 transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoComplete="off"
                                    className="w-full pl-10 pr-4 py-3 bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-[var(--theme-text-main)] placeholder-[var(--theme-text-subtle)] transition-all outline-none"
                                    placeholder="Enter username"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[var(--theme-text-subtle)] uppercase mb-2 tracking-wider">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--theme-text-subtle)] group-focus-within:text-orange-500 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    className="w-full pl-10 pr-12 py-3 bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-[var(--theme-text-main)] placeholder-[var(--theme-text-subtle)] transition-all outline-none"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--theme-text-subtle)] hover:text-orange-500 transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 sm:py-3.5 px-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] min-h-[44px] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in…</> : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>

            </div>{/* end #login-section */}

            {/* Footer */}
            <div className="py-6 text-center text-[10px] sm:text-xs text-[var(--theme-text-subtle)] z-10 w-full px-4">
                &copy; {new Date().getFullYear()} Kagzso Management System. All rights reserved.
            </div>

            {/* Custom Toast Mockup (Top Right) */}
            <div className="absolute top-6 right-6 bg-[var(--theme-bg-card)] border border-[var(--theme-border)] rounded-lg shadow-xl p-4 flex items-center gap-3 animate-slide-in-right opacity-0 pointer-events-none hidden">
                <CheckCircle size={20} className="text-green-500" />
                <div>
                    <h4 className="text-[var(--theme-text-main)] text-sm font-semibold">System Ready</h4>
                    <p className="text-[var(--theme-text-muted)] text-xs">Connected to server securely.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;

