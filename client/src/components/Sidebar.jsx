import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LogOut, LayoutDashboard, Monitor, Utensils, ChefHat,
    Layers, Coffee, Settings, ClipboardList, ChevronLeft,
    ChevronRight, X, TrendingUp, Bell, History, XCircle, CheckCircle2, Armchair,
    Package, Grid
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import ThemeSwitcher from './ThemeSwitcher';

/**
 * Adaptive Sidebar
 *
 * Props:
 *   collapsed          – boolean (tablet icon-only mode)
 *   onToggleCollapse   – fn to toggle collapsed
 *   onClose            – fn to close drawer on mobile
 */
const Sidebar = ({ collapsed = false, onToggleCollapse, onClose }) => {
    const { user, logout, settings } = useContext(AuthContext);
    const { unreadCount } = useContext(NotificationContext);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    if (!user) return null;

    const isActive = (path) => {
        if (path.includes('?')) return location.pathname + location.search === path;
        return location.pathname === path && !location.search;
    };

    const handleNav = (path) => {
        navigate(path);
        // Close drawer on mobile after navigation
        if (onClose) onClose();
    };

    /* ── NavItem ─────────────────────────────────────────────────────── */
    const NavItem = ({ to, icon: Icon, label, color = 'text-[var(--theme-text-muted)]', badge }) => {
        const active = isActive(to);
        return (
            <button
                onClick={() => handleNav(to)}
                title={collapsed ? label : undefined}
                className={`
                    w-full flex items-center rounded-xl transition-all duration-200 group relative tap-scale overflow-hidden
                    ${collapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-4 py-3'}
                    ${active
                        ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/5 text-[var(--theme-text-main)] font-black'
                        : 'hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                    }
                `}
            >
                {/* Active Indicator Bar - Pure straight bit at the edge of the button */}
                {active && (
                    <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.3)] z-10" />
                )}
                <Icon
                    size={20}
                    className={`flex-shrink-0 transition-colors ${active ? 'text-orange-400' : color} group-hover:text-[var(--theme-text-main)]`}
                />
                {!collapsed && (
                    <span className="font-medium text-sm tracking-wide truncate">{label}</span>
                )}
                {badge && !collapsed && (
                    <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {badge}
                    </span>
                )}
                {/* Tooltip for collapsed mode */}
                {collapsed && (
                    <span className="
                        absolute left-full ml-3 px-2 py-1 bg-[var(--theme-bg-card)] text-[var(--theme-text-main)] text-xs
                        rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100
                        pointer-events-none transition-opacity shadow-lg border border-[var(--theme-border)]
                        z-50
                    ">
                        {label}
                    </span>
                )}
            </button>
        );
    };

    /* ── Section Label ───────────────────────────────────────────────── */
    const SectionLabel = ({ children }) => !collapsed ? (
        <div className="px-4 pt-6 pb-2 text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-[0.15em] opacity-80">
            {children}
        </div>
    ) : (
        <div className="my-2 h-px bg-[var(--theme-border)] mx-3" />
    );

    return (
        <div
            className="h-full text-[var(--theme-text-main)] flex flex-col border-r border-[var(--theme-border)] shadow-sidebar transition-width duration-300 overflow-hidden"
            style={{ backgroundColor: 'var(--theme-sidebar-bg)' }}
        >

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className={`flex items-center border-b border-[var(--theme-border)] flex-shrink-0 pt-safe relative h-[80px] justify-center`}>
                
                {/* Centered Logo & Brand Group */}
                <div
                    onClick={() => handleNav('/')}
                    className={`flex items-center cursor-pointer group ${collapsed ? '' : 'space-x-3'}`}
                >
                    <div className="w-12 h-12 flex-shrink-0 relative group-hover:scale-110 transition-transform duration-300">
                        {/* Hexagonal Blue Background Logo as in image */}
                        <div className="absolute inset-0 bg-[#0ea5e9] [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)] shadow-lg" />
                        <div className="absolute inset-0 flex items-center justify-center text-white text-xl font-black">
                            K
                        </div>
                    </div>

                    {!collapsed && (
                        <div className="flex flex-col justify-center text-left">
                            <h1 className="text-[14px] font-black tracking-widest text-[var(--theme-text-main)] truncate leading-tight uppercase">
                                KAGZSO
                            </h1>
                            <p className="text-[9px] text-[var(--theme-text-subtle)] font-bold uppercase tracking-widest mt-0.5">
                                RESTAURANT
                            </p>
                        </div>
                    )}
                </div>


                {/* Close button – visible only on mobile drawer (<768px) */}
                {!collapsed && onClose && (
                    <button
                        onClick={onClose}
                        className="absolute right-4 md:hidden flex-shrink-0 p-1.5 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] rounded-lg tap-scale"
                        aria-label="Close menu"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* ── User Profile ────────────────────────────────────────── */}
            {!collapsed && (
                <div className="px-5 py-6 flex-shrink-0">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-sm font-black text-white shadow-xl ring-2 ring-white/10 ring-offset-2 ring-offset-[var(--theme-sidebar-bg)]">
                            {user.username?.charAt(0).toUpperCase() || 'W'}
                        </div>
                        <div className="text-center mt-1">
                            <p className="text-xs font-black text-[var(--theme-text-main)] uppercase tracking-tight">{user.username}</p>
                            <p className="text-[9px] text-orange-500 font-bold uppercase tracking-[0.2em] mt-0.5">{user.role}</p>
                        </div>
                    </div>
                </div>
            )}

            {collapsed && (
                <div className="flex justify-center py-6 flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-[#3b82f6] flex items-center justify-center text-sm font-black text-white shadow-lg border-2 border-white/20">
                        {user.username?.charAt(0).toUpperCase() || 'W'}
                    </div>
                </div>
            )}


            {/* ── Navigation ──────────────────────────────────────────── */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-2 pb-2">

                {/* ADMIN LINKS */}
                {user.role === 'admin' && (
                    <>
                        <SectionLabel>Admin Console</SectionLabel>
                        <NavItem to="/admin" icon={LayoutDashboard} label="Dashboard" />
                        <NavItem to="/admin/orders" icon={ClipboardList} label="Orders History" />
                        <NavItem to="/admin/analytics" icon={TrendingUp} label="Analytics" color="text-emerald-400" />
                        <NavItem to="/admin/notifications" icon={Bell} label="Notifications" color="text-orange-400" badge={unreadCount > 0 ? unreadCount : null} />
                        <NavItem to="/admin/menu" icon={Coffee} label="Menu Items" />
                        <NavItem to="/admin/categories" icon={Layers} label="Categories" />
                        {settings?.tableMapEnabled !== false && (
                            <NavItem to="/admin/tables" icon={Armchair} label="Table Map" />
                        )}
                        <SectionLabel>System</SectionLabel>
                        <NavItem to="/admin/settings" icon={Settings} label="Settings" />
                    </>
                )}

                {/* OPERATIONS LINKS */}
                {user.role !== 'admin' && (
                    <>
                        <SectionLabel>Operations</SectionLabel>

                        {user.role === 'kitchen' && (
                            <>
                                <NavItem to="/kitchen?tab=active" icon={ChefHat} label="Active" color="text-orange-400" />
                            </>
                        )}

                        {user.role === 'cashier' && (
                            <>
                                <NavItem to="/cashier" icon={Monitor} label="Cashier Point" color="text-green-400" />
                                <NavItem to="/waiter" icon={Armchair} label="Order View" color="text-yellow-400" />
                                <NavItem to="/cashier/working-process" icon={ClipboardList} label="Working Process" color="text-blue-400" />
                                <NavItem to="/cashier/kitchen-view" icon={ChefHat} label="Kitchen View" color="text-orange-400" />
                            </>
                        )}

                        {user.role === 'waiter' && (
                            <>
                                <NavItem to="/waiter" icon={Grid} label="Dashboard" color="text-orange-500" />
                                <NavItem to="/dine-in" icon={Armchair} label="Table Map" color="text-rose-500" />
                                <NavItem to="/waiter/working-process" icon={ClipboardList} label="Orders" color="text-blue-500" />
                                <NavItem to="/waiter/kitchen-view" icon={ChefHat} label="Kitchen" color="text-emerald-500" />
                                <NavItem to="/waiter/history" icon={History} label="History" color="text-purple-500" />
                            </>
                        )}

                    </>
                )}
            </nav>

            {/* ── Arrows (Expand/Collapse as in image) ──────────────────────── */}
            {onToggleCollapse && (
                <button
                    onClick={onToggleCollapse}
                    className="group flex flex-col items-center justify-center p-4 text-rose-500 opacity-20 hover:opacity-100 transition-all active:scale-90 hover:scale-105"
                    title={collapsed ? 'Expand' : 'Collapse'}
                >

                    <div className="flex items-center group-hover:gap-0.5 transition-all duration-500">
                        <ChevronRight size={16} strokeWidth={4} className="animate-arrow-flow text-rose-500/40" />
                        <ChevronRight size={16} strokeWidth={4} className="-ml-2 animate-arrow-flow delay-200 text-rose-500/60" />
                        <ChevronRight size={16} strokeWidth={4} className="-ml-2 animate-arrow-flow delay-400 text-rose-500" />
                    </div>

                </button>
            )}



            {/* ── Theme Switcher ───────────────────────────────────────── */}
            <div className={`px-4 pb-1 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
                <ThemeSwitcher collapsed={collapsed} />
            </div>

            {/* ── Sign Out ─────────────────────────────────────────────── */}
            <div className={`p-4 border-t border-[var(--theme-border)] flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
                <button
                    onClick={handleLogout}
                    title={collapsed ? 'Sign Out' : undefined}
                    className={`
                        flex items-center justify-center gap-2.5
                        bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white
                        rounded-xl transition-all duration-200 border border-red-500/20
                        group min-h-[44px]
                        ${collapsed ? 'w-11 h-11 p-0' : 'w-full px-4 py-2.5'}
                    `}
                >
                    <LogOut size={17} className="flex-shrink-0 transition-transform group-hover:-translate-x-0.5" />
                    {!collapsed && <span className="font-semibold text-sm">Sign Out</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;

