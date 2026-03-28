import { useContext, useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';

import { AuthContext } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { Search, Menu, X, Loader2, ShoppingBag, RefreshCw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import useDebounce from '../hooks/useDebounce';

/**
 * Responsive TopBar
 * Props:
 *   onMenuClick      – opens sidebar drawer on mobile/tablet
 *   sidebarCollapsed – (unused visually, reserved for breadcrumb logic)
 *
 * Features added:
 *   - Debounced live search (400ms) across orderNumber, customerName, tableNumber
 *   - Results dropdown with keyboard close (Escape)
 *   - Click-outside closes dropdown
 */
const TopBar = memo(({ onMenuClick }) => {
    const { user, formatPrice, serverStatus } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();

    // ── Search state ──────────────────────────────────────────────────────────
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const searchRef = useRef(null);
    const debouncedQuery = useDebounce(query, 400);

    // ── Fetch search results when debounced query changes ─────────────────────
    const fetchSearch = useCallback(async (q) => {
        if (!q || q.length < 2) {
            setResults([]);
            setShowDropdown(false);
            return;
        }
        setSearching(true);
        try {
            const res = await api.get(`/api/orders/search?q=${encodeURIComponent(q)}&limit=10`, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            setResults(res.data.orders || []);
            setShowDropdown(true);
        } catch (err) {
            setResults([]);
        } finally {
            setSearching(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSearch(debouncedQuery);
    }, [debouncedQuery, fetchSearch]);

    // ── Close dropdown on click outside ───────────────────────────────────────
    useEffect(() => {
        const handleClick = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleClearSearch = () => {
        setQuery('');
        setResults([]);
        setShowDropdown(false);
    };

    const handleResultClick = (order) => {
        setShowDropdown(false);
        setQuery('');
        // Navigate with order ID to auto-open details
        navigate(`/${user.role}/orders?id=${order._id || order.id}`);
    };

    // ── Page title helper (memoised — only recomputes on route change) ─────────
    const pageTitle = useMemo(() => {
        const segments = location.pathname.split('/').filter(Boolean);
        if (!segments.length) return 'Dashboard';
        const last = segments[segments.length - 1];
        const titles = {
            admin: 'Dashboard', kitchen: 'Kitchen Display', cashier: 'Cashier Point',
            waiter: user?.role === 'cashier' ? 'Token View' : 'Waiter Mode',
            menu: 'Menu Items', tables: 'Table Map',
            categories: 'Categories', orders: 'Order History', settings: 'Settings',
            'new-order': 'New Order',
            'working-process': 'Working Process', 'kitchen-view': 'Kitchen View',
            'dine-in': 'Dine-In Order', 'take-away': 'Take Away Order',
        };
        return titles[last] || (last.charAt(0).toUpperCase() + last.slice(1));
    }, [location.pathname, user?.role]);

    const isKitchenView = location.pathname.includes('kitchen');

    // Global search disabled per user request
    const showSearch = false;

    // ── Status badge colour helper (stable reference — no deps) ───────────────
    const statusColor = useCallback((status) => {
        const map = {
            completed: 'text-emerald-400', pending: 'text-blue-400',
            preparing: 'text-amber-400', accepted: 'text-indigo-400',
            ready: 'text-teal-400', cancelled: 'text-red-400',
        };
        return map[status] || 'text-[var(--theme-text-muted)]';
    }, []);

    return (
        <header
            className="sticky top-0 z-30 flex flex-col justify-center px-3 md:px-6 min-h-[70px] md:h-[70px] backdrop-blur-md border-b border-[var(--theme-border)] flex-shrink-0 pt-safe transition-all"
            style={{ backgroundColor: 'var(--theme-topbar-bg)' }}
        >
            {/* ── Row 1: always visible ────────────────────────────────── */}
            <div className="flex items-center w-full h-[54px] md:h-full">
                <div id="topbar-portal" className="flex-1 flex items-center justify-start overflow-hidden"></div>
            </div>

            {/* ── Row 2: mobile-only second toolbar row ────────────────── */}
            <div id="topbar-portal-row2" className="flex md:hidden items-center w-full pb-2 gap-2"></div>
        </header>
    );
});

export default TopBar;
