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
    const [heroVisible, setHeroVisible] = useState(() =>
        sessionStorage.getItem('loginView') !== 'form'
    );
    const [transitioning, setTransitioning] = useState(false);
    const { user, login, loading, settings, serverStatus } = useContext(AuthContext);
    const navigate = useNavigate();

    // If user is already logged in, redirect to their dashboard
    useEffect(() => {
        if (!loading && user) {
            navigate(getDashboardPath(user.role), { replace: true });
        }
    }, [user, loading, navigate]);

    const handleSignIn = () => {
        setTransitioning(true);
        setTimeout(() => {
            setTransitioning(false);
            setHeroVisible(false);
            sessionStorage.setItem('loginView', 'form');
        }, 2400);
    };

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

    /* ── Cinematic transition loader ── */
    if (transitioning) {
        const ORBIT_DOTS = [
            { angle: 0,   size: 7, speed: '3s',  opacity: 1,    color: '#FF6B35' },
            { angle: 60,  size: 5, speed: '3s',  opacity: 0.7,  color: '#ff9f6b' },
            { angle: 120, size: 8, speed: '3s',  opacity: 0.9,  color: '#dc2626' },
            { angle: 180, size: 4, speed: '3s',  opacity: 0.5,  color: '#FF6B35' },
            { angle: 240, size: 6, speed: '3s',  opacity: 0.8,  color: '#ff9f6b' },
            { angle: 300, size: 5, speed: '3s',  opacity: 0.6,  color: '#dc2626' },
        ];
        return (
            <>
                <style>{`
                    @keyframes kz-bg-breathe {
                        0%,100% { opacity:.5; transform:scale(1); }
                        50%      { opacity:1;  transform:scale(1.18); }
                    }
                    @keyframes kz-grid-drift {
                        0%   { background-position: 0 0; }
                        100% { background-position: 40px 40px; }
                    }
                    @keyframes kz-sonar {
                        0%   { transform:translate(-50%,-50%) scale(.3); opacity:.9; }
                        100% { transform:translate(-50%,-50%) scale(3.2); opacity:0; }
                    }
                    @keyframes kz-ring-cw {
                        from { transform:rotate(0deg); }
                        to   { transform:rotate(360deg); }
                    }
                    @keyframes kz-ring-ccw {
                        from { transform:rotate(0deg); }
                        to   { transform:rotate(-360deg); }
                    }
                    @keyframes kz-orb-glow {
                        0%,100% { box-shadow:0 0 30px 8px rgba(255,107,53,.45),0 0 70px 20px rgba(255,107,53,.15),inset 0 0 20px rgba(255,150,80,.3); }
                        50%     { box-shadow:0 0 55px 18px rgba(255,107,53,.7),0 0 120px 45px rgba(255,107,53,.28),inset 0 0 30px rgba(255,180,100,.5); }
                    }
                    @keyframes kz-icon-pop {
                        0%   { transform:scale(0) rotate(-200deg); opacity:0; }
                        65%  { transform:scale(1.25) rotate(12deg); opacity:1; }
                        80%  { transform:scale(.92) rotate(-5deg); }
                        100% { transform:scale(1) rotate(0deg); opacity:1; }
                    }
                    @keyframes kz-orbit {
                        from { transform:rotate(var(--start)) translateX(80px) rotate(calc(-1*var(--start))); }
                        to   { transform:rotate(calc(var(--start) + 360deg)) translateX(80px) rotate(calc(-1*(var(--start)+360deg))); }
                    }
                    @keyframes kz-dot-pulse {
                        0%,100% { transform:scale(1); opacity:.6; }
                        50%     { transform:scale(1.7); opacity:1; }
                    }
                    @keyframes kz-shimmer {
                        0%   { background-position:-400% center; }
                        100% { background-position:400% center; }
                    }
                    @keyframes kz-title-in {
                        0%   { opacity:0; letter-spacing:.6em; filter:blur(8px); }
                        100% { opacity:1; letter-spacing:.22em; filter:blur(0); }
                    }
                    @keyframes kz-sub-in {
                        0%   { opacity:0; transform:translateY(12px); }
                        100% { opacity:.55; transform:translateY(0); }
                    }
                    @keyframes kz-bounce-dot {
                        0%,80%,100% { transform:translateY(0) scale(1); opacity:.4; }
                        40%         { transform:translateY(-10px) scale(1.3); opacity:1; }
                    }
                    @keyframes kz-bar {
                        0%  { width:0%;   }
                        15% { width:22%;  }
                        40% { width:48%;  }
                        70% { width:74%;  }
                        90% { width:91%;  }
                        100%{ width:100%; }
                    }
                    @keyframes kz-bar-glow {
                        0%,100% { box-shadow:0 0 6px rgba(255,107,53,.5); }
                        50%     { box-shadow:0 0 18px rgba(255,107,53,.9),0 0 32px rgba(255,107,53,.4); }
                    }
                    @keyframes kz-corner-spin {
                        from { transform:rotate(0deg); }
                        to   { transform:rotate(360deg); }
                    }
                    @keyframes kz-sweep {
                        0%   { transform:translateX(-100%); }
                        100% { transform:translateX(200%); }
                    }
                `}</style>

                {/* ── Root ── */}
                <div style={{
                    position:'fixed', inset:0, zIndex:9999,
                    background:'radial-gradient(ellipse at 50% 40%, #0f1a30 0%, #020817 100%)',
                    display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center',
                    overflow:'hidden',
                }}>

                    {/* Animated grid mesh */}
                    <div style={{
                        position:'absolute', inset:0, opacity:.06,
                        backgroundImage:'linear-gradient(rgba(255,107,53,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,107,53,.6) 1px,transparent 1px)',
                        backgroundSize:'40px 40px',
                        animation:'kz-grid-drift 4s linear infinite',
                    }} />

                    {/* Ambient radial glow */}
                    <div style={{
                        position:'absolute', top:'50%', left:'50%',
                        transform:'translate(-50%,-50%)',
                        width:'520px', height:'520px', borderRadius:'50%',
                        background:'radial-gradient(circle, rgba(255,107,53,.14) 0%, transparent 72%)',
                        animation:'kz-bg-breathe 2.4s ease-in-out infinite',
                        pointerEvents:'none',
                    }} />

                    {/* Sonar pulses */}
                    {[0, 0.6, 1.2].map((delay, i) => (
                        <div key={i} style={{
                            position:'absolute', top:'50%', left:'50%',
                            width:'110px', height:'110px', borderRadius:'50%',
                            border:`${i === 0 ? 2 : 1.5}px solid rgba(255,107,53,${i === 0 ? .8 : .5})`,
                            animation:`kz-sonar 2.4s ${delay}s cubic-bezier(.2,.8,.4,1) infinite`,
                        }} />
                    ))}

                    {/* Outer dashed ring — slow CW */}
                    <div style={{
                        position:'absolute',
                        width:'190px', height:'190px', borderRadius:'50%',
                        border:'1.5px dashed rgba(255,107,53,.25)',
                        animation:'kz-ring-cw 12s linear infinite',
                    }} />

                    {/* Mid ring — medium CCW */}
                    <div style={{
                        position:'absolute',
                        width:'155px', height:'155px', borderRadius:'50%',
                        border:'2px solid transparent',
                        borderTopColor:'rgba(255,107,53,.7)',
                        borderRightColor:'rgba(255,107,53,.2)',
                        borderBottomColor:'rgba(220,38,38,.4)',
                        animation:'kz-ring-ccw 2.2s linear infinite',
                    }} />

                    {/* Inner ring — fast CW */}
                    <div style={{
                        position:'absolute',
                        width:'122px', height:'122px', borderRadius:'50%',
                        border:'2.5px solid transparent',
                        borderTopColor:'#FF6B35',
                        borderLeftColor:'rgba(255,107,53,.35)',
                        animation:'kz-ring-cw 1s linear infinite',
                    }} />

                    {/* Orbiting satellite dots */}
                    <div style={{ position:'absolute', width:'160px', height:'160px', borderRadius:'50%' }}>
                        {ORBIT_DOTS.map((d, i) => (
                            <div key={i} style={{
                                position:'absolute', top:'50%', left:'50%',
                                '--start': `${d.angle}deg`,
                                width:`${d.size}px`, height:`${d.size}px`,
                                marginTop:`-${d.size/2}px`, marginLeft:`-${d.size/2}px`,
                                borderRadius:'50%',
                                background:d.color,
                                opacity:d.opacity,
                                boxShadow:`0 0 ${d.size*2}px ${d.color}`,
                                animation:`kz-orbit ${d.speed} ${(i*0.08).toFixed(2)}s linear infinite`,
                            }} />
                        ))}
                    </div>

                    {/* Central glowing orb */}
                    <div style={{
                        position:'relative', zIndex:2,
                        width:'88px', height:'88px', borderRadius:'50%',
                        background:'radial-gradient(circle at 38% 32%, #ff9a5c, #FF6B35 45%, #c62828)',
                        animation:'kz-orb-glow 2s ease-in-out infinite',
                        display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                        {/* Glare highlight */}
                        <div style={{
                            position:'absolute', top:'14%', left:'18%',
                            width:'32%', height:'22%', borderRadius:'50%',
                            background:'rgba(255,255,255,0.35)',
                            filter:'blur(4px)',
                        }} />
                        {/* Icon */}
                        <span style={{
                            fontSize:'34px', lineHeight:1, userSelect:'none',
                            animation:'kz-icon-pop .7s .15s cubic-bezier(.34,1.56,.64,1) both',
                        }}>🍽️</span>
                    </div>

                    {/* Text block */}
                    <div style={{ marginTop:'48px', textAlign:'center', position:'relative', zIndex:2 }}>
                        {/* Brand name shimmer */}
                        <h2 style={{
                            margin:0, fontSize:'26px', fontWeight:900,
                            textTransform:'uppercase',
                            background:'linear-gradient(90deg,#ff6b35 0%,#fff 30%,#FF6B35 50%,#fff 70%,#ff6b35 100%)',
                            backgroundSize:'400% auto',
                            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                            animation:'kz-shimmer 2.4s linear infinite, kz-title-in .7s .2s ease both',
                        }}>KAGZSO</h2>

                        {/* Subtitle */}
                        <p style={{
                            margin:'8px 0 0', fontSize:'11px', fontWeight:600,
                            color:'rgba(255,255,255,0.55)', letterSpacing:'.18em',
                            textTransform:'uppercase',
                            animation:'kz-sub-in .6s .5s ease both',
                        }}>Smart Kitchen System</p>

                        {/* Bouncing dots */}
                        <div style={{ display:'flex', gap:'7px', justifyContent:'center', marginTop:'18px' }}>
                            {[0, .18, .36].map((delay, i) => (
                                <div key={i} style={{
                                    width:'7px', height:'7px', borderRadius:'50%',
                                    background:'#FF6B35',
                                    animation:`kz-bounce-dot 1.1s ${delay}s ease-in-out infinite`,
                                }} />
                            ))}
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{
                        position:'absolute', bottom:'44px',
                        width:'220px', height:'3px', borderRadius:'999px',
                        background:'rgba(255,255,255,0.08)', overflow:'visible',
                    }}>
                        <div style={{
                            height:'100%', borderRadius:'999px',
                            background:'linear-gradient(90deg,#dc2626,#FF6B35,#ffb347)',
                            animation:`kz-bar 2.4s cubic-bezier(.4,0,.2,1) forwards, kz-bar-glow 1.2s ease-in-out infinite`,
                            position:'relative', overflow:'hidden',
                        }}>
                            {/* Sweep shine on bar */}
                            <div style={{
                                position:'absolute', inset:0, top:'-2px', bottom:'-2px',
                                background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,.55) 50%,transparent 100%)',
                                animation:'kz-sweep 1.6s .3s ease-in-out infinite',
                            }} />
                        </div>
                    </div>

                    {/* Corner decorations */}
                    {[
                        { top:18, left:18, r:'0deg' },
                        { top:18, right:18, r:'90deg' },
                        { bottom:18, right:18, r:'180deg' },
                        { bottom:18, left:18, r:'270deg' },
                    ].map((pos, i) => (
                        <div key={i} style={{
                            position:'absolute', ...pos,
                            width:'28px', height:'28px',
                            borderTop:'2px solid rgba(255,107,53,.4)',
                            borderLeft:'2px solid rgba(255,107,53,.4)',
                            animation:`kz-corner-spin ${6 + i}s linear infinite`,
                            transformOrigin:'center',
                        }} />
                    ))}
                </div>
            </>
        );
    }

    /* ── Show hero only ── */
    if (heroVisible) {
        return <HeroSection onSignIn={handleSignIn} />;
    }

    return (
        <div className="flex flex-col min-h-[100dvh] bg-[#f8fafc] dark:bg-[#0a0f1e] relative overflow-y-auto overflow-x-hidden px-4">

            {/* Background Effects - Clean 'Light White Grey' Aesthetic */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                {/* Modern Studio Mesh (Light) */}
                <div className="absolute inset-0 bg-gradient-to-br from-white via-[#f1f5f9] to-[#f8fafc] dark:from-[#0a0f1e] dark:via-[#0f172a] dark:to-[#1a2744]"></div>
                
                {/* Soft Ambient Gloom (Light) */}
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-500/[0.04] dark:bg-blue-500/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-orange-500/[0.03] dark:bg-orange-500/10 rounded-full blur-[100px]"></div>
                
                {/* Subtle Texture for Premium Feel */}
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
            </div>

            {/* Main Content (Centered) */}
            <div className="flex-1 flex flex-col items-center justify-center py-12 z-10 w-full">
                {/* Logo Section */}
                <div className="mb-8 flex flex-col items-center animate-fade-in-down px-4 text-center">
                    {/* Back to hero */}
                    <button
                        onClick={() => { sessionStorage.removeItem('loginView'); setHeroVisible(true); }}
                        className="mb-4 flex items-center gap-1.5 text-slate-500 dark:text-white/50 hover:text-orange-500 text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                    >
                        ← Back to home
                    </button>
                    {/* Logo + Name Section */}
                    <div className="flex flex-col items-center gap-2 mb-2 animate-fade-in-down">
                        <div className="flex items-center gap-4 group">
                            {/* Logo Icon Left */}
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-blue-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl bg-white/40 dark:bg-white/5 backdrop-blur-sm p-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-slate-200 dark:border-white/10 overflow-hidden">
                                    <img src={logoImg} alt="KAGZSO" className="w-[85%] h-[85%] object-contain" />
                                </div>
                            </div>
                            {/* Name Title Right */}
                            <div className="flex flex-col">
                                <h1 className="text-3xl sm:text-4xl font-[950] text-slate-950 dark:text-white tracking-[0.15em] uppercase leading-none">{settings?.restaurantName || 'KAGZSO'}</h1>
                                <div className="h-0.5 w-full bg-gradient-to-r from-orange-500/40 via-blue-500/40 to-transparent mt-1.5 rounded-full"></div>
                            </div>
                        </div>
                        {/* Subheader below the row */}
                        <p className="text-[9px] sm:text-[11px] text-slate-500 dark:text-white/60 font-bold tracking-[0.2em] uppercase mt-2">Smart POS & Kitchen Management</p>
                    </div>

                    {/* System Status */}
                    <div className="mt-2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-sm shadow-sm scale-90 sm:scale-100">
                        <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-white/70">
                            {serverStatus === 'online' ? 'System Online' : 'Connecting...'}
                        </span>
                    </div>
                </div>

                {/* Login Card */}
                <div className="w-full max-w-[calc(100%-1rem)] sm:max-w-md bg-white dark:bg-[#111827]/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] dark:shadow-2xl border border-white dark:border-white/10 animate-fade-in-up">
                    <div className="mb-6 sm:mb-8 text-center sm:text-left font-serif">
                        <h2 className="text-3xl sm:text-3xl font-[800] text-slate-900 dark:text-white mb-2 tracking-tight font-sans">Welcome back</h2>
                        <p className="text-slate-500 dark:text-white/50 text-xs sm:text-[13px] font-medium tracking-wide font-sans">Sign in to your account to continue</p>
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

            {/* Footer Removed per request */}

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

