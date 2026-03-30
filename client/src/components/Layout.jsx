import { useState, useContext, useCallback, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

/**
 * Responsive Layout
 *
 * Mobile  (<768px):  No sidebar. Full-width content + BottomNav bar.
 *                    Hamburger opens slide-in Drawer.
 * Tablet  (768-1024): Desktop-like: collapsible sidebar (icon-only), no BottomNav.
 *                     Hamburger toggles sidebar expand/collapse.
 * Desktop (1025px+): Permanent full sidebar, no BottomNav.
 */
const Layout = () => {
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();

    // Controls whether the sidebar drawer is open on mobile
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Check initial window width to determine if sidebar should be collapsed
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1025);
    // User requested "Default Off" for sidebar across all pages
    const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth >= 768);

    const openDrawer = useCallback(() => {
        setDrawerOpen(true);
        document.body.classList.add('drawer-open');
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
        document.body.classList.remove('drawer-open');
    }, []);

    // On mobile: open sidebar drawer. On tablet/desktop: toggle sidebar collapse.
    const handleMenuClick = useCallback(() => {
        if (isMobile) {
            openDrawer();
        } else {
            setSidebarCollapsed(c => {
                const next = !c;
                window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: next } }));
                return next;
            });
        }
    }, [isMobile, openDrawer]);

    // Resize listener for state updates — debounced to avoid excessive re-renders
    useEffect(() => {
        let resizeTimer;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const width = window.innerWidth;
                const tabletRange = width >= 768 && width < 1025;
                setIsMobile(width < 768);
                setIsTablet(tabletRange);

                if (width >= 1025) {
                    closeDrawer();
                    // Do not force expanded on desktop, keep user preference or default to collapsed
                } else if (tabletRange) {
                    setSidebarCollapsed(true);
                } else {
                    // Mobile
                    setSidebarCollapsed(false);
                }
            }, 100);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimer);
        };
    }, [closeDrawer]);

    // ── Auth Guards ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-dynamic-screen" style={{ backgroundColor: 'var(--theme-bg-dark)' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[var(--theme-text-muted)] text-sm font-medium tracking-wide">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex h-dynamic-screen text-[var(--theme-text-main)] font-sans overflow-hidden" style={{ backgroundColor: 'var(--theme-bg-dark)' }}>

            {/* ── Mobile: Overlay backdrop when drawer open ─────── */}
            {drawerOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                    onClick={closeDrawer}
                    aria-hidden="true"
                />
            )}

            {/* ── Sidebar ───────────────────────────────────────────────── */}
            {/*
             * Mobile (<768):  hidden by default, slides in as drawer
             * Tablet (768-1024): collapsible sidebar (default icon-only)
             * Desktop (1025+): permanent sidebar
             */}
            <aside
                className={`
                    fixed top-0 left-0 h-full z-50
                    transition-all duration-300 ease-in-out
                    ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0 md:relative md:flex-shrink-0
                    w-72 md:w-auto
                `}
                style={{
                    width: isMobile ? '288px' : (sidebarCollapsed ? '80px' : '288px'),
                }}
            >
                <Sidebar
                    collapsed={isMobile ? false : sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(c => {
                        const next = !c;
                        window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: next } }));
                        return next;
                    })}
                    onClose={closeDrawer}
                />
            </aside>

            {/* ── Main Content Area ────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Bar with hamburger menu trigger - Hidden for Admins to provide more screen space */}
                {user.role !== 'admin' && (
                    <TopBar onMenuClick={handleMenuClick} sidebarCollapsed={sidebarCollapsed} />
                )}

                {/* Content Area */}
                <main className={`flex-1 flex flex-col overflow-x-hidden pt-safe pb-4 md:pb-0 ${location.pathname === '/dine-in' || location.pathname === '/take-away' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                    {/* Floating Mobile Trigger for Admins only - Premium White Glassmorphism */}
                    {isMobile && user.role === 'admin' && (
                        <div className="fixed top-4 left-4 z-[60] animate-fade-in">
                            <button
                                onClick={handleMenuClick}
                                className="w-12 h-12 bg-white/90 text-slate-800 rounded-2xl shadow-2xl flex items-center justify-center border border-[var(--theme-border)] backdrop-blur-xl active:scale-90 transition-all shadow-black/20"
                            >
                                <Menu size={20} strokeWidth={3} />
                            </button>
                        </div>
                    )}
                    <div
                        className="w-full flex-1 flex flex-col animate-fade-in max-w-[1600px] mx-auto overflow-x-hidden min-h-0"
                        style={{ paddingInline: 'var(--content-px)' }}
                    >
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;

