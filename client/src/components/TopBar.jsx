import { memo, useContext } from 'react';
import { Menu } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { AuthContext } from '../context/AuthContext';

const TopBar = memo(({ onMenuClick }) => {
    const { user } = useContext(AuthContext);

    return (
        <header
            className="sticky top-0 z-30 flex flex-col justify-center min-h-[64px] md:h-[68px] border-b border-[var(--theme-border)] flex-shrink-0 pt-safe transition-all"
            style={{ backgroundColor: 'var(--theme-topbar-bg)', backdropFilter: 'blur(12px)' }}
        >
            {/* ── Main row ── */}
            <div className="flex items-center w-full px-3 md:px-4 gap-3 h-[54px] md:h-full">
                {/* Hamburger Trigger (Mobile/Tablet) */}
                <button
                    onClick={onMenuClick}
                    className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] transition-all active:scale-95 shadow-sm"
                >
                    <Menu size={20} strokeWidth={2.5} />
                </button>

                {/* Portal — page injects filter pills / action buttons here */}
                <div id="topbar-portal" className="flex-1 flex items-center justify-start overflow-hidden min-w-0" />

                {/* Right side: bell only for OPERATORS (Waiters/Kitchen) */}
                {user?.role !== 'admin' && (
                    <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                        <NotificationBell />
                    </div>
                )}
            </div>

            {/* ── Mobile/Tablet row 2: page actions injected by pages ── */}
            <div id="topbar-portal-row2" className="flex lg:hidden items-center w-full pb-2 gap-2 px-3 empty:hidden" />
        </header>
    );
});

export default TopBar;
