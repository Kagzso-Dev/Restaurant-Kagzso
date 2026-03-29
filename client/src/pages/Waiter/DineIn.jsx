import { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import {
    Search, ShoppingCart, ArrowLeft, ArrowRight,
    Utensils, ChevronRight, ChevronLeft, SearchX, Trash2, Plus, Minus
} from 'lucide-react';
import TableGrid from '../../components/TableGrid';
import ViewToggle from '../../components/ViewToggle';
import FoodItem from '../../components/FoodItem';

/**
 * Dine-In Order Page
 * Starts directly at table selection. orderType is fixed to 'dine-in'.
 */
const DineIn = () => {
    const { user, formatPrice, settings = {}, socket } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();

    const queryParams = new URLSearchParams(location.search);
    const orderIdFromUrl = queryParams.get('orderId');


    const initialOrderId = location.state?.orderId || orderIdFromUrl;
    const [existingOrderId, setExistingOrderId] = useState(initialOrderId);
    const [isAddingItems, setIsAddingItems] = useState(!!initialOrderId);
    const [step, setStep] = useState(initialOrderId ? 3 : 2); // Start at step 3 if adding to existing order
    const orderType = 'dine-in';
    const [selectedTable, setSelectedTable] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [allCategories, setAllCategories] = useState([]);
    const [cart, setCart] = useState([]);
    const [existingItems, setExistingItems] = useState([]);
    const [originalTotal, setOriginalTotal] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [userInteracted, setUserInteracted] = useState(false);
    const [viewMode, setViewMode] = useState(() => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        if (isMobile && settings?.mobileMenuView) return settings.mobileMenuView;
        return settings?.menuView || 'grid'
    });

    // Sync with global settings
    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        const defaultView = (isMobile && settings?.mobileMenuView) ? settings.mobileMenuView : (settings?.menuView || 'grid');

        if (settings?.enforceMenuView) {
            setViewMode(defaultView);
        } else if (!userInteracted && (settings?.menuView || settings?.mobileMenuView)) {
            setViewMode(defaultView);
        }
    }, [settings?.menuView, settings?.mobileMenuView, settings?.enforceMenuView, userInteracted]);

    // Manual override helper
    const handleViewToggle = (newMode) => {
        setViewMode(newMode);
        setUserInteracted(true);
        localStorage.setItem('foodViewMode', newMode);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [menuRes, catRes] = await Promise.all([
                    api.get('/api/menu'),
                    api.get('/api/categories'),
                ]);
                setMenuItems(menuRes.data);
                setAllCategories(catRes.data);

                // If adding items to an existing order, fetch the order to get the table and existing items
                if (isAddingItems && existingOrderId) {
                    try {
                        const orderRes = await api.get(`/api/orders/${existingOrderId}`);
                        const order = orderRes.data;
                        if (order) {
                            if (order.tableId) setSelectedTable(order.tableId);
                            setExistingItems(order.items || []);
                            setOriginalTotal(order.finalAmount || 0);
                        }
                    } catch (err) {
                        console.error('DineIn: Failed to fetch existing order', err);
                    }
                }
            } catch (err) {
                console.error('DineIn: fetch error', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isAddingItems, existingOrderId]);

    const addToCart = useCallback((item, variant = null) => {
        const cartKey = variant ? `${item._id}_${variant.name}` : item._id;
        const price = variant ? variant.price : item.price;
        setCart(prev => {
            const existing = prev.find(i => i.cartKey === cartKey);
            if (existing) return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: existing.quantity + 1 } : i);
            return [...prev, { ...item, cartKey, price, variant: variant || null, quantity: 1, notes: '' }];
        });
    }, []);

    const updateQuantity = useCallback((cartKey, delta) => {
        setCart(prev => {
            const existing = prev.find(i => i.cartKey === cartKey);
            if (!existing) return prev;
            const newQty = existing.quantity + delta;
            if (newQty <= 0) return prev.filter(i => i.cartKey !== cartKey);
            return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: newQty } : i);
        });
    }, []);

    const handleItemAdd = (item, variant = null) => {
        if (!variant && item.variants?.length > 0) return;
        addToCart(item, variant);
    };

    const clearCart = () => { if (window.confirm('Clear all items?')) setCart([]); };

    const categories = useMemo(() => {
        const seen = new Set();
        const result = [];
        [...allCategories, ...menuItems.map(i => i.category).filter(Boolean)].forEach(cat => {
            if (!seen.has(cat._id)) {
                seen.add(cat._id);
                result.push(cat);
            }
        });
        return result;
    }, [allCategories, menuItems]);

    const filteredItems = useMemo(() =>
        menuItems.filter(item =>
            (selectedCategory ? item.category?._id === selectedCategory : true) &&
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        ), [menuItems, selectedCategory, searchQuery]);

    const totalAmount = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
    const taxRate = settings?.taxRate || 5;
    const tax = totalAmount * (taxRate / 100);
    const finalAmount = totalAmount + tax;

    // ── Real-time menu/category sync ─────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const onMenuUpdated = ({ action, item, id }) => {
            if (action === 'create' && item) {
                if (item.availability) {
                    setMenuItems(prev => prev.find(i => i._id === item._id) ? prev : [...prev, item]);
                }
            } else if (action === 'update' && item) {
                setMenuItems(prev => {
                    const exists = prev.find(i => i._id === item._id);
                    if (!item.availability) return prev.filter(i => i._id !== item._id);
                    return exists ? prev.map(i => i._id === item._id ? item : i) : [...prev, item];
                });
                setCart(prev => prev.map(c =>
                    c._id === item._id ? { ...c, name: item.name, price: c.variant ? c.variant.price : item.price } : c
                ));
            } else if (action === 'delete' && id) {
                setMenuItems(prev => prev.filter(i => i._id !== id));
                setCart(prev => prev.filter(c => c._id !== id));
            }
        };

        const onCategoryUpdated = ({ action, category, id }) => {
            if (action === 'create' && category) {
                setAllCategories(prev => prev.find(c => c._id === category._id) ? prev : [...prev, category]);
            } else if (action === 'update' && category) {
                setAllCategories(prev => prev.map(c => c._id === category._id ? category : c));
            } else if (action === 'delete' && id) {
                setAllCategories(prev => prev.filter(c => c._id !== id));
            }
        };

        socket.on('menu-updated', onMenuUpdated);
        socket.on('category-updated', onCategoryUpdated);
        return () => {
            socket.off('menu-updated', onMenuUpdated);
            socket.off('category-updated', onCategoryUpdated);
        };
    }, [socket]);

    const handleSubmitOrder = async () => {
        if (!cart.length || isSubmitting) return;
        
        // When adding items, we use the table from the existing order (or fallback to state)
        const tableId = isAddingItems 
            ? (selectedTable?._id || selectedTable || null) 
            : (selectedTable?._id || selectedTable);

        // ONLY ALERT IF NEW ORDER AND TABLE MISSING
        if (!isAddingItems && !tableId) return alert('Select a table!');

        setIsSubmitting(true);
        const orderData = {
            orderType,
            tableId,
            items: cart.map(i => ({ menuItemId: i._id, name: i.name, price: i.price, quantity: i.quantity, notes: i.notes, variant: i.variant || null })),
            totalAmount, tax, finalAmount,
        };

        try {
            if (isAddingItems && existingOrderId) {
                // ADD TO EXISTING ORDER
                await api.post(`/api/orders/${existingOrderId}/add-items`, orderData, {
                    headers: { Authorization: `Bearer ${user.token}` },
                });
            } else {
                // CREATE NEW ORDER
                await api.post('/api/orders', orderData, {
                    headers: { Authorization: `Bearer ${user.token}` },
                });
            }
            navigate('/waiter', { replace: true });
        } catch (err) {
            console.error('Submit order failed:', err);
            alert('Order failed: ' + (err.response?.data?.message || 'Server Error'));
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[100dvh]">
            <div className="skeleton w-12 h-12 rounded-full" />
        </div>
    );

    return (
        <div className="h-[100dvh] flex flex-col relative overflow-hidden">

            {/* ── STEP 2: TABLE SELECTION ─────────────────────────────── */}
            {step === 2 && (
                <div className="flex-1 flex flex-col animate-fade-in">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div>
                            <h2 className="text-2xl font-black text-[var(--theme-text-main)]">Select a Table</h2>
                            <p className="text-[var(--theme-text-muted)] text-sm">Tap an available table to start the dine-in order</p>
                        </div>
                        <button
                            onClick={() => navigate('/waiter', { replace: true })}
                            className="p-3 bg-[var(--theme-bg-hover)] hover:bg-[var(--theme-border)] text-[var(--theme-text-muted)] rounded-xl transition-all"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>
                    <div className="flex-1 bg-[var(--theme-bg-card)] rounded-3xl p-6 border border-[var(--theme-border)] shadow-2xl overflow-y-auto custom-scrollbar">
                        <TableGrid
                            allowedStatuses={['available']}
                            onSelectTable={(table) => { setSelectedTable(table); setStep(3); }}
                        />
                    </div>
                </div>
            )}

            {/* ── STEP 3: MENU + CART ─────────────────────────────────── */}
            {step === 3 && (
                <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-5 animate-fade-in overflow-hidden">

                    {/* Menu Panel */}
                    <div className="flex-1 min-h-0 flex flex-col min-w-0 bg-[var(--theme-bg-card)] rounded-3xl border border-[var(--theme-border)] shadow-2xl overflow-hidden">

                        {/* ── Top Bar — High Density Mobile Optimized ── */}
                        <div className="px-3 md:px-5 py-3 md:py-4 border-b border-[var(--theme-border)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-shrink-0 bg-[var(--theme-bg-card)]/80 backdrop-blur-md">
                            <div className="flex items-center justify-between w-full md:w-auto overflow-hidden">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button onClick={() => isAddingItems ? navigate('/waiter', { replace: true }) : setStep(2)} className="p-2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] bg-[var(--theme-bg-hover)] rounded-xl border border-[var(--theme-border)]/50 shrink-0 shadow-sm active:scale-95 transition-all">
                                        <ArrowLeft size={16} />
                                    </button>
                                    <div className="min-w-0">
                                        <h2 className="text-sm md:text-lg font-black text-[var(--theme-text-main)] uppercase tracking-[0.05em] flex items-center gap-2 truncate">
                                            {isAddingItems ? `EDIT ORD-${existingOrderId.slice(-4).toUpperCase()}` : `Table ${selectedTable?.number}`}
                                            <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full font-semibold border ${isAddingItems ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
                                                {isAddingItems ? 'MENU' : 'Dine-In'}
                                            </span>
                                        </h2>
                                    </div>
                                </div>

                                {/* Actions for Mobile (Right of title) */}
                                <div className="flex md:hidden items-center gap-2 shrink-0">
                                    {!settings?.enforceMenuView && <ViewToggle viewMode={viewMode} setViewMode={handleViewToggle} />}
                                    <button
                                        onClick={() => setIsCartOpen(!isCartOpen)}
                                        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all border shadow-sm active:scale-95 ${isCartOpen ? 'bg-orange-500 text-white border-orange-600 shadow-md' : 'bg-[var(--theme-bg-dark)] text-[var(--theme-text-muted)] border-[var(--theme-border)]'}`}
                                    >
                                        <ShoppingCart size={18} />
                                        {cart.length > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-orange-600 text-white border-2 border-[var(--theme-bg-card)]">
                                                {cart.length}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto md:flex-1 md:justify-end">
                                <div className="relative flex-1 max-w-none md:max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Search menu..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] rounded-xl pl-9 pr-4 py-2 border border-[var(--theme-border)] focus:ring-1 focus:ring-gray-500 text-xs md:text-sm h-10 transition-all shadow-inner"
                                    />
                                </div>
                                <div className="hidden md:flex items-center gap-3">
                                    {!settings?.enforceMenuView && <ViewToggle viewMode={viewMode} setViewMode={handleViewToggle} />}
                                    <button
                                        onClick={() => setIsCartOpen(!isCartOpen)}
                                        className={`relative flex items-center gap-2 px-4 h-10 rounded-xl transition-all font-black text-sm border shadow-sm shrink-0 active:scale-95 ${isCartOpen ? 'bg-orange-500 text-white border-orange-600 shadow-md' : 'bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)] border-[var(--theme-border)]'}`}
                                    >
                                        <ShoppingCart size={18} />
                                        <span>Cart</span>
                                        {cart.length > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-orange-600 text-white border-2 border-[var(--theme-bg-card)]">
                                                {cart.length}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
                            {/* Categories Selection: Horizontal on Mobile, Vertical Rail on Desktop */}
                            <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto custom-scrollbar bg-black/5 border-b md:border-b-0 md:border-r border-[var(--theme-border)] flex-shrink-0 w-full md:w-24 xl:w-28">
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className={`flex flex-shrink-0 flex-row md:flex-col items-center justify-center py-2 md:py-4 px-4 md:px-1 gap-1.5 transition-all border-b-2 md:border-b-0 md:border-l-4
                                        ${selectedCategory === null
                                            ? 'bg-gray-200 text-gray-900 border-gray-800 shadow-inner'
                                            : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] border-transparent'}`}
                                >
                                    <Utensils size={18} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">All</span>
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat._id}
                                        onClick={() => setSelectedCategory(cat._id)}
                                        className="flex flex-shrink-0 flex-row md:flex-col items-center justify-center py-2 md:py-4 px-4 md:px-1 gap-1.5 transition-all border-b-2 md:border-b-0 md:border-l-4"
                                        style={{
                                            backgroundColor: selectedCategory === cat._id ? `${cat.color || '#1f2937'}15` : 'transparent',
                                            borderColor: selectedCategory === cat._id ? (cat.color || '#1f2937') : 'transparent',
                                            color: selectedCategory === cat._id ? (cat.color || '#1f2937') : 'var(--theme-text-muted)'
                                        }}
                                    >
                                        <div
                                            className="w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center text-[11px] md:text-[12px] font-black transition-colors flex-shrink-0"
                                            style={{
                                                backgroundColor: selectedCategory === cat._id ? (cat.color || '#1f2937') : 'var(--theme-bg-hover)',
                                                color: selectedCategory === cat._id ? 'white' : 'var(--theme-text-muted)'
                                            }}
                                        >
                                            {cat.name.charAt(0)}
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-tight text-center leading-tight whitespace-nowrap md:whitespace-normal line-clamp-1 md:line-clamp-2">{cat.name}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Items Grid */}
                            <div className={`flex-1 overflow-y-auto p-2 md:p-3 xl:p-4 custom-scrollbar`}>
                                {filteredItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                                        <SearchX size={48} className="mb-4 opacity-10" />
                                        <p className="font-medium text-lg">No items found</p>
                                    </div>
                                ) : (
                                    <div className={`grid gap-2 sm:gap-4 ${viewMode === 'grid'
                                        ? 'grid-cols-2 md:[grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]'
                                        : viewMode === 'compact'
                                            ? 'grid-cols-3 md:[grid-template-columns:repeat(auto-fill,minmax(110px,1fr))]'
                                            : 'grid-cols-1'
                                    }`}>
                                        {filteredItems.map(item => (
                                            <FoodItem
                                                key={item._id}
                                                item={item}
                                                viewMode={viewMode}
                                                formatPrice={formatPrice}
                                                onAdd={handleItemAdd}
                                                onRemove={(key) => updateQuantity(key, -1)}
                                                cartQty={cart.filter(i => i._id === item._id).reduce((s, i) => s + i.quantity, 0)}
                                                itemCart={cart.filter(i => i._id === item._id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cart Panel */}
                    <aside className={`
                        fixed inset-0 z-[100] md:relative md:inset-auto md:z-0 flex-shrink-0
                        transition-all duration-300 ease-in-out overflow-hidden
                        ${isCartOpen 
                            ? 'translate-x-0 w-full md:w-[300px] xl:w-[360px]' 
                            : 'translate-x-full md:translate-x-0 w-full md:w-0'
                        }
                    `}>
                        {isCartOpen && <div onClick={() => setIsCartOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm md:hidden" />}


                        <div className="relative h-full w-full max-w-[400px] ml-auto md:ml-0 bg-[var(--theme-bg-card)] rounded-t-3xl md:rounded-3xl border-l md:border border-[var(--theme-border)] shadow-2xl flex flex-col overflow-hidden pb-[64px] md:pb-0">
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-[var(--theme-border)] flex items-center justify-between flex-shrink-0">
                                <div>
                                    <h2 className="text-lg font-black text-[var(--theme-text-main)] flex items-center gap-2">
                                        <ShoppingCart size={18} className="text-orange-500" /> Current Cart
                                    </h2>
                                    <p className="text-[10px] text-[var(--theme-text-muted)] uppercase tracking-widest font-bold mt-0.5">
                                        {isAddingItems ? 'Adding to Existing' : 'Dine-In'} • {cart.length} items
                                    </p>
                                </div>
                                <button onClick={clearCart} className="p-2 text-[var(--theme-text-muted)] hover:text-rose-400 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Scrollable items */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar min-h-0">
                                {isAddingItems && existingItems.length > 0 && (
                                    <div className="space-y-2 opacity-60">
                                        {existingItems.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-tight py-1 border-b border-[var(--theme-border)]/30">
                                                <div className="flex items-center gap-2">
                                                    <span>{item.quantity}x</span>
                                                    <span className="truncate max-w-[120px]">{item.name}</span>
                                                </div>
                                                <span>{formatPrice(item.price * item.quantity)}</span>
                                            </div>
                                        ))}
                                        <div className="py-2 text-center">
                                            <span className="bg-orange-500/10 text-orange-600 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-orange-500/20">
                                                NEW ITEMS TO ADD
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {cart.length === 0 && (!isAddingItems || existingItems.length === 0) ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-700 py-10">
                                        <ShoppingCart size={64} className="mb-4 opacity-5" strokeWidth={1} />
                                        <p className="font-bold">Your cart is empty</p>
                                        <p className="text-xs">Add items from the menu to build your order</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.cartKey} className="flex items-center gap-3 animate-slide-up hover:bg-orange-500/5 p-1 -m-1 rounded-xl transition-colors group">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--theme-bg-dark)] flex-shrink-0 overflow-hidden border border-[var(--theme-border)] shadow-sm">
                                                {item.image 
                                                    ? <img src={item.image} className="w-full h-full object-cover" alt={item.name} /> 
                                                    : <div className="w-full h-full flex items-center justify-center text-lg bg-[var(--theme-bg-hover)]">🥘</div>}
                                            </div>
                                            <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
                                                <div className="min-w-0 flex-1 pr-1">
                                                    <h4 className="text-[12px] font-black text-[var(--theme-text-main)] truncate leading-tight uppercase tracking-tighter">{item.name}</h4>
                                                    {item.variant && <p className="text-[8px] font-black text-orange-500 uppercase leading-none mt-0.5">{item.variant.name}</p>}
                                                </div>
                                                
                                                <div className="flex items-center shrink-0">
                                                    <div className="flex items-center bg-[var(--theme-bg-dark)] rounded-full p-0.5 border border-[var(--theme-border)] shadow-inner">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); updateQuantity(item.cartKey, -1); }} 
                                                            className="w-6 h-6 flex items-center justify-center text-[var(--theme-text-muted)] hover:text-orange-500 transition-all active:scale-75"
                                                        >
                                                            <Minus size={11} strokeWidth={3} />
                                                        </button>
                                                        <span className="w-5 text-center text-[10px] font-black text-[var(--theme-text-main)] tabular-nums">{item.quantity}</span>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); updateQuantity(item.cartKey, 1); }} 
                                                            className="w-6 h-6 flex items-center justify-center text-[var(--theme-text-muted)] hover:text-orange-500 transition-all active:scale-75"
                                                        >
                                                            <Plus size={11} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <span className="text-[12px] font-black text-orange-500 min-w-[50px] text-right tabular-nums tracking-tighter shrink-0">{formatPrice(item.price * item.quantity)}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Sticky footer — always visible */}
                            <div className="flex-shrink-0 p-4 bg-[var(--theme-bg-dark)] border-t border-[var(--theme-border)] space-y-3">
                                <div className="space-y-1.5">
                                    {isAddingItems ? (
                                        <>
                                            <div className="flex justify-between text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider italic">
                                                <span>Previous Balance</span>
                                                <span>{formatPrice(originalTotal)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-bold text-[var(--theme-text-main)] uppercase tracking-wide">
                                                <span>New Items Subtotal</span>
                                                <span>{formatPrice(totalAmount)}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold text-[var(--theme-text-muted)]">
                                                <span>Tax ({taxRate}%)</span>
                                                <span>{formatPrice(tax)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t-2 border-dashed border-[var(--theme-border)]">
                                                <div>
                                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] block leading-none">NEW COMBINED TOTAL</span>
                                                    <span className="text-[10px] font-bold text-[var(--theme-text-muted)] italic">Adding {formatPrice(totalAmount + tax)}</span>
                                                </div>
                                                <span className="text-2xl font-black text-orange-500 tabular-nums">
                                                    {formatPrice(originalTotal + totalAmount + tax)}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between text-xs text-[var(--theme-text-muted)]"><span>Subtotal</span><span>{formatPrice(totalAmount)}</span></div>
                                            <div className="flex justify-between text-xs text-[var(--theme-text-muted)]"><span>Tax ({taxRate}%)</span><span>{formatPrice(tax)}</span></div>
                                            <div className="flex justify-between items-center pt-1.5 border-t border-[var(--theme-border)]">
                                                <span className="text-xs font-bold text-[var(--theme-text-main)] uppercase tracking-wider">Total</span>
                                                <span className="text-xl font-black text-orange-500">{formatPrice(finalAmount)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={handleSubmitOrder}
                                    disabled={cart.length === 0}
                                    className={`w-full py-3.5 text-white font-black rounded-2xl shadow-glow-orange transition-all active:scale-95 flex items-center justify-center gap-2 text-sm ${isAddingItems ? 'bg-orange-600 hover:bg-orange-500 shadow-[0_10px_30px_rgba(249,115,22,0.3)]' : 'bg-orange-600 hover:bg-orange-500'} disabled:bg-gray-700 disabled:text-gray-500`}
                                >
                                    {isAddingItems ? `Add to Order ORD-${existingOrderId.slice(-4).toUpperCase()}` : 'Confirm & Place Order'} <ArrowRight size={16} />
                                </button>
                                <button className="md:hidden w-full py-2 text-[var(--theme-text-muted)] font-bold text-xs uppercase tracking-widest" onClick={() => setIsCartOpen(false)}>
                                    Continue Adding Items
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            {/* ── Mobile Cart Trigger (Sticky Bottom) ──────────────────── */}
            {step === 3 && cart.length > 0 && !isCartOpen && (
                <div className="md:hidden fixed bottom-6 left-4 right-4 z-40 bg-orange-600 rounded-3xl shadow-[0_15px_40px_rgba(249,115,22,0.4)] p-4 flex items-center justify-between animate-slide-up border border-orange-500/30 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                            <ShoppingCart size={24} className="text-white" />
                            <span className="absolute -top-2 -right-2 w-6 h-6 bg-white text-orange-600 rounded-full flex items-center justify-center text-xs font-black shadow-lg border-2 border-orange-600">
                                {cart.length}
                            </span>
                        </div>
                        <div className="text-white">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none opacity-80 mb-1">Check Order</p>
                            <p className="text-xl font-black leading-tight tabular-nums">{formatPrice(finalAmount)}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="bg-white text-orange-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center gap-2"
                    >
                        Review <ChevronRight size={16} strokeWidth={3} />
                    </button>
                </div>
            )}
        </div>
    );
};


export default DineIn;
