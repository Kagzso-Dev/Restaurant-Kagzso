import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';

const DEFAULT_CATEGORY_IMAGES = {
    'Starters': '/images/starters.png',
    'Main Course': '/images/main-course.png',
    'Beverages': '/images/beverages.png',
};
const DEFAULT_FOOD_IMAGE = '/images/main-course.png';

// ── Module-level cache (persists across route navigations) ────────────────
const _cache = {
    items: null,
    categories: null,
    fetchedAt: 0,
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let _pendingFetch = null; // Deduplicate concurrent fetches

/**
 * useMenuData
 *
 * Shared hook for fetching menu items + categories with an in-memory cache.
 * Returns cached data instantly on repeat visits (no loading spinner).
 * Keeps data fresh via socket events in real-time.
 *
 * Used by: Waiter/DineIn, Waiter/TakeAway
 */
const useMenuData = () => {
    const { socket } = useContext(AuthContext);

    const isCacheFresh =
        _cache.items !== null && Date.now() - _cache.fetchedAt < CACHE_TTL;

    const [menuItems, setMenuItems] = useState(_cache.items || []);
    const [categories, setCategories] = useState(_cache.categories || []);
    const [loading, setLoading] = useState(!isCacheFresh);

    // ── Initial fetch (skipped when cache is fresh) ──────────────────────
    useEffect(() => {
        if (isCacheFresh) return;

        let mounted = true;

        if (!_pendingFetch) {
            _pendingFetch = Promise.all([
                api.get('/api/menu'),
                api.get('/api/categories'),
            ])
                .then(([menuRes, catRes]) => {
                    _cache.categories = catRes.data;
                    
                    // Apply code-level default fallback images to menu items if missing
                    _cache.items = menuRes.data.map(item => {
                        if (!item.image || item.image.trim() === '') {
                            const catName = item.category?.name?.trim() || '';
                            item.image = DEFAULT_CATEGORY_IMAGES[catName] || DEFAULT_FOOD_IMAGE;
                        }
                        return item;
                    });
                    
                    _cache.fetchedAt = Date.now();
                })
                .catch(err => {
                    console.error('useMenuData:', err);
                    if (!_cache.items) _cache.items = [];
                    if (!_cache.categories) _cache.categories = [];
                })
                .finally(() => {
                    _pendingFetch = null;
                });
        }

        _pendingFetch.then(() => {
            if (!mounted) return;
            setMenuItems([..._cache.items]);
            setCategories([..._cache.categories]);
            setLoading(false);
        });

        return () => {
            mounted = false;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Real-time socket sync ────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const onMenuUpdated = ({ action, item, id }) => {
            if (action === 'create' && item) {
                if (item.availability) {
                    if (!item.image || item.image.trim() === '') {
                        const catName = item.category?.name?.trim() || '';
                        item.image = DEFAULT_CATEGORY_IMAGES[catName] || DEFAULT_FOOD_IMAGE;
                    }
                    setMenuItems(prev => {
                        if (prev.find(i => i._id === item._id)) return prev;
                        const next = [...prev, item];
                        _cache.items = next;
                        return next;
                    });
                }
            } else if (action === 'update' && item) {
                if (!item.image || item.image.trim() === '') {
                    const catName = item.category?.name?.trim() || '';
                    item.image = DEFAULT_CATEGORY_IMAGES[catName] || DEFAULT_FOOD_IMAGE;
                }
                setMenuItems(prev => {
                    const exists = prev.find(i => i._id === item._id);
                    let next;
                    if (!item.availability) {
                        next = prev.filter(i => i._id !== item._id);
                    } else {
                        next = exists
                            ? prev.map(i => (i._id === item._id ? item : i))
                            : [...prev, item];
                    }
                    _cache.items = next;
                    return next;
                });
            } else if (action === 'delete' && id) {
                setMenuItems(prev => {
                    const next = prev.filter(i => i._id !== id);
                    _cache.items = next;
                    return next;
                });
            }
        };

        const onCategoryUpdated = ({ action, category, id }) => {
            if (action === 'create' && category) {
                setCategories(prev => {
                    if (prev.find(c => c._id === category._id)) return prev;
                    const next = [...prev, category];
                    _cache.categories = next;
                    return next;
                });
            } else if (action === 'update' && category) {
                setCategories(prev => {
                    const next = prev.map(c =>
                        c._id === category._id ? category : c
                    );
                    _cache.categories = next;
                    return next;
                });
            } else if (action === 'delete' && id) {
                setCategories(prev => {
                    const next = prev.filter(c => c._id !== id);
                    _cache.categories = next;
                    return next;
                });
            }
        };

        socket.on('menu-updated', onMenuUpdated);
        socket.on('category-updated', onCategoryUpdated);
        return () => {
            socket.off('menu-updated', onMenuUpdated);
            socket.off('category-updated', onCategoryUpdated);
        };
    }, [socket]);

    return { menuItems, categories, loading };
};

export default useMenuData;
