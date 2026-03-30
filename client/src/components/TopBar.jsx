import { memo } from 'react';
import NotificationBell from './NotificationBell';

const TopBar = memo(() => {

    return (
        <header
            className="sticky top-0 z-30 flex flex-col justify-center min-h-[64px] md:h-[68px] border-b border-[var(--theme-border)] flex-shrink-0 pt-safe transition-all"
            style={{ backgroundColor: 'var(--theme-topbar-bg)', backdropFilter: 'blur(12px)' }}
        >
            {/* ── Main row ── */}
            <div className="flex items-center w-full px-3 md:px-4 gap-3 h-[54px] md:h-full">

                {/* Portal — page injects filter pills / action buttons here */}
                <div id="topbar-portal" className="flex-1 flex items-center justify-start overflow-hidden min-w-0" />

                {/* Right side: bell only */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                    <NotificationBell />
                </div>
            </div>

            {/* ── Mobile row 2: page actions injected by pages ── */}
            <div id="topbar-portal-row2" className="flex md:hidden items-center w-full pb-2 gap-2 px-3" />
        </header>
    );
});

export default TopBar;
