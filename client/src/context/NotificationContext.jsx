import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { socket, user } = useContext(AuthContext);
    
    // ─── State initialization from localStorage ─────────────────────────────
    const [notifications, setNotifications] = useState(() => {
        try {
            const saved = localStorage.getItem('notifications');
            const parsed = saved ? JSON.parse(saved) : [];
            // Auto-expire items older than 24h on initial load
            const dayAgo = Date.now() - 86400000;
            return parsed.filter(n => new Date(n.createdAt).getTime() > dayAgo);
        } catch (e) {
            console.error('[NotificationContext] Failed to load from localStorage:', e);
            return [];
        }
    });

    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState([]);

    // ─── Sound alert (Synthetic Oscillator) ──────────────────────────────────
    const playSound = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
        } catch (e) { /* ignore */ }
    }, []);

    // ─── Persist to localStorage whenever history changes ───────────────────
    useEffect(() => {
        localStorage.setItem('notifications', JSON.stringify(notifications));
        setUnreadCount(notifications.filter(n => !n.isRead).length);
    }, [notifications]);

    // ─── Auto-expiry Timer (Every hour) ─────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            const dayAgo = Date.now() - 86400000;
            setNotifications(prev => prev.filter(n => new Date(n.createdAt).getTime() > dayAgo));
        }, 3600000);
        return () => clearInterval(interval);
    }, []);

    // ─── Actions ────────────────────────────────────────────────────────────
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t._id !== id));
    }, []);

    // ─── Real-time: listen for new notifications ────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (notification) => {
            // 1. Add to history state
            setNotifications(prev => {
                if (prev.find(n => n._id === notification._id)) return prev;
                const updated = [notification, ...prev];
                return updated.slice(0, 50);
            });

            // 2. Add to active toasts (limit 3)
            setToasts(prev => {
                const updated = [...prev, notification];
                return updated.slice(-3);
            });

            // 3. Play sound (if enabled)
            const soundOn = localStorage.getItem('notif_sound') !== 'off';
            if (soundOn) playSound();

            // 4. Auto-dismiss toast
            setTimeout(() => {
                removeToast(notification._id);
            }, 5000);
        };

        socket.on('notification', handleNewNotification);
        return () => socket.off('notification', handleNewNotification);
    }, [socket, playSound, removeToast]);

    // ─── Actions ────────────────────────────────────────────────────────────
    const markAsRead = useCallback((notificationId) => {
        setNotifications(prev => prev.map(n => 
            n._id === notificationId ? { ...n, isRead: true } : n
        ));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const deleteNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n._id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            toasts,
            markAsRead,
            markAllAsRead,
            clearAll,
            deleteNotification,
            removeToast
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
