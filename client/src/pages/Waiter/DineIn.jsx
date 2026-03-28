import { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
    const { user, formatPrice, settings } = useContext(AuthContext);
    const navigate = useNavigate();

    const [step, setStep] = useState(2); // 2 = table selection, 3 = menu
    const orderType = 'dine-in';
    const [selectedTable, setSelectedTable] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [userInteracted, setUserInteracted] = useState(false);
    const [viewMode, setViewMode] = useState(() => settings?.menuView || 'grid');

    // Sync with global settings
    useEffect(() => {
        if (settings?.enforceMenuView) {
            setViewMode(settings.menuView || 'grid');
        } else if (!userInteracted && settings?.menuView) {
            setViewMode(settings.menuView);
        }
    }, [settings?.menuView, settings?.enforceMenuView, userInteracted]);

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
                setCategories(catRes.data);
            } catch (err) {
                console.error('DineIn: fetch error', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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

    const filteredItems = useMemo(() =>
        menuItems.filter(item =>
            (selectedCategory ? item.category?._id === selectedCategory : true) &&
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        ), [menuItems, selectedCategory, searchQuery]);

    const totalAmount = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
    const taxRate = settings?.taxRate || 5;
    const tax = totalAmount * (taxRate / 100);
    const finalAmount = totalAmount + tax;

    const handleSubmitOrder = async () => {
        if (!cart.length) return alert('Cart is empty!');
        if (!selectedTable) return alert('Select a table!');

        const orderData = {
            orderType,
            tableId: selectedTable._id,
            items: cart.map(i => ({ menuItemId: i._id, name: i.name, price: i.price, quantity: i.quantity, notes: i.notes, variant: i.variant || null })),
            totalAmount, tax, finalAmount,
        };

        try {
            await api.post('/api/orders', orderData, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            navigate('/waiter', { replace: true });
        } catch (err) {
            alert('Order failed: ' + (err.response?.data?.message || 'Server Error'));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[100dvh]">
            <div className="skeleton w-12 h-12 rounded-full" />
        </div>
    );

    return (
        <div className="h-full flex flex-col relative overflow-hidden">

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
                <div className="flex flex-col md:flex-row h-full gap-5 animate-fade-in overflow-hidden">

                    {/* Menu Panel */}
                    <div className="flex-1 flex flex-col min-w-0 bg-[var(--theme-bg-card)] rounded-3xl border border-[var(--theme-border)] shadow-2xl overflow-hidden">

                        {/* Top Bar */}
                        <div className="px-5 py-4 border-b border-[var(--theme-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setStep(2)} className="p-2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] bg-[var(--theme-bg-hover)] rounded-lg">
                                    <ArrowLeft size={18} />
                                </button>
                                <div>
                                    <h2 className="text-lg font-bold text-[var(--theme-text-main)] flex items-center gap-2 truncate">
                                        Table {selectedTable?.number}
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/20">
                                            Dine-In
                                        </span>
                                    </h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-1 max-w-xl">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search items..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-[var(--theme-bg-dark)] text-[var(--theme-text-main)] rounded-xl pl-10 pr-4 py-2 border-none focus:ring-2 focus:ring-orange-500 text-sm"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                            <SearchX size={14} />
                                        </button>
                                    )}
                                </div>
                                {!settings?.enforceMenuView && <ViewToggle viewMode={viewMode} setViewMode={handleViewToggle} />}
                                <button
                                    onClick={() => setIsCartOpen(!isCartOpen)}
                                    className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-bold text-sm border
                                        ${isCartOpen ? 'bg-[var(--theme-bg-dark)] text-[var(--theme-text-muted)] border-[var(--theme-border)] hover:bg-[var(--theme-bg-hover)]' : 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500 hover:text-white'}
                                    `}
                                >
                                    <ShoppingCart size={16} />
                                    {isCartOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Categories Rail */}
                            <div className="w-14 xs:w-16 md:w-20 lg:w-16 xl:w-24 flex-shrink-0 border-r border-[var(--theme-border)] flex flex-col overflow-y-auto custom-scrollbar bg-black/5">
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className={`flex flex-col items-center justify-center py-3 px-1 gap-1.5 transition-all border-l-4
                                        ${selectedCategory === null
                                            ? 'bg-orange-500/10 text-orange-400 border-orange-500'
                                            : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] border-transparent'}`}
                                >
                                    <Utensils size={18} />
                                    <span className="text-[9px] font-bold uppercase tracking-tight text-center">All</span>
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat._id}
                                        onClick={() => setSelectedCategory(cat._id)}
                                        className="flex flex-col items-center justify-center py-3 px-1 gap-1.5 transition-all border-l-4"
                                        style={{
                                            backgroundColor: selectedCategory === cat._id ? `${cat.color || '#f97316'}15` : 'transparent',
                                            borderColor: selectedCategory === cat._id ? (cat.color || '#f97316') : 'transparent',
                                            color: selectedCategory === cat._id ? (cat.color || '#f97316') : 'var(--theme-text-muted)'
                                        }}
                                    >
                                        <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0"
                                            style={{
                                                backgroundColor: selectedCategory === cat._id ? (cat.color || '#f97316') : 'var(--theme-bg-hover)',
                                                color: selectedCategory === cat._id ? 'white' : 'var(--theme-text-muted)'
                                            }}
                                        >
                                            {cat.name.charAt(0)}
                                        </div>
                                        <span className="text-[8px] xl:text-[9px] font-bold uppercase tracking-tight text-center leading-tight line-clamp-2 max-w-full">{cat.name}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Items Grid */}
                            <div className={`flex-1 overflow-y-auto p-2 md:p-3 xl:p-4 custom-scrollbar ${cart.length > 0 ? 'pb-28 lg:pb-4' : ''}`}>
                                {filteredItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                                        <SearchX size={48} className="mb-4 opacity-10" />
                                        <p className="font-medium text-lg">No items found</p>
                                    </div>
                                ) : (
                                    <div className={`grid gap-2 xs:gap-3 ${viewMode === 'grid'
                                        ? 'grid-cols-2 xs:grid-cols-3'
                                        : viewMode === 'compact'
                                            ? 'grid-cols-3 xs:grid-cols-4 lg:grid-cols-6'
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
                        fixed inset-0 z-40 md:relative md:inset-auto md:z-0 flex-shrink-0
                        transition-all duration-300 ease-in-out overflow-hidden
                        ${isCartOpen 
                            ? 'translate-x-0 w-full md:w-[300px] xl:w-[360px]' 
                            : 'translate-x-full md:translate-x-0 w-full md:w-0'
                        }
                    `}>
                        {isCartOpen && <div onClick={() => setIsCartOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm md:hidden" />}


                        <div className="relative h-fit max-h-full w-full max-w-[400px] ml-auto md:ml-0 bg-[var(--theme-bg-card)] rounded-none md:rounded-3xl border-l md:border border-[var(--theme-border)] shadow-2xl flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-[var(--theme-border)] flex items-center justify-between flex-shrink-0">
                                <div>
                                    <h2 className="text-lg font-black text-[var(--theme-text-main)] flex items-center gap-2">
                                        <ShoppingCart size={18} className="text-orange-500" /> Current Cart
                                    </h2>
                                    <p className="text-[10px] text-[var(--theme-text-muted)] uppercase tracking-widest font-bold mt-0.5">
                                        Dine-In • {cart.length} items
                                    </p>
                                </div>
                                <button onClick={clearCart} className="p-2 text-[var(--theme-text-muted)] hover:text-rose-400 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Scrollable items */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar min-h-0">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-700 py-10">
                                        <ShoppingCart size={64} className="mb-4 opacity-5" strokeWidth={1} />
                                        <p className="font-bold">Your cart is empty</p>
                                        <p className="text-xs">Add items from the menu to build your order</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.cartKey} className="flex gap-3 animate-slide-up">
                                            <div className="w-12 h-12 rounded-xl bg-[var(--theme-bg-dark)] flex-shrink-0 overflow-hidden">
                                                {item.image
                                                    ? <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                                                    : <div className="w-full h-full flex items-center justify-center text-xl">🥘</div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="pr-2">
                                                        <h4 className="text-sm font-bold text-[var(--theme-text-main)]">{item.name}</h4>
                                                        {item.variant && <span className="text-xs text-[var(--theme-text-muted)]">({item.variant.name})</span>}
                                                    </div>
                                                    <span className="text-sm font-black text-[var(--theme-text-main)]">{formatPrice(item.price * item.quantity)}</span>
                                                </div>
                                                <div className="flex items-center bg-[var(--theme-bg-dark)] rounded-lg p-0.5 border border-[var(--theme-border)] w-fit">
                                                    <button onClick={() => updateQuantity(item.cartKey, -1)} className="w-7 h-7 flex items-center justify-center text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]"><Minus size={12} /></button>
                                                    <span className="w-8 text-center text-xs font-black text-[var(--theme-text-main)]">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.cartKey, 1)} className="w-7 h-7 flex items-center justify-center text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]"><Plus size={12} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Sticky footer — always visible */}
                            <div className="flex-shrink-0 p-4 bg-[var(--theme-bg-dark)] border-t border-[var(--theme-border)] space-y-3">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs text-[var(--theme-text-muted)]"><span>Subtotal</span><span>{formatPrice(totalAmount)}</span></div>
                                    <div className="flex justify-between text-xs text-[var(--theme-text-muted)]"><span>Tax ({taxRate}%)</span><span>{formatPrice(tax)}</span></div>
                                    <div className="flex justify-between items-center pt-1.5 border-t border-[var(--theme-border)]">
                                        <span className="text-xs font-bold text-[var(--theme-text-main)] uppercase tracking-wider">Total</span>
                                        <span className="text-xl font-black text-orange-500">{formatPrice(finalAmount)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSubmitOrder}
                                    disabled={cart.length === 0}
                                    className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-black rounded-2xl shadow-glow-orange transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                                >
                                    Confirm & Place Order <ArrowRight size={16} />
                                </button>
                                <button className="md:hidden w-full py-2 text-[var(--theme-text-muted)] font-bold text-xs uppercase tracking-widest" onClick={() => setIsCartOpen(false)}>
                                    Continue Adding Items
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            {/* Mobile Cart Trigger */}
            {step === 3 && cart.length > 0 && !isCartOpen && (
                <div className="md:hidden fixed bottom-20 left-4 right-4 z-40 bg-orange-600 rounded-2xl shadow-2xl p-4 flex items-center justify-between animate-slide-up">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <ShoppingCart size={24} className="text-white" />
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-orange-600 rounded-full flex items-center justify-center text-xs font-black">{cart.length}</span>
                        </div>
                        <div className="text-white">
                            <p className="text-[10px] font-bold uppercase tracking-widest leading-none">Checkout</p>
                            <p className="text-lg font-black leading-tight">{formatPrice(finalAmount)}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="bg-white text-orange-600 px-5 py-2.5 rounded-xl font-black text-sm active:scale-95 flex items-center gap-2"
                    >
                        View Order <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default DineIn;
