import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LogOut, LayoutDashboard, Monitor, Utensils, ChefHat,
    Layers, Coffee, Settings, ClipboardList, ChevronLeft,
    ChevronRight, X, TrendingUp, Bell, History, XCircle, CheckCircle2, Armchair
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
                    w-full flex items-center rounded-xl transition-all duration-200 group relative tap-scale
                    ${collapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-4 py-3'}
                    ${active
                        ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/5 text-[var(--theme-text-main)] border-l-4 border-orange-500'
                        : 'hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] border-l-4 border-transparent'
                    }
                `}
            >
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
        <div className="px-4 pt-5 pb-1.5 text-[9px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-widest">
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
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className={`flex items-center border-b border-[var(--theme-border)] flex-shrink-0 pt-safe relative h-[70px] justify-center`}>
                
                {/* Centered Logo & Brand Group */}
                <div
                    onClick={() => handleNav('/')}
                    className={`flex items-center cursor-pointer group ${collapsed ? '' : 'space-x-3'}`}
                >
                    <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-sm border border-[var(--theme-border)] group-hover:scale-105 group-hover:shadow-md transition-all">
                        <img src={logoImg} alt="KAGSZO" className="w-full h-full object-contain" />
                    </div>

                    {!collapsed && (
                        <div className="flex flex-col justify-center text-left">
                            <h1 className="text-[13px] sm:text-sm font-black tracking-widest text-[var(--theme-text-main)] truncate leading-tight uppercase">
                                KAGZSO
                            </h1>
                            <p className="text-[8px] sm:text-[9px] text-[var(--theme-text-subtle)] font-bold uppercase tracking-widest mt-0.5">
                                Management
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
                <div className="px-4 py-3 flex-shrink-0">
                    <div className="bg-[var(--theme-bg-muted)] rounded-xl p-3 border border-[var(--theme-border)] flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 ring-2 ring-[var(--theme-bg-dark)]">
                            {user.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[var(--theme-text-main)] truncate">{user.username}</p>
                            <p className="text-xs text-orange-400 font-medium capitalize truncate">{user.role}</p>
                        </div>
                    </div>
                </div>
            )}

            {collapsed && (
                <div className="flex justify-center py-3 flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold">
                        {user.username?.charAt(0).toUpperCase()}
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
                        <NavItem to="/admin/notifications" icon={Bell} label="Notifications" color="text-orange-400" />
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
                                <NavItem to="/waiter" icon={Utensils} label="Waiter Mode" color="text-pink-400" />
                                <NavItem to="/waiter/working-process" icon={ClipboardList} label="Working Process" color="text-blue-400" />
                                <NavItem to="/waiter/kitchen-view" icon={ChefHat} label="Kitchen View" color="text-orange-400" />
                                <NavItem to="/waiter/history" icon={History} label="Order History" color="text-purple-400" />
                            </>
                        )}
                    </>
                )}
            </nav>

            {/* ── Collapse Toggle (Desktop only) ──────────────────────── */}
            {onToggleCollapse && (
                <button
                    onClick={onToggleCollapse}
                    className="hidden md:flex items-center justify-center p-4 border-t border-b border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-[var(--theme-bg-hover)] transition-all duration-200 active:scale-95 flex-shrink-0 relative overflow-hidden"
                    title={collapsed ? 'Expand' : 'Collapse'}
                >
                    <div className={`flex items-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${collapsed ? 'scale-110' : 'scale-100'}`}>
                        {collapsed ? (
                            /* >> collapsed — RED flowing arrows */
                            <div className="flex items-center text-rose-500">
                                <ChevronRight size={20} strokeWidth={3} className="animate-chevron-r1" />
                                <ChevronRight size={20} strokeWidth={3} className="-ml-3 opacity-60 animate-chevron-r2" />
                                <ChevronRight size={20} strokeWidth={3} className="-ml-3 opacity-30 animate-chevron-r3" />
                            </div>
                        ) : (
                            /* << expanded — BLUE flowing arrows */
                            <div className="flex items-center text-blue-500">
                                <ChevronLeft size={20} strokeWidth={3} className="animate-chevron-1" />
                                <ChevronLeft size={20} strokeWidth={3} className="-ml-3 opacity-60 animate-chevron-2" />
                                <ChevronLeft size={20} strokeWidth={3} className="-ml-3 opacity-30 animate-chevron-3" />
                            </div>
                        )}
                    </div>
                </button>
            )}


            {/* ── Theme Switcher ───────────────────────────────────────── */}
            <div className={`px-3 pb-1 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
                <ThemeSwitcher collapsed={collapsed} />
            </div>

            {/* ── Sign Out ─────────────────────────────────────────────── */}
            <div className={`p-3 border-t border-[var(--theme-border)] flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
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

